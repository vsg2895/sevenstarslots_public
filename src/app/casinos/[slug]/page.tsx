import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { getCasinos, getCasino } from '@/lib/api'
import { buildCasinoReviewSchema, buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import CasinoSpecialOffers from '@/components/CasinoSpecialOffers'
import CasinoReviews from '@/components/CasinoReviews'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const { data: casino } = await getCasino(slug)
    const title = casino.meta_title ?? `${casino.name} Review`
    // A casino record is shared by every site, so the fallback must carry THIS
    // site's voice — otherwise all four domains ship the same description for
    // the same casino. An admin-set meta_description still wins, and is shared
    // by design; per-site overrides would need columns on the casino_site pivot.
    // An admin-entered meta_description is shared master data, so this site's
    // short signature is appended rather than the value being used verbatim —
    // otherwise filling the field in the admin would put the identical
    // description back on all four domains. No value set: fall back to the
    // site's own full line.
    const description = casino.meta_description
      ? `${casino.meta_description} ${COPY.casinos.reviewSignature}`
      : `${casino.name} — ${COPY.casinos.reviewSummary}`
    // The `title` above is the casino's own meta_title — shared master data, so
    // it is byte-identical on every domain in the network. The share card is
    // where that was most visible: six results, one headline. This site's tail
    // makes the card its own without touching the shared record.
    const shareTitle = `${title} — ${COPY.casinos.reviewTitleTail}`
    return {
      title,
      description,
      alternates: { canonical: `/casinos/${slug}` },
      openGraph: { type: 'article', url: `/casinos/${slug}`, siteName: SITE_NAME, title: shareTitle, description },
      twitter: { card: 'summary_large_image', title: shareTitle, description },
    }
  } catch {
    return { title: COPY.errors.notFound }
  }
}

/**
 * Resolve a TRUNCATED slug to the real one, or return null.
 *
 * Search Console reported `/casinos/7` as a 404. There is no casino "7" and
 * there never was: slugs come from the operator name via spatie/sluggable, and
 * not one of them is numeric. What does exist is `7-bit-casino` — and cutting
 * that at its first hyphen gives exactly the URL that was crawled. Email
 * clients, chat apps and some link parsers end a URL at punctuation, so a
 * hyphenated slug is the one shape that reliably arrives truncated.
 *
 * A PREFIX, and only up to the hyphen. `startsWith(fragment + '-')` means the
 * fragment has to end where a slug segment ends, so `/casinos/7` can reach
 * `7-bit-casino` but `/casinos/bit` cannot reach `bitstarz` — that would be
 * guessing at a substring rather than restoring a cut.
 *
 * EXACTLY ONE MATCH, or nothing. With `7-bit-casino` and a hypothetical
 * `7-bit-casino-vip` both present, `/casinos/7` is genuinely ambiguous and a
 * redirect would be picking one on the visitor's behalf. Ambiguity falls
 * through to the 404, which is the honest answer.
 *
 * Costs nothing on the happy path: it is only reached when `getCasino()` has
 * already failed, and `getCasinos()` is the same cached, `casinos`-tagged fetch
 * the listing and the sitemap use.
 */
async function resolveTruncatedSlug(fragment: string): Promise<string | null> {
  // A fragment that already contains a hyphen is not a cut at a segment
  // boundary — it is just a wrong slug. Bail before spending the fetch.
  if (fragment === '' || fragment.includes('-')) return null

  try {
    const { data: casinos } = await getCasinos()
    const matches = casinos.filter((c) => c.slug.startsWith(`${fragment}-`))

    return matches.length === 1 ? matches[0].slug : null
  } catch {
    // The list being unreachable must not turn a 404 into a 500.
    return null
  }
}

export default async function CasinoDetailPage({ params }: Props) {
  const { slug } = await params

  let casino
  try {
    casino = (await getCasino(slug)).data
  } catch {
    /*
     * Before 404ing, try the one recoverable case: a slug truncated at a
     * hyphen. `permanentRedirect` is a 308, not a 301 — the App Router cannot
     * set an arbitrary status from a page, and 308 is the permanent redirect
     * that preserves the method. Google treats the two identically for
     * canonicalisation, so the signal is the same one a 301 would send.
     */
    const real = await resolveTruncatedSlug(slug)

    if (real !== null) permanentRedirect(`/casinos/${real}`)

    notFound()
  }

  const banner = resolveImageUrl(casino.banner_image)
  const logo = resolveImageUrl(casino.image_path)
  const pageUrl = `${SITE_URL}/casinos/${slug}`
  // Facts for the summary panel below the CTA.
  const categoryNames = (casino.categories ?? []).map((c) => c.name)
  const liveOffers = (casino.special_offers ?? []).length
  const reviewSchema = buildCasinoReviewSchema(casino)
  const breadcrumb = buildBreadcrumbSchema(
    [
      { name: 'Home', url: SITE_URL },
      { name: 'Casinos', url: `${SITE_URL}/casinos` },
      { name: casino.name, url: pageUrl },
    ],
    pageUrl,
  )
  // One graph per page: the WebPage node anchors this URL into the site graph
  // and points at its own breadcrumb, so the review and the trail are read as
  // parts of one page rather than three unrelated blocks.
  const graph = [
    buildWebPageSchema({
      name: `${casino.name} Review`,
      url: pageUrl,
      // Same composition as the <meta> description in generateMetadata. Passing
      // the raw shared `meta_description` here put an identical WebPage
      // description on all six domains for the same casino.
      description: casino.meta_description
        ? `${casino.meta_description} ${COPY.casinos.reviewSignature}`
        : `${casino.name} — ${COPY.casinos.reviewSummary}`,
      breadcrumbId: breadcrumbIdFor(pageUrl),
      dateModified: casino.updated_at,
    }),
    breadcrumb,
    reviewSchema,
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main className="px-5 pb-16">
        <div className="mx-auto max-w-[780px]">
          <nav className="pb-[22px] pt-7 text-[14.5px] text-muted" aria-label="Breadcrumb">
            <Link href="/" className="-mx-1 -my-3 inline-block px-1 py-3 transition-colors hover:text-brand">
              Home
            </Link>
            {' / '}
            <Link href="/casinos" className="-mx-1 -my-3 inline-block px-1 py-3 transition-colors hover:text-brand">
              Casinos
            </Link>
            {' / '}
            <span className="font-medium text-ink">{casino.name}</span>
          </nav>

          {/* The banner: ink ground, 16:5, the operator's artwork contained on
              it. When there is no artwork the BONUS becomes the banner —
              typography on the same ground rather than an empty grey box, which
              is the mockup's own treatment of this block. A casino with neither
              renders no banner at all. */}
          {banner ? (
            <div className="relative aspect-[16/5] banner-wash overflow-hidden rounded-[20px] border border-line">
              <Image
                src={banner}
                alt={`${casino.name} banner`}
                fill
                className="object-contain"
                sizes="(max-width: 820px) 100vw, 780px"
                priority
              />
            </div>
          ) : (
            casino.bonuses && (
              <div className="banner-wash flex aspect-[16/8] items-center overflow-hidden rounded-[20px] border border-line p-5 sm:aspect-[16/5] sm:p-[56px]">
                <p className="font-display max-w-full text-[26px] font-extrabold leading-none text-white sm:max-w-[70%] sm:text-[44px]">
                  <span className="mb-3 block text-[0.34em] font-semibold uppercase tracking-[0.16em] text-night-accent">
                    Current offer
                  </span>
                  {casino.bonuses}
                </p>
              </div>
            )
          )}

          <header className="mb-[22px] mt-[30px] flex items-center gap-5">
            {logo && (
              <Image
                src={logo}
                alt={`${casino.name} logo`}
                width={192}
                height={192}
                sizes="96px"
                className="h-[96px] w-[96px] shrink-0 rounded-xl border border-line bg-white object-contain p-2"
              />
            )}
            <div className="min-w-0">
              <h1 className="font-display text-[32px] font-extrabold leading-[1.08] text-ink sm:text-[44px]">
                {casino.name}
              </h1>
              <p
                className="mt-1.5 text-[18px] leading-none tracking-[2px] text-gold"
                role="img"
                aria-label={`${casino.rating} out of 5`}
              >
                {'★'.repeat(casino.rating)}
                <span className="text-line-soft" aria-hidden>
                  {'★'.repeat(5 - casino.rating)}
                </span>
              </p>
            </div>
          </header>

          {/* The bonus bar — the mockup's `.bonusbar`. Pale terracotta ground,
              dark terracotta type: the one figure on the page a reader came
              for, stated once, large. */}
          {casino.bonuses && (
            <p className="rounded-xl bg-brand-tint px-6 py-5 text-[18px] font-bold text-brand-dark sm:text-[22px]">
              {casino.bonuses}
            </p>
          )}

          <a
            href={casino.attachment.affiliate_url}
            target="_blank"
            rel="nofollow sponsored noopener"
            className="mt-[22px] inline-flex min-h-[52px] items-center rounded-xl bg-brand px-[26px] py-4 text-[15.5px] font-bold text-brand-ink shadow-[0_8px_22px_-10px_rgba(233,182,73,0.8)] transition-all hover:-translate-y-px hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            {COPY.casinos.visitCasino}
          </a>

          {/* T&Cs, immediately under the CTA rather than in the footer.
              A visible terms link beside every bonus figure is a compliance
              requirement, and the operator's own terms are the only place the
              full conditions exist. */}
          <p className="mt-3 text-[13px] text-muted">
            18+. T&amp;Cs apply — read the full conditions on the operator&apos;s own site before
            depositing.{' '}
            <Link href="/responsible-gambling" className="underline underline-offset-2 hover:text-brand">
              Play responsibly
            </Link>
            .
          </p>

          {/* Summary panel — the same at-a-glance facts the sibling sites show,
              so a reader gets rating, offer count, categories and revision date
              without scrolling the review. Every row is conditional: a casino
              with no offers or no categories simply renders fewer rows. */}
          <section
            className="my-[30px] rounded-[14px] border border-line bg-paper p-7"
            aria-labelledby="at-a-glance"
          >
            <h2 id="at-a-glance" className="font-display mb-5 text-[22px] font-bold text-ink">
              {casino.name} {COPY.casinos.glanceHeadingTail}
            </h2>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.16em] text-muted">
                  {COPY.casinos.rating}
                </dt>
                <dd className="text-[16.5px] text-ink">{casino.rating} out of 5</dd>
              </div>
              {liveOffers > 0 && (
                <div>
                  <dt className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.16em] text-muted">
                    Bonuses listed
                  </dt>
                  <dd className="text-[16.5px] text-ink">
                    {liveOffers} {liveOffers === 1 ? 'bonus' : 'bonuses'} on this page
                  </dd>
                </div>
              )}
              {categoryNames.length > 0 && (
                <div>
                  <dt className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.16em] text-muted">
                    Listed under
                  </dt>
                  <dd className="text-[16.5px] text-ink">{categoryNames.join(', ')}</dd>
                </div>
              )}
              {/* `reviewed_at` is the date a PERSON last read this operator —
                  not `updated_at`, which any field edit bumps. Null means
                  nobody has recorded a reading, and this site must not imply
                  one happened, so the row is simply absent. */}
              {casino.reviewed_at && (
                <div>
                  <dt className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.16em] text-muted">
                    Last read
                  </dt>
                  <dd className="text-[16.5px] text-ink">
                    <time dateTime={casino.reviewed_at}>
                      {new Date(casino.reviewed_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </time>
                  </dd>
                </div>
              )}
              {/* Where the operator accepts players from. Real, attached data —
                  the full list here, where there is room for it, rather than
                  the card's first three. */}
              {casino.countries && casino.countries.length > 0 && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <dt className="mb-1.5 text-[12.5px] font-bold uppercase tracking-[0.16em] text-muted">
                    Accepts players from
                  </dt>
                  <dd className="flex flex-wrap gap-2">
                    {casino.countries.map((country) => (
                      <span
                        key={country.id}
                        className="inline-flex items-center rounded-full bg-win-bg px-[11px] py-1 text-[13px] font-semibold text-win"
                      >
                        {country.name}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {casino.description && (
            <div
              className="prose mt-8 max-w-none"
              dangerouslySetInnerHTML={{ __html: casino.description }}
            />
          )}

          {casino.categories && casino.categories.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2.5">
              {casino.categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-line bg-paper px-[18px] text-[15px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}

          <CasinoSpecialOffers offers={casino.special_offers ?? []} />

          {/* Renders nothing at all until this site's "Visitor reviews"
              switch is on in the admin — the component gates itself on the
              endpoint's 404, so no per-site conditional is needed here. */}
          <CasinoReviews casinoSlug={casino.slug} casinoName={casino.name} />
        </div>
      </main>
    </>
  )
}
