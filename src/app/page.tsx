import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getBonusArea, getCategories, getCategory, getSpecialOffers } from '@/lib/api'
import type { BonusSection } from '@/lib/api'
import { buildItemListSchema, buildWebPageSchema, jsonLdScript, buildFaqSchema, SHARE_IMAGES } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { FAQ_ITEMS } from '@/constants/faq'
import CasinoCard, { CASINO_GRID } from '@/components/CasinoCard'
import BonusCategoryNav from '@/components/BonusCategoryNav'
import BonusAccordion from '@/components/BonusAccordion'
import CategoryNav from '@/components/CategoryNav'
import FaqCarousel from '@/components/FaqCarousel'
import SpecialOfferCard, { OFFER_GRID } from '@/components/SpecialOfferCard'
import type { Category } from '@shared/types/category'
import type { CasinoWithAttachment } from '@shared/types/casino'
import type { SpecialOffer } from '@shared/types/specialOffer'
import { SITE_URL } from '@/lib/config'
import { casinosHeading } from '@/lib/categories'

/** Offers shown per bonus type in the home page's Bonuses section — one row. */
const HOME_BONUSES_PER_CATEGORY = 3

/** The three stage colours — the mockup's gold, cream and teal stars. */
const STAGE_COLOURS = ['var(--color-brand)', 'var(--color-ink)', 'var(--color-accent)']

/** Where each stage's numbering starts: the checks run 1–7 across the stages. */
const CHECK_STARTS = COPY.home.checkStages.reduce<number[]>(
  (starts, _, i) => [...starts, i === 0 ? 1 : starts[i - 1] + COPY.home.checkStages[i - 1].checks.length],
  [],
)

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
    openGraph: { type: 'website', url: '/', siteName: SITE_NAME, title, description, images: SHARE_IMAGES },
    twitter: { card: 'summary_large_image', title, description, images: SHARE_IMAGES },
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
    // The bonus TYPES: the chip row under the hero AND the per-type Bonuses
    // section further down, so each type brings its first
    // HOME_BONUSES_PER_CATEGORY offers (one full row of the three-up grid).
    // The chips only read names, marks and counts, which the server counts
    // over the unlimited set. allSettled means a site without the Bonus area
    // renders neither, and falls back to the plain Special offers grid.
    getBonusArea(HOME_BONUSES_PER_CATEGORY),
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
        {/* Hero — the mockup's `.hero` on the night sky: the claim and the two
            ways in on the left, the seven checks in their three stages on the
            right. */}
        <section className="sky relative overflow-hidden border-b border-line">
          <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-8 px-4 pb-12 pt-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:pb-14 lg:pt-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand/40 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand">
                {COPY.home.heroEyebrow}
              </p>
              <h1 className="mt-5 font-display text-[40px] font-extrabold leading-none text-balance text-ink sm:text-[clamp(40px,5.8vw,76px)]">
                {COPY.home.heroHeadline} <em className="not-italic text-brand">{COPY.home.heroHighlight}</em>
              </h1>
              <p className="mt-[22px] max-w-[520px] text-[17px] text-ink-soft">{COPY.home.heroSubtitle}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/casinos" className="btn-g min-h-12 px-6 text-[15px]">
                  {COPY.home.featuredCasinos}
                </Link>
                {anyOffersVisible && (
                  <Link href="/special-offers" className="btn-o min-h-12 px-6 text-[15px]">
                    {COPY.home.specialOffers}
                  </Link>
                )}
              </div>
            </div>

            <aside aria-labelledby="checks-heading" className="rounded-3xl border border-line-soft bg-paper/90 p-[18px] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)] sm:p-[22px]">
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3.5">
                <h2 id="checks-heading" className="font-display text-xl font-extrabold text-ink">{COPY.home.checksTitle}</h2>
                <span className="text-xs font-semibold text-muted">{COPY.home.checksNote}</span>
              </div>
              {COPY.home.checkStages.map((stage, si) => (
                <div key={stage.label} className="pt-3.5" style={{ '--c': STAGE_COLOURS[si] } as React.CSSProperties}>
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--c)] after:h-px after:flex-1 after:bg-line after:content-['']">
                    {stage.label}
                  </p>
                  <ol className="mt-2 flex flex-col gap-1" start={CHECK_STARTS[si]}>
                    {stage.checks.map((check, ci) => (
                      <li key={check.name} className="grid grid-cols-[30px_minmax(0,1fr)] items-center gap-3 py-[7px]">
                        <span aria-hidden className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[var(--c)] text-[13px] font-extrabold text-cream">
                          {CHECK_STARTS[si] + ci}
                        </span>
                        <span>
                          <b className="block text-[15px] font-bold leading-[1.25] text-ink">{check.name}</b>
                          <span className="block text-[13px] leading-[1.4] text-ink-soft">{check.line}</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
              <dl className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div className="rounded-[14px] border border-line bg-cream px-3.5 py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{COPY.home.verdictChecks.label}</dt>
                  <dd className="mt-1 text-sm font-bold leading-[1.35] text-ink">{COPY.home.verdictChecks.text}</dd>
                </div>
                <div className="rounded-[14px] border border-line bg-cream px-3.5 py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{COPY.home.verdictStars.label}</dt>
                  <dd className="mt-1 text-sm font-bold leading-[1.35] text-ink">
                    <span aria-hidden className="tracking-[1px] text-gold">★★★★★</span> {COPY.home.verdictStars.text}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        {/* The ranking — category filters, then the casinos as framed cards. */}
        <section className="py-14 sm:py-[72px]" aria-labelledby="top-casinos-heading">
          <div className="mx-auto max-w-[1200px] px-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">{COPY.home.rankingLabel}</p>
            <h2 id="top-casinos-heading" className="mt-2.5 font-display text-[30px] font-extrabold leading-none text-ink sm:text-[clamp(30px,4.2vw,52px)]">
              {COPY.home.topCasinosTitle}
            </h2>
            <p className="mt-3 max-w-[520px] text-ink-soft">{COPY.home.topCasinosSubtitle}</p>

            {categories.length > 0 && selected && (
              <div className="mt-6">
                <CategoryNav categories={categories} selected={selected} />
              </div>
            )}

            {casinos.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-line bg-paper p-10 text-center text-muted">
                {COPY.casinos.noResults}
              </p>
            ) : (
              <ol className={`mt-[26px] ${CASINO_GRID}`}>
                {casinos.map((casino, i) => (
                  <CasinoCard key={casino.id} casino={casino} rank={i + 1} />
                ))}
              </ol>
            )}

            {activeCategory && hasMoreCasinos && (
              <div className="mt-[26px] flex justify-center">
                <Link href={`/categories/${selected}`} className="btn-o min-h-12 px-6 text-[15px]">
                  See more casinos<span className="sr-only"> — {casinosHeading(activeCategory.name)}</span> <span aria-hidden>→</span>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Bonus types as medallions. Renders nothing without a Bonus area. */}
        {bonusSections.length > 0 && (
          <section className="pb-14 sm:pb-[72px]">
            <div className="mx-auto max-w-[1200px] px-4">
              <BonusCategoryNav sections={bonusSections} />
            </div>
          </section>
        )}

        {/* How a casino earns its place — the three stages, in order, on a
            rule with a coloured star on each. Numbered because they ARE a
            sequence. */}
        <section className="sky border-y border-line py-14 sm:py-[72px]" aria-labelledby="method-heading">
          <div className="mx-auto max-w-[1200px] px-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">{COPY.home.methodLabel}</p>
            <h2 id="method-heading" className="mt-2.5 font-display text-[30px] font-extrabold leading-none text-ink sm:text-[clamp(30px,4.2vw,52px)]">
              {COPY.home.methodTitle}
            </h2>
            <p className="mt-3 max-w-[520px] text-ink-soft">{COPY.home.methodSubtitle}</p>
            <ol className="mt-[30px] grid grid-cols-1 sm:grid-cols-3">
              {COPY.home.methodSteps.map((step, i) => (
                <li
                  key={step.no}
                  className={`stg relative border-t-2 border-line-soft py-6 sm:py-[26px] sm:pr-[26px] ${i > 0 ? 'sm:pl-[26px]' : ''}`}
                  style={{ '--c': STAGE_COLOURS[i] } as React.CSSProperties}
                >
                  <p aria-hidden className="font-display text-[56px] font-extrabold leading-none text-[var(--c)]">{step.no}</p>
                  <p className="mt-2.5 text-xs font-bold uppercase tracking-[0.1em] text-[var(--c)]">{step.checks}</p>
                  <h3 className="mt-1.5 font-display text-2xl font-extrabold text-ink">{step.title}</h3>
                  <p className="mt-2.5 text-[15px] text-ink-soft">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Bonuses — one accordion row per type, built from the same
            getBonusArea payload as the medallions and the menus. A site
            without the Bonus area keeps the flat grid below. */}
        {bonusSections.length > 0 ? (
          <section className="py-14 sm:py-[72px]" aria-labelledby="bonus-heading">
            <div className="mx-auto max-w-[1200px] px-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="bonus-heading" className="font-display text-[30px] font-extrabold leading-none text-ink sm:text-[clamp(30px,4.2vw,52px)]">
                  {COPY.home.bonus}
                </h2>
                <Link href="/special-offers" className="-my-3 inline-flex min-h-11 items-center py-3 font-bold text-brand transition-colors hover:text-brand-dark">
                  {COPY.home.viewAll}<span className="sr-only"> bonuses</span> <span aria-hidden className="ml-1">→</span>
                </Link>
              </div>
              <BonusAccordion sections={bonusSections} />
            </div>
          </section>
        ) : topOffers.length > 0 && (
          <section className="py-14 sm:py-[72px]" aria-labelledby="offers-heading">
            <div className="mx-auto max-w-[1200px] px-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <h2 id="offers-heading" className="font-display text-[30px] font-extrabold leading-none text-ink sm:text-[clamp(30px,4.2vw,52px)]">
                  {COPY.home.specialOffers}
                </h2>
                <Link href="/special-offers" className="-my-3 inline-flex min-h-11 items-center py-3 font-bold text-brand transition-colors hover:text-brand-dark">
                  {COPY.home.viewAll}<span className="sr-only"> special offers</span> <span aria-hidden className="ml-1">→</span>
                </Link>
              </div>
              <div className={`mt-6 ${OFFER_GRID}`}>
                {topOffers.map((offer) => (
                  <SpecialOfferCard key={offer.id} offer={offer} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ — a carousel of question cards. Every answer is in the HTML,
            which the FAQPage schema above requires. */}
        <section className={`${bonusSections.length > 0 || topOffers.length > 0 ? '' : 'pt-14 sm:pt-[72px]'}`} aria-labelledby="faq-heading">
          <div className="mx-auto max-w-[1200px] px-4">
            <FaqCarousel items={FAQ_ITEMS} label={COPY.home.faqLabel} title={COPY.home.faqTitle} />
          </div>
        </section>
      </main>
    </>
  )
}
