import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { getCasinos, getCasino } from '@/lib/api'
import { buildCasinoReviewSchema, buildBreadcrumbSchema, buildWebPageSchema, breadcrumbIdFor, jsonLdScript, SHARE_IMAGES } from '@/lib/seo'
import { resolveImageUrl } from '@/lib/images'
import CasinoSpecialOffers from '@/components/CasinoSpecialOffers'
import CasinoReviews from '@/components/CasinoReviews'
import CasinoCard, { CASINO_GRID } from '@/components/CasinoCard'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

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
      openGraph: { type: 'article', url: `/casinos/${slug}`, siteName: SITE_NAME, title: shareTitle, description, images: SHARE_IMAGES },
      twitter: { card: 'summary_large_image', title: shareTitle, description, images: SHARE_IMAGES },
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
  // Two more casinos for the closing "More top slot casinos" row: the same
  // cached, `casinos`-tagged fetch the listing uses; unreachable, the row is
  // simply left out.
  const others = await getCasinos()
    .then(({ data }) => data.filter((c) => c.slug !== casino.slug).slice(0, 2))
    .catch(() => [])
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

      <main className="pb-4">
        <div className="mx-auto max-w-[94rem] px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 pt-[22px] text-[13px] text-muted">
            <Link href="/" className="-mx-1 -my-3 inline-block px-1 py-3 transition-colors hover:text-brand">Home</Link>/
            <Link href="/casinos" className="-mx-1 -my-3 inline-block px-1 py-3 transition-colors hover:text-brand">Casinos</Link>/
            <span className="font-semibold text-ink">{casino.name}</span>
          </nav>

          {/* The banner as on winpalack: the artwork whole in a 16:5 frame,
              straight under the breadcrumb. Nothing at all without artwork.
              `preload` + `fetchPriority`, not `priority`: in Next 16 `priority`
              emits the preload at the browser's default Low priority. */}
          {banner && (
            <div className="relative mt-5 aspect-[16/5] overflow-hidden rounded-3xl border border-line-soft bg-paper">
              <Image src={banner} alt={`${casino.name} banner`} fill className="object-contain object-center" sizes={BANNER_SIZES} preload fetchPriority="high" />
            </div>
          )}

          {/* The ID card — the mockup's `.side`: logo, name and rating, the
              bonus, the seven checks it went through, and the CTA with its
              small print. */}
          <header className="mt-5 grid gap-6 rounded-3xl border border-line bg-paper p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center lg:gap-10">
            <div className="flex min-w-0 flex-col gap-3.5">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                {logo && (
                  <span className="flex h-[90px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-white p-2">
                    <Image src={logo} alt={`${casino.name} logo`} width={240} height={180} sizes="120px" className="h-full w-full object-contain" />
                  </span>
                )}
                <div className="min-w-0">
                  <h1 className="font-display text-[clamp(22px,calc(9.2vw-7px),30px)] font-extrabold leading-none text-ink [overflow-wrap:anywhere] sm:text-[clamp(30px,3.6vw,44px)]">
                    {casino.name}
                  </h1>
                  <p className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft">
                    <span className="text-[16px] tracking-[2px] text-gold" role="img" aria-label={`${casino.rating} out of 5`}>
                      {'★'.repeat(casino.rating)}
                      <span className="text-line-soft" aria-hidden>{'★'.repeat(5 - casino.rating)}</span>
                    </span>
                    {casino.rating.toFixed(1)}
                  </p>
                </div>
              </div>
              {casino.bonuses && (
                <p className="font-display text-[22px] font-bold leading-[1.2] text-brand-dark">{casino.bonuses}</p>
              )}
              {/* The seven checks — the method every listed casino went
                  through (see COPY: "seven" is always the checks, never a
                  star count). */}
              <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-ink-soft">
                <span aria-hidden className="text-base text-brand">✦✦✦✦✦✦✦</span>
                Put through all seven checks
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={casino.attachment.affiliate_url}
                target="_blank"
                rel="nofollow sponsored noopener"
                className="btn-g min-h-12 px-6 text-[15px]"
              >
                {COPY.casinos.visitCasino}
              </a>
              {/* T&Cs, right under the CTA: a visible terms line beside every
                  bonus figure is a compliance requirement. */}
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

          {/* At a glance — the mockup's `.glance` tiles. Every fact is
              conditional: a casino with no offers or no categories simply
              shows fewer. */}
          <section className="mt-10" aria-labelledby="at-a-glance">
            <h2 id="at-a-glance" className="font-display text-[26px] font-extrabold leading-tight text-ink sm:text-[clamp(26px,3vw,36px)]">
              {casino.name} {COPY.casinos.glanceHeadingTail}
            </h2>
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[18px] border border-line p-[18px]">
                <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">{COPY.casinos.rating}</dt>
                <dd className="mt-1.5 font-display text-[19px] font-bold leading-[1.2] text-ink">{casino.rating} out of 5</dd>
              </div>
              {liveOffers > 0 && (
                <div className="rounded-[18px] border border-line p-[18px]">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Bonuses listed</dt>
                  <dd className="mt-1.5 font-display text-[19px] font-bold leading-[1.2] text-ink">
                    {liveOffers} {liveOffers === 1 ? 'bonus' : 'bonuses'} on this page
                  </dd>
                </div>
              )}
              {categoryNames.length > 0 && (
                <div className="rounded-[18px] border border-line p-[18px]">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Listed under</dt>
                  <dd className="mt-1.5 font-display text-[19px] font-bold leading-[1.2] text-ink">{categoryNames.join(', ')}</dd>
                </div>
              )}
              {/* `reviewed_at` is the date a PERSON last read this operator —
                  not `updated_at`, which any field edit bumps. Null means
                  nobody has recorded a reading, so the tile is absent. */}
              {casino.reviewed_at && (
                <div className="rounded-[18px] border border-line p-[18px]">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Last read</dt>
                  <dd className="mt-1.5 font-display text-[19px] font-bold leading-[1.2] text-ink">
                    <time dateTime={casino.reviewed_at}>
                      {new Date(casino.reviewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </time>
                  </dd>
                </div>
              )}
              {/* Where the operator accepts players from — the full list. */}
              {casino.countries && casino.countries.length > 0 && (
                <div className="rounded-[18px] border border-line p-[18px]">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Accepts players from</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {casino.countries.map((country) => (
                      <span key={country.id} className="inline-flex items-center rounded-full bg-win-bg px-2.5 py-[3px] text-[13px] font-semibold text-win">
                        {country.name}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <div className="mt-10">
            {casino.description && (
              <>
                <h2 className="mb-4 font-display text-[26px] font-extrabold leading-tight text-ink sm:text-[clamp(26px,3vw,36px)]">Full review</h2>
                <div
                  className="prose max-w-none prose-p:max-w-[72ch] prose-p:text-[17px] prose-p:leading-[1.8]"
                  dangerouslySetInnerHTML={{ __html: casino.description }}
                />
              </>
            )}

            {casino.categories && casino.categories.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {casino.categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/categories/${c.slug}`}
                    className="inline-flex min-h-11 items-center rounded-[10px] border-[1.5px] border-line-soft px-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}

            <CasinoSpecialOffers offers={casino.special_offers ?? []} logo={logo} />

            {/* Renders nothing at all until this site's "Visitor reviews"
                switch is on in the admin — the component gates itself on the
                endpoint's 404, so no per-site conditional is needed here. */}
            <CasinoReviews casinoSlug={casino.slug} casinoName={casino.name} />
          </div>

          {others.length > 0 && (
            <section className="mt-14" aria-labelledby="more-casinos">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="more-casinos" className="font-display text-[26px] font-extrabold leading-tight text-ink sm:text-[clamp(26px,3vw,36px)]">
                  More top slot casinos
                </h2>
                <Link href="/casinos" className="-my-3 inline-flex min-h-11 items-center py-3 font-bold text-brand transition-colors hover:text-brand-dark">
                  See all <span aria-hidden className="ml-1">→</span>
                </Link>
              </div>
              <ul className={`mt-5 ${CASINO_GRID}`} role="list">
                {others.map((c) => (
                  <CasinoCard key={c.id} casino={c} />
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
    </>
  )
}
