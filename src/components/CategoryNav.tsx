import Link from 'next/link'
import type { Category } from '@shared/types/category'

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
  return (
    <nav aria-label="Casino categories" className="flex flex-wrap gap-2.5">
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
            className={`inline-flex min-h-[46px] items-center gap-2 rounded-full border px-[18px] text-[15px] font-semibold transition-colors ${
              active
                ? 'border-accent bg-accent text-accent-ink'
                : 'border-line bg-paper text-ink hover:border-ink'
            }`}
          >
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
  )
}
