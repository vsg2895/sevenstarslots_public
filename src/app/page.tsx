import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBonusArea, getCategories, getCategory, getSpecialOffers } from '@/lib/api'
import type { BonusSection } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript, buildFaqSchema } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { FAQ_ITEMS } from '@/constants/faq'
import CasinoCard from '@/components/CasinoCard'
import BonusCategoryNav from '@/components/BonusCategoryNav'
import CategoryNav from '@/components/CategoryNav'
import SpecialOfferCard from '@/components/SpecialOfferCard'
import type { Category } from '@shared/types/category'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { SpecialOffer } from '@shared/types/specialOffer'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''
const YEAR = new Date().getFullYear()

type Props = { searchParams: Promise<{ category?: string; page?: string }> }

// Resolve the selected category (default = first/highest-priority) for the home casinos section.
async function resolveCategory(searchParams: Props['searchParams']) {
  const sp = await searchParams
  const categories = (await getCategories()).data
  const selected =
    sp.category && categories.some((c) => c.slug === sp.category) ? sp.category : categories[0]?.slug
  return { categories: categories as Category[], selected }
}

export async function generateMetadata(): Promise<Metadata> {
  const title = `${COPY.home.homeTitle} ${YEAR} | ${SITE_NAME}`
  const description = COPY.home.metaDescription
  return {
    title,
    description,
    alternates: { canonical: '/' },
    openGraph: { type: 'website', url: '/', siteName: SITE_NAME, title, description },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function HomePage({ searchParams }: Props) {
  /*
   * THE HOME PAGE HAS ONE PAGE, so `?page=2` is a page past the end.
   *
   * Nothing here is paginated (the full list is /casinos), yet `/?page=2` and
   * every other number a crawler guessed answered 200 with the whole home page
   * and an `index` robots tag: a duplicate of `/` at a URL of its own. A 404
   * says it is not a page at all, the rule every paginated listing here applies
   * past its last page. `?page=1` never reaches this: proxy.ts 301s it to `/`.
   */
  if (Math.max(1, Number((await searchParams).page) || 1) > 1) notFound()

  const { categories, selected } = await resolveCategory(searchParams)

  const [categoryRes, offersRes, anyOffersRes, bonusRes] = await Promise.allSettled([
    selected ? getCategory(selected) : Promise.resolve(null),
    getSpecialOffers(selected, 6),
    // Site-wide, unfiltered, limit 1 — just "does a visible offer exist at all?".
    // Runs alongside the others, so it costs no extra round-trip of latency, and
    // the public endpoint already excludes offers whose visibility is off.
    getSpecialOffers(undefined, 1),
    // The bonus TYPES, for the chip row under the hero. `limit: 1` because the
    // chips need the names, the marks and the counts — not the offers. Runs
    // alongside the others, so it costs no extra round-trip, and allSettled
    // means a site without the Bonus area simply renders no chips.
    getBonusArea(1),
  ])

  // Empty when the site does not publish the Bonus area, or when the
  // request failed — the strip renders nothing either way.
  const bonusSections: BonusSection[] = bonusRes.status === 'fulfilled' ? bonusRes.value : []

  const catData =
    categoryRes.status === 'fulfilled' && categoryRes.value ? categoryRes.value.data : null
  const casinos: CasinoWithAttachment[] = catData?.casinos ?? []
  const activeCategory = catData?.category ?? null
  // "See More" is only an affordance when there is actually more: compare the
  // category's full count against the rows this page received, rather than
  // hard-coding the page size on both sides where the two could drift apart.
  const hasMoreCasinos = (catData?.meta?.total ?? 0) > casinos.length
  // Offers are already scoped to the selected category and capped by the backend (?category=&limit=).
  const topOffers: SpecialOffer[] = offersRes.status === 'fulfilled' ? offersRes.value.data : []

  // Whether ANY special offer is visible on this site. Drives the hero CTA:
  // a button leading to an empty page is worse than no button. On a failed
  // request this stays false, so the CTA hides rather than promising content
  // that may not be there.
  const anyOffersVisible: boolean =
    anyOffersRes.status === 'fulfilled' && anyOffersRes.value.data.length > 0

  // Organization schema is emitted site-wide from the root layout; the home
  // page only adds its page-specific ItemList of top casinos.
  //
  // The list is the SELECTED category, not the whole catalogue, so it is named
  // and addressed as that category — it previously claimed the generic name
  // "Top Casinos at <brand>" and pointed at /casinos, describing neither the
  // rows below it nor a URL that renders them.
  const listSchema = buildItemListSchema(
    activeCategory ? `${activeCategory.name} — ${COPY.home.topCasinosTitle}` : COPY.home.topCasinosTitle,
    selected ? `${SITE_URL}/categories/${selected}` : `${SITE_URL}/casinos`,
    casinos.map((c, i) => ({ position: i + 1, name: c.name, url: `${SITE_URL}/casinos/${c.slug}` })),
  )

  const graph = [
    buildWebPageSchema({
      // Mirrors the actual <title>. The previous "Best Online Casinos <year>"
      // was generic boilerplate shipped identically by the sibling domains and
      // matched neither this page's title nor its H1.
      name: `${COPY.home.homeTitle} ${YEAR}`,
      url: SITE_URL,
      description: COPY.home.metaDescription,
    }),
    listSchema,
    // Same array the section below renders — markup-only FAQ is a violation.
    buildFaqSchema(SITE_URL, FAQ_ITEMS),
  ]

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(graph) }} />

      <main>
        {/* Hero.

            Centred, with the headline on a measure of its own: at 84px a line
            that crosses the full 1,160px loses the reader between its ends, so
            the column is capped and centred inside the section instead.

            The ECG trace runs behind it at 12% — the brand's own mark, used as
            texture. It is clipped by the section's `overflow-hidden` and hidden
            from assistive tech: it carries no information. */}
        <section className="hero-wash relative overflow-hidden">
          {/* NO decorative layer here.

              The sibling this was cloned from painted an ECG trace behind the
              headline — that was its brand, literally its name. This design
              carries a single gold ellipse bleeding from the top edge instead
              (see `.hero-wash`), and the headline is the only thing in the
              band. Leaving the trace in would have been decoration borrowed
              from another brand's identity. */}
          <div className="relative mx-auto max-w-[1160px] px-5 pb-8 pt-8 text-center sm:pb-14 sm:pt-[72px] lg:pb-[56px]">
            <div className="mx-auto max-w-[960px]">
              {/* The eyebrow, with the heartbeat. One piece of motion on the
                  site, and `prefers-reduced-motion` stops it — see
                  globals.css. */}
              <p className="inline-flex items-center gap-2.5 rounded-full border border-line bg-paper px-3.5 py-1.5 text-[11px] font-bold uppercase sm:px-[18px] sm:py-2 sm:text-[12.5px] tracking-[0.18em] text-ink-soft">
                <span
                  className="pulse-dot h-2 w-2 shrink-0 rounded-full bg-brand"
                  aria-hidden
                />
                {COPY.home.heroEyebrow}
              </p>

              <h1 className="font-display mx-auto mb-3 mt-4 text-[30px] sm:mb-[22px] sm:mt-[26px] font-bold leading-[1.08] text-balance text-ink sm:text-[52px] lg:text-[72px]">
                {COPY.home.heroHeadline}{' '}
                {/* The highlight sits on a pale terracotta underline rather
                    than being a block of colour: the mockup's `em::after`. The
                    bar is a child with a negative z-index against a
                    `relative`, `isolate`d span, so it paints behind the glyphs
                    without escaping into the section's own stacking context
                    and landing under the hero wash. */}
                <span className="relative isolate whitespace-nowrap text-brand">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-[0.04em] -z-10 h-[0.12em] rounded bg-brand-tint"
                  />
                  {COPY.home.heroHighlight}
                </span>
              </h1>

              <p className="mx-auto mb-5 max-w-[640px] text-pretty text-[15px] sm:mb-[34px] sm:text-[17px] leading-relaxed text-ink-soft lg:text-[20px]">
                {COPY.home.heroSubtitle}
              </p>

              <div className="flex flex-col justify-center gap-2.5 sm:gap-3.5 sm:flex-row">
                <Link
                  href="/casinos"
                  className="inline-flex min-h-[3.25rem] w-full sm:w-auto whitespace-nowrap items-center sm:min-h-[52px] sm:flex-none justify-center rounded-xl bg-brand px-6 py-3.5 text-base sm:px-[26px] sm:py-4 sm:text-[15.5px] font-bold text-brand-ink shadow-[0_8px_22px_-10px_rgba(233,182,73,0.8)] transition-all hover:-translate-y-px hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                >
                  {COPY.home.featuredCasinos}
                </Link>
                {anyOffersVisible && (
                  <Link
                    href="/special-offers"
                    className="inline-flex min-h-[3.25rem] w-full sm:w-auto whitespace-nowrap items-center sm:min-h-[52px] sm:flex-none justify-center rounded-xl border border-line bg-paper px-6 py-[13px] text-base sm:px-[26px] sm:py-4 sm:text-[15.5px] font-bold text-ink transition-all hover:-translate-y-px hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    {COPY.home.specialOffers}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Casinos by category */}
        <section className="px-5 pt-8 sm:pt-[72px]" aria-labelledby="top-casinos-heading">
          <div className="mx-auto max-w-[1160px]">
            <div className="mb-4 flex items-end justify-between gap-4 sm:mb-6">
              <div>
                <h2
                  id="top-casinos-heading"
                  className="font-display text-[24px] font-extrabold leading-[1.08] text-ink sm:text-[36px] lg:text-[44px]"
                >
                  {COPY.home.topCasinosTitle}
                </h2>
                <p className="mt-1 text-[15px] text-ink-soft sm:mt-2 sm:text-[17px]">{COPY.home.topCasinosSubtitle}</p>
              </div>
              {selected && (
                <Link
                  href={`/categories/${selected}`}
                  className="-mx-1 -my-3 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-1 py-3 text-[15px] font-bold text-brand transition-colors hover:text-brand-dark"
                >
                  {COPY.home.viewAll} <span aria-hidden>→</span>
                </Link>
              )}
            </div>

            {categories.length > 0 && selected && (
              <div className="mb-5 sm:mb-6">
                <CategoryNav categories={categories} selected={selected} />
              </div>
            )}

            {casinos.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-line bg-paper p-10 text-center text-muted">
                {COPY.casinos.noResults}
              </p>
            ) : (
              <ol className="flex flex-col gap-3.5">
                {casinos.map((casino, i) => (
                  <CasinoCard key={casino.id} casino={casino} rank={i + 1} />
                ))}
              </ol>
            )}

            {activeCategory && hasMoreCasinos && (
              <div className="mt-9 text-center">
                <Link
                  href={`/categories/${selected}`}
                  aria-label={`See all ${activeCategory.name} casinos`}
                  className="inline-flex min-h-[46px] items-center rounded-full border border-line bg-paper px-7 py-3 text-[15px] font-semibold text-ink transition-colors hover:border-ink"
                >
                  See More <span aria-hidden className="ml-1.5">→</span>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Bonus types — directly under the casino list.

            The casinos are what visitors came for, so they come first under
            the hero; the bonus-type chips follow as the next way in.

            Renders nothing when the site does not publish the Bonus area, so
            the band collapses rather than leaving a gap. */}
        {bonusSections.length > 0 && (
          <section className="px-5 pt-10 sm:pt-14">
            <div className="mx-auto max-w-[1160px]">
              {/* The panel, lit from two corners. THIS IS A DARK SITE: `paper` is a
                  deep green, so the glows have to ADD light rather than tint it
                  — warm gold and coral at low alpha read as luminous here,
                  where the sibling site's dark-on-white wash would simply turn
                  the panel to mud. Same structure, inverted treatment. No drop
                  shadow for the same reason: a dark shadow on a dark ground is
                  invisible, so the border does the separating */}
              <div className="relative overflow-hidden rounded-3xl border border-line bg-paper p-6">
                {/* Decoration only. No -z-10: the panel paints its own
                    background, and a layer sent behind it would never be seen.
                    `overflow-hidden` on the panel is what keeps these discs
                    inside the rounded corners instead of bleeding past them. */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(233,182,73,0.10),transparent_62%)]" />
                  <div className="absolute -left-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(233,182,73,0.16),transparent_70%)] blur-2xl" />
                  <div className="absolute -right-20 -bottom-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(224,122,95,0.18),transparent_70%)] blur-2xl" />
                </div>

                {/* `relative` so the content sits above the decoration. */}
                <div className="relative">
                  <BonusCategoryNav sections={bonusSections} />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* How the pulse works — the method, in the order it happens.

            Numbered because these three ARE a sequence: each step runs on the
            output of the one before it. A numbered set that is not ordered is
            decoration; this one is information, which is the test the markers
            have to pass to earn their place. */}
        <section className="px-5 pt-[72px]" aria-labelledby="method-heading">
          <div className="mx-auto max-w-[1160px]">
            <div className="mb-6">
              <h2
                id="method-heading"
                className="font-display text-[28px] font-extrabold leading-[1.08] text-ink sm:text-[36px] lg:text-[44px]"
              >
                {COPY.home.methodTitle}
              </h2>
              <p className="mt-2 text-[17px] text-ink-soft">{COPY.home.methodSubtitle}</p>
            </div>
            <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {COPY.home.methodSteps.map((step) => (
                <li
                  key={step.kicker}
                  className="rounded-[14px] border border-line bg-paper p-[26px]"
                >
                  <p className="font-display text-[15px] font-extrabold tracking-[0.08em] text-brand">
                    {step.kicker}
                  </p>
                  <h3 className="font-display mb-2 mt-2.5 text-[22px] font-bold text-ink">
                    {step.title}
                  </h3>
                  <p className="text-[15.5px] leading-relaxed text-ink-soft">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Special offers */}
        {topOffers.length > 0 && (
          <section className="px-5 pt-[72px]" aria-labelledby="offers-heading">
            <div className="mx-auto max-w-[1160px]">
              <div className="mb-6 flex items-end justify-between gap-4">
                <h2
                  id="offers-heading"
                  className="font-display text-[28px] font-extrabold leading-[1.08] text-ink sm:text-[36px] lg:text-[44px]"
                >
                  {COPY.home.specialOffers}
                </h2>
                <Link
                  href="/special-offers"
                  className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap py-3 -my-3 text-[15px] font-bold text-brand transition-colors hover:text-brand-dark sm:inline-flex"
                >
                  {COPY.home.viewAll} <span aria-hidden>→</span>
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {topOffers.map((offer) => (
                  <SpecialOfferCard key={offer.id} offer={offer} />
                ))}
              </div>

              <div className="mt-9 text-center">
                <Link
                  href="/special-offers"
                  aria-label="See all special offers"
                  className="inline-flex min-h-[46px] items-center rounded-full border border-line bg-paper px-7 py-3 text-[15px] font-semibold text-ink transition-colors hover:border-ink"
                >
                  See More <span aria-hidden className="ml-1.5">→</span>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* FAQ — rendered visibly because FAQPage structured data requires it.

            A two-column grid, not three: these answers run to three or four
            lines each, and a third column cuts the measure to the point where
            every card becomes a paragraph of six short lines. */}
        <section className="px-5 pb-4 pt-[72px]" aria-labelledby="faq-heading">
          <div className="mx-auto max-w-[1160px]">
            <h2
              id="faq-heading"
              className="font-display text-[28px] font-extrabold leading-[1.08] text-ink sm:text-[36px] lg:text-[44px]"
            >
              {COPY.home.faqTitle}
            </h2>
            <dl className="mt-6 grid gap-3.5 lg:grid-cols-2">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="rounded-[14px] border border-line bg-paper p-[26px]"
                >
                  <dt className="font-display text-[19px] font-bold text-ink">{item.question}</dt>
                  <dd className="mt-2.5 text-[15.5px] leading-relaxed text-ink-soft">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>
    </>
  )
}
