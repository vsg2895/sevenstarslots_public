import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSpecialOffer, getBonusCategory } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript, SHARE_IMAGES } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'
import BonusTerms from '@/components/BonusTerms'
import SpecialOfferCard, { CLAIMABLE_BONUS_CATEGORY, OFFER_GRID } from '@/components/SpecialOfferCard'
import OfferVisitTracker from '@/components/OfferVisitTracker'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

/**
 * What the banner is drawn at: the page's 94rem column (1440px of artwork)
 * from 1504px up, the viewport minus the 16 / 24 / 32px gutters below it — the
 * same frame winpalack uses.
 */
const BANNER_SIZES =
  '(min-width: 1504px) 1440px, (min-width: 1024px) calc(100vw - 4rem), (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)'

type Props = { params: Promise<{ slug: string }> }

/*
 * NO generateStaticParams, deliberately — this route renders on demand.
 *
 * Next classifies a dynamic route from what that function RETURNS: a non-empty
 * list builds `f` (dynamic), an EMPTY list builds a fully static route. A
 * static render then throws DYNAMIC_SERVER_USAGE, because the root layout
 * reads the session cookie for the header's account control and a static
 * render may not touch cookies — taking the whole route down with a 500 for
 * every slug, valid or not.
 *
 * Not hypothetical: that is exactly how /special-offers/[slug] broke on the
 * one site with no visible offers. It was reachable here too, because the
 * params lookup failed CLOSED to an empty list, so one API blip was enough to
 * change the build shape.
 *
 * Removing the function pins the route dynamic whatever the data does.
 * `force-dynamic` is deliberately NOT used: it would also downgrade fetchCache
 * to no-store and send every request to the API, where this leaves the
 * existing per-fetch cache and its tags exactly as they were.
 */

/**
 * The offer's own prose, as plain text — the field an editor actually writes.
 *
 * Measured on the live data before this existed: 18 of 29 offers carry no
 * `bonuses` value, and `bonuses` is a column on the GLOBAL `special_offers`
 * row — identical across every domain in the network, with only 8 distinct
 * values across 29 offers. Composed from it, every thin offer's meta
 * description came out as its title plus one sentence repeated on every sibling
 * page. `description` is the only one of the three that is unique per offer.
 */
function plainDescription(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Trimmed at a word boundary to the ~155 characters Google renders. */
function metaLength(text: string): string {
  return text.length <= 155 ? text : `${text.slice(0, 155).replace(/\s+\S*$/, '')}…`
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data: offer } = await getSpecialOffer(slug)
    // This site's meta title / description, when the admin or the SEO seeder
    // set one (the API already resolves the site's own override over the
    // offer's default); otherwise the composed fallbacks below.
    const title = offer.meta_title?.trim() || offer.title
    /*
     * The written description first; the `bonuses` composition only as a
     * fallback for an offer nobody has written up yet — a content gap this file
     * cannot close, not something to paper over with longer boilerplate.
     */
    const prose = plainDescription(offer.description)
    const metaDescription = offer.meta_description?.trim() ?? ''
    const description = metaDescription !== ''
      ? metaLength(metaDescription)
      : prose !== ''
        ? metaLength(prose)
        : offer.bonuses
          ? `${offer.bonuses} — ${COPY.specialOffers.offerMetaSuffix}`
          : `${offer.title} — ${COPY.specialOffers.offerMetaSuffix}`
    return {
      title,
      description,
      alternates: { canonical: `/special-offers/${slug}` },
      openGraph: { type: 'article', url: `/special-offers/${slug}`, siteName: SITE_NAME, title, description, images: SHARE_IMAGES },
      // A hidden offer stays reachable by direct link so it can be reviewed,
      // but it must never enter the index. It is already absent from every
      // listing and from the sitemap; this stops a crawler that finds the URL
      // some other way (a shared link, a referrer) from indexing it.
      /*
       * TWO distinct gates.
       *
       * `!active` is the hard one: the offer is withdrawn, the page exists only
       * so an old link does not 404, and `follow: false` keeps it from passing
       * anything onward.
       *
       * `is_indexable` is the editorial one (SpecialOffer::isIndexable): true
       * unless an admin set noindex on this offer. Every other offer page is
       * indexed. `follow` stays true on a noindexed one: its casino and
       * category links are still worth following.
       *
       * The same flag filters the sitemap, so the two can never disagree.
       */
      ...(!offer.active
        ? { robots: { index: false, follow: false } }
        : offer.is_indexable === false
          ? { robots: { index: false, follow: true } }
          : {}),
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}

export default async function SpecialOfferDetailPage({ params }: Props) {
  const { slug } = await params

  let offer
  try {
    offer = (await getSpecialOffer(slug)).data
  } catch {
    notFound()
  }

  const banner = resolveImageUrl(offer.banner_image ?? offer.image_path)
  // The same rule the cards use: Claim is a property of the bonus TYPE.
  const claimable = offer.bonus_category_slug === CLAIMABLE_BONUS_CATEGORY
  const pageUrl = `${SITE_URL}/special-offers/${slug}`
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Special Offers', url: `${SITE_URL}/special-offers` },
      { name: offer.title, url: pageUrl },
    ],
    pageUrl,
  )
  /*
   * `Offer`, and deliberately NOT `SpecialAnnouncement`.
   *
   * SpecialAnnouncement is scoped to public-health and emergency notices;
   * applying it to a casino bonus is schema misuse that risks a manual action
   * rather than a rich result. `Offer` is the type that describes a promotion.
   *
   * ONLY FIELDS WE ACTUALLY HOLD. No `price`, no `priceCurrency`, no
   * `availabilityEnds` — this API exposes none of them, and an Offer carrying an
   * invented figure is worse than no Offer at all. `bonuses` gets no property of
   * its own either: it reads like "100% up to €500", and the Offer properties
   * that take a figure expect a number or a PriceSpecification, not a sentence.
   */
  const offerProse = plainDescription(offer.description)
  const offerSchema = {
    '@context': 'https://schema.org',
    '@type': 'Offer',
    name: offer.title,
    url: pageUrl,
    ...(offerProse !== ''
      ? { description: offerProse }
      : offer.bonuses
        ? { description: offer.bonuses }
        : {}),
    ...(offer.casino?.name
      ? { offeredBy: { '@type': 'Organization', name: offer.casino.name } }
      : {}),
    ...(offer.bonus_category_name ? { category: offer.bonus_category_name } : {}),
  }

  const graph = [
    buildWebPageSchema({
      name: offer.title,
      url: pageUrl,
      // The prose, not the shared `bonuses` line that is identical network-wide.
      description: offerProse !== '' ? offerProse : (offer.bonuses ?? undefined),
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: offer.updated_at,
    }),
    breadcrumb,
    offerSchema,
  ]

  // Claim, as everywhere on this site: the Special Offers type, with a link, and
  // never on an expired offer.
  const showClaim = !offer.terms?.expired && claimable && !!offer.affiliate_url
  const kicker = [offer.bonus_category_name, offer.casino?.name].filter(Boolean).join(' · ')

  // "More <type>": other offers of the same bonus type, from the same cached
  // endpoint /bonuses/<slug> renders. A failure only drops the section.
  const moreOffers = offer.bonus_category_slug
    ? ((await getBonusCategory(offer.bonus_category_slug))?.offers ?? []).filter((o) => o.id !== offer.id).slice(0, 3)
    : []

  return (
    <>
      {/* Records this visit, but only if the visitor accepted in the
          cookie banner. Renders nothing and never blocks the page. */}
      <OfferVisitTracker specialOfferId={offer.id} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="pb-4">
        <div className="mx-auto max-w-[94rem] px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 pt-[22px] text-[13px] text-muted">
            <Link href="/" className="-mx-1 -my-3 inline-block px-1 py-3 transition-colors hover:text-brand">Home</Link>/
            <Link href="/special-offers" className="-mx-1 -my-3 inline-block px-1 py-3 transition-colors hover:text-brand">{COPY.nav.specialOffers}</Link>/
            <span className="font-semibold text-ink">{offer.title}</span>
          </nav>

          {/* The banner as on winpalack: the artwork whole in a 16:6 frame,
              straight under the breadcrumb. Nothing at all without artwork. */}
          {banner && (
            <div className="relative mt-5 aspect-[16/6] overflow-hidden rounded-3xl">
              <Image src={banner} alt={offer.title} fill className="object-contain object-center" sizes={BANNER_SIZES} preload fetchPriority="high" />
            </div>
          )}

          {/* The offer's card — the mockup's `.side`: type and casino, the
              title, the rating and who offers it, the amount, then Claim (or
              the expired notice) and the way to the casino's review. */}
          <header className="mt-5 grid gap-6 rounded-3xl border border-line bg-paper p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center lg:gap-10">
            <div className="flex min-w-0 flex-col gap-3">
              {kicker && <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">{kicker}</p>}
              <h1 className="font-display text-[clamp(22px,7vw,26px)] font-extrabold leading-[1.1] text-ink [overflow-wrap:anywhere] sm:text-[clamp(26px,3vw,36px)]">
                {offer.title}
              </h1>
              <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-ink-soft">
                <span className="text-[16px] tracking-[2px] text-gold" role="img" aria-label={`${offer.rating} out of 5`}>
                  {'★'.repeat(offer.rating)}
                  <span className="text-line-soft" aria-hidden>{'★'.repeat(5 - offer.rating)}</span>
                </span>
                {offer.rating.toFixed(1)}
                {offer.casino && (
                  <>
                    {' · Offer by '}
                    <Link href={`/casinos/${offer.casino.slug}`} className="-my-3 inline-block py-3 text-brand underline-offset-2 hover:underline">
                      {offer.casino.name}
                    </Link>
                  </>
                )}
              </p>
              {offer.bonuses && (
                <p className="font-display text-[22px] font-bold leading-[1.2] text-brand-dark">{offer.bonuses}</p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {/* An EXPIRED offer keeps its page — the URL stays valid and the
                  terms stay readable — but it is never presented as claimable:
                  the CTA becomes a plain statement, so a visitor who followed an
                  old link understands why there is nothing to press. */}
              {offer.terms?.expired ? (
                <p className="rounded-xl border border-line bg-surface px-5 py-4 text-sm font-semibold text-ink-soft">
                  This offer ended
                  {offer.terms.expires_at ? (
                    <> on <time dateTime={offer.terms.expires_at}>{offer.terms.expires_at}</time></>
                  ) : null}
                  . It is no longer available to claim.{' '}
                  <Link href="/special-offers" className="underline underline-offset-2 hover:text-brand">
                    See current offers
                  </Link>
                </p>
              ) : (
                showClaim && (
                  <a
                    href={offer.affiliate_url!}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="btn-g min-h-12 px-6 text-[15px]"
                  >
                    {COPY.specialOffers.claim}
                  </a>
                )
              )}
              {offer.casino && (
                <Link href={`/casinos/${offer.casino.slug}`} className="btn-o min-h-12 px-6 text-[15px]">
                  Read the full review <span aria-hidden>→</span>
                </Link>
              )}
              <p className="text-xs text-muted">
                18+. T&amp;Cs apply — read the full conditions on the operator&apos;s own site before
                depositing.{' '}
                <Link href="/responsible-gambling" className="underline underline-offset-2 hover:text-brand">
                  Play responsibly
                </Link>
                .
              </p>
            </div>
          </header>

          {offer.terms && <BonusTerms terms={offer.terms} />}

          {(offer.description || showClaim) && (
            <div className="mt-11 grid grid-cols-1 gap-9 lg:grid-cols-2">
              {offer.description && (
                <section className="min-w-0" aria-labelledby="about-offer">
                  <h2 id="about-offer" className="mb-4 font-display text-[26px] font-extrabold leading-tight text-ink sm:text-[clamp(26px,3vw,36px)]">
                    About this offer
                  </h2>
                  <div
                    className="prose max-w-none prose-p:text-[17px] prose-p:leading-[1.8]"
                    dangerouslySetInnerHTML={{ __html: offer.description }}
                  />
                </section>
              )}
              {/* How to claim — only where there IS something to claim. */}
              {showClaim && (
                <section aria-labelledby="how-to-claim">
                  <h2 id="how-to-claim" className="mb-4 font-display text-[26px] font-extrabold leading-tight text-ink sm:text-[clamp(26px,3vw,36px)]">
                    How to claim
                  </h2>
                  <ol className="flex flex-col gap-2.5" role="list">
                    {[
                      `Open ${offer.casino?.name ?? 'the casino'} with the button on this page.`,
                      'Finish registration and verify your account.',
                      'Read the operator’s terms, then opt in where the offer asks you to.',
                    ].map((step, i) => (
                      <li key={step} className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3.5 rounded-[14px] border border-line bg-paper px-4 py-3.5 text-ink-soft">
                        <b aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint font-display font-extrabold text-brand">
                          {i + 1}
                        </b>
                        {step}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          )}

          {moreOffers.length > 0 && offer.bonus_category_slug && (
            <section className="mt-14" aria-labelledby="more-offers">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="more-offers" className="font-display text-[26px] font-extrabold leading-tight text-ink sm:text-[clamp(26px,3vw,36px)]">
                  More {offer.bonus_category_name ?? 'offers'}
                </h2>
                <Link href={`/bonuses/${offer.bonus_category_slug}`} className="-my-3 inline-flex min-h-11 items-center py-3 font-bold text-brand transition-colors hover:text-brand-dark">
                  View all <span aria-hidden className="ml-1">→</span>
                </Link>
              </div>
              <div className={`mt-5 ${OFFER_GRID}`}>
                {moreOffers.map((o) => <SpecialOfferCard key={o.id} offer={o} />)}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
