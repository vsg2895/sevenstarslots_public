import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSpecialOffer } from '@/lib/api'
import { buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'
import BonusTerms from '@/components/BonusTerms'
import { CLAIMABLE_BONUS_CATEGORY } from '@/components/SpecialOfferCard'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

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
    const title = offer.title
    /*
     * The written description first; the `bonuses` composition only as a
     * fallback for an offer nobody has written up yet — a content gap this file
     * cannot close, not something to paper over with longer boilerplate.
     */
    const prose = plainDescription(offer.description)
    const description = prose !== ''
      ? metaLength(prose)
      : offer.bonuses
        ? `${offer.bonuses} — ${COPY.specialOffers.offerMetaSuffix}`
        : `${offer.title} — ${COPY.specialOffers.offerMetaSuffix}`
    return {
      title,
      description,
      alternates: { canonical: `/special-offers/${slug}` },
      openGraph: { type: 'article', url: `/special-offers/${slug}`, siteName: SITE_NAME, title, description },
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
       * `is_indexable` is the editorial one, computed on the server from this
       * offer alone (SpecialOffer::isIndexable): at least ~80 words of
       * description OR filled bonus terms, and no explicit admin noindex. It
       * exists because the median offer description was 33 words and Search
       * Console reported such pages as "Crawled — currently not indexed" —
       * Google's verdict was right, and asking it again on every crawl spends
       * budget the finished offers need. `follow` stays true: the casino and
       * category links on a thin page are still worth following.
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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="px-5 pb-16">
        <div className="mx-auto max-w-[90rem]">
          <nav className="pb-[22px] pt-7 text-[14.5px] text-muted" aria-label="Breadcrumb">
            <Link href="/" className="-mx-1 -my-3 inline-block px-1 py-3 transition-colors hover:text-brand">
              Home
            </Link>
            {' / '}
            <Link
              href="/special-offers"
              className="-mx-1 -my-3 inline-block px-1 py-3 transition-colors hover:text-brand"
            >
              {COPY.nav.specialOffers}
            </Link>
            {' / '}
            <span className="font-medium text-ink">{offer.title}</span>
          </nav>

          {/* The artwork alone — NO shared backdrop here, deliberately.
              The backdrop exists to make a GRID of bonus cards read as one set;
              this page shows a single bonus at full width, where there is no set
              to belong to. The ink ground stays, so the artwork sits on the same
              colour it did on the card that led here, and a banner drawn for a
              dark surround is not suddenly on cream. */}
          {banner ? (
            <div className="relative aspect-[16/6] banner-wash overflow-hidden rounded-[20px] border border-line">
              <Image
                src={banner}
                alt={offer.title}
                fill
                sizes="(max-width: 820px) 100vw, 780px"
                priority
                className="object-contain object-center"
              />
            </div>
          ) : (
            /* No artwork: the offer itself becomes the banner, as the mockup
               does — typography on the ink ground rather than an empty box. */
            <div className="banner-wash flex aspect-[16/8] items-center overflow-hidden rounded-[20px] border border-line p-5 sm:aspect-[16/5] sm:p-[56px]">
              <p className="font-display max-w-full text-[26px] font-extrabold leading-none text-white sm:max-w-[70%] sm:text-[44px]">
                {offer.bonus_category_name && (
                  <span className="mb-3 block text-[0.34em] font-semibold uppercase tracking-[0.16em] text-night-accent">
                    {offer.bonus_category_name}
                  </span>
                )}
                {offer.bonuses ?? offer.title}
              </p>
            </div>
          )}

          {/* Title and rating on the left, the bonus figure and the CTA on
              the right: the two things a visitor came for, both above the fold
              on a desktop. Stacks in source order on a phone, where "what is
              it" still reads before "claim it". */}
          <header className="mt-[30px] flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="font-display text-[30px] font-extrabold leading-[1.08] text-ink sm:text-[42px]">
                {offer.title}
              </h1>
              <p
                className="mt-1.5 text-[18px] leading-none tracking-[2px] text-gold"
                role="img"
                aria-label={`${offer.rating} out of 5`}
              >
                {'★'.repeat(offer.rating)}
                <span className="text-line-soft" aria-hidden>
                  {'★'.repeat(5 - offer.rating)}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:justify-end">
              {offer.bonuses && (
                <p className="rounded-xl bg-brand-tint px-6 py-5 text-[18px] font-bold text-brand-dark sm:text-[22px]">
                  {offer.bonuses}
                </p>
              )}

              {/* An EXPIRED offer keeps its page — the URL stays valid and the
                  terms stay readable — but it must never be presented as
                  claimable. The CTA is replaced with a plain statement rather
                  than removed silently, so a visitor who followed an old link
                  understands why there is nothing to press. */}
              {offer.terms?.expired ? (
                <p className="rounded-xl border border-line bg-surface px-5 py-4 text-[14px] font-semibold text-ink-soft">
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
                // Claim belongs to the Special Offers bonus type, matching the
                // cards — see CLAIMABLE_BONUS_CATEGORY in SpecialOfferCard.
                claimable && offer.affiliate_url && (
                  <a
                    href={offer.affiliate_url}
                    target="_blank"
                    rel="nofollow sponsored noopener"
                    className="inline-flex min-h-[52px] shrink-0 items-center justify-center rounded-xl bg-brand px-[26px] py-4 text-[15.5px] font-bold text-brand-ink shadow-[0_8px_22px_-10px_rgba(233,182,73,0.8)] transition-all hover:-translate-y-px hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    {COPY.specialOffers.claim}
                  </a>
                )
              )}
            </div>
          </header>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_26rem]">
            {/* The rail: terms, the compliance line and the operator link.
                FIRST IN SOURCE so the wagering requirement is read before the
                sales copy on a phone; `lg:order-2` moves it beside the
                description on a desktop. That order is the point of the
                change — the terms used to sit below the prose, where a reader
                deciding whether to deposit had already stopped reading. */}
            <aside className="lg:order-2 lg:sticky lg:top-24 lg:self-start [&>section]:my-0 lg:[&_dl]:grid-cols-2">
              {offer.terms && <BonusTerms terms={offer.terms} />}

              <p className={`text-[13px] text-muted ${offer.terms ? 'mt-3' : ''}`}>
                18+. T&amp;Cs apply — read the full conditions on the operator&apos;s own site before
                depositing.{' '}
                <Link href="/responsible-gambling" className="underline underline-offset-2 hover:text-brand">
                  Play responsibly
                </Link>
                .
              </p>

              {/* A card, not a bare line: beside a column of prose a lone
                  sentence reads as a mistake. */}
              {offer.casino && (
                <div className="mt-4 rounded-xl border border-line bg-paper p-5 text-[15px] text-muted">
                  <p>
                    Offer by{' '}
                    <Link
                      href={`/casinos/${offer.casino.slug}`}
                      className="font-bold text-brand underline underline-offset-2 hover:text-brand-dark"
                    >
                      {offer.casino.name}
                    </Link>
                  </p>
                  <Link
                    href={`/casinos/${offer.casino.slug}`}
                    className="mt-3 inline-flex min-h-11 items-center font-bold text-brand underline underline-offset-4 hover:text-brand-dark"
                  >
                    Read the full review →
                  </Link>
                </div>
              )}
            </aside>

            {offer.description && (
              <div
                className="prose min-w-0 max-w-none lg:order-1 lg:prose-lg"
                dangerouslySetInnerHTML={{ __html: offer.description }}
              />
            )}
          </div>
        </div>
      </main>
    </>
  )
}
