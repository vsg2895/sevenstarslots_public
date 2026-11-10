import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import MobileCollapse from '@/components/MobileCollapse'
import type { Category } from '@shared/types/category'

/*
 * The most chips one row holds — see `oneRow` in the component. Seven chips at
 * the widest labels measured today need ~1130px in the compact one-row size,
 * which the narrowest home container (1152px) still holds; past that the grid
 * keeps wrapping.
 */
const MAX_ONE_ROW = 7

/**
 * BetPulseHQ category selector — the mockup's filter tabs: a pill per
 * category, inverted to the ink ground when it is the one being shown.
 * Mounted on the home page and on the casinos listing; both link at the
 * canonical /categories/<slug> route.
 */
export default function CategoryNav({
  categories,
  selected,
}: {
  categories: Category[]
  selected: string
}) {
  /*
   * ONE ROW from 1280px, like winpalack: with at most MAX_ONE_ROW categories
   * the grid becomes a single flex line whose chips share the width equally
   * (`flex-1 basis-0`), with slightly tighter padding so seven fit this site's
   * container. `flex-wrap` is only a safety net: a chip never shrinks below
   * its label, so a longer label wraps the row instead of overflowing it.
   */
  const oneRow = categories.length <= MAX_ONE_ROW

  return (
    /*
     * ONE FULL-WIDTH COLUMN ON A PHONE; from 640px up, a grid of EQUAL chips,
     * every one as wide as the widest label.
     *
     * Content-sized chips (the previous rule) gave every tab a different
     * width, so "Free Spins" beside "Crypto Oriented" read as unequal buttons
     * rather than one set of filters. The grid is `w-max`, so its `1fr` tracks
     * resolve to the widest chip's max-content width and every chip shares it
     * — no measured pixel value to go stale when a category is renamed. The
     * column count steps up with the breakpoints (2 / 3 / 4 / 5) so the widest
     * chip still fits the container at each.
     *
     * On a phone the chips stack instead: measured content-sized they came out
     * 156–187px wide, so some rows held two and some one, and no two edges
     * lined up.
     *
     * Two equal columns do not fit: the widest chip needs ~187px and a
     * half-width track at 390px is ~166px, so a nowrap label would be pushed
     * out of its own chip. One column is the honest answer — every chip
     * identical, nothing clipped, and it matches the bonus-type block above it,
     * which is already a single column at this width.
     *
     * A plain block comment, not `{/* … *\/}`: a JSX expression container
     * cannot sit where the returned element goes.
     */
      /* On a phone the one-column stack can be folded away — see MobileCollapse. */
      <MobileCollapse
        label={COPY.collapse.casinoCategories}
        count={categories.length}
        className="min-h-[46px] rounded-full border border-line bg-paper text-[15px] font-semibold text-ink transition-colors hover:border-ink"
        countClassName="text-[12.5px] font-bold text-muted"
        actionClassName="text-brand font-semibold"
      >
      <nav aria-label="Casino categories" className={`grid grid-cols-1 gap-2 sm:w-max sm:grid-cols-[repeat(2,1fr)] md:grid-cols-[repeat(3,1fr)] lg:grid-cols-[repeat(4,1fr)] xl:grid-cols-[repeat(5,1fr)] sm:gap-2.5 ${oneRow ? 'xl:flex xl:w-auto xl:flex-wrap xl:gap-2' : ''}`}>
      {categories.map((c) => {
        const active = c.slug === selected
        return (
          <Link
            key={c.id}
            /*
             * ALWAYS the canonical category route.
             *
             * The home page used to take the query form `/?category=<slug>` and
             * filter in place; `site-template` linked `/casinos?category=<slug>`,
             * which went through a redirect. Both are now 301'd to this very URL
             * at the edge (lib/seo/redirects.ts), so emitting either would mean
             * linking a redirect — one wasted hop per visitor, and, multiplied by
             * the number of categories, a page's worth of crawl budget spent on
             * URLs that resolve elsewhere. It is also what Search Console
             * reported as "Alternate page with proper canonical tag": the home
             * page existed once per category, each copy canonical-tagged at `/`.
             *
             * The chips therefore NAVIGATE rather than filter in place. The
             * destination renders the same list from the same endpoint, under a
             * URL that can be linked, shared and indexed.
             */
            href={`/categories/${c.slug}`}
            aria-current={active ? 'page' : undefined}
            // BOTH states carry a border, the active one in its own fill
            // colour. Dropping the border on the active tab instead would make
            // it 2px shorter than its neighbours — invisible while the tabs
            // share a row and are stretched to match, obvious the moment they
            // wrap to one per row.
            className={`${oneRow ? 'xl:flex-1 xl:basis-0 xl:px-2.5 xl:text-sm' : ''} flex w-full justify-center whitespace-nowrap min-h-[46px] items-center gap-2 rounded-full border px-[18px] text-[15px] font-semibold transition-colors ${
              active
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-paper text-ink hover:border-ink'
            }`}
          >
            {/* The category's own icon, the one the Casinos menu shows beside it.
                A plain <img>: next/image refuses SVG, and an icon gains nothing
                from resizing. alt="" because the label already names it. */}
            {c.logo_path && (
              <img src={resolveImageUrl(c.logo_path)!} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0" />
            )}
            {c.name}
            {typeof c.casinos_count === 'number' && (
              /* The count is what makes a tab worth pressing before it is
                 pressed. On the ink ground it takes the pale terracotta rather
                 than white, so it stays subordinate to the label instead of
                 competing with it. */
              <span
                className={`text-[12.5px] font-bold tabular-nums ${
                  active ? 'text-night-accent' : 'text-muted'
                }`}
              >
                {c.casinos_count}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
    </MobileCollapse>
  )
}
