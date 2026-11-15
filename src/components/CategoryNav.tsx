import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import type { Category } from '@shared/types/category'

/**
 * SevenStarSlots category filters, from sites/sevenstarslots-redesign.html
 * (`.fb`): bordered tiles with a hollow star, the current category with a gold
 * edge, a gold wash and a filled star (the ☆ / ★ come from `.fb` in
 * globals.css, keyed on `aria-current`). The casino count sits beside the label.
 *
 * On a phone the chips stack, one per row, each the full width of the column;
 * from sm they are one row of EQUAL chips — `w-max` + `1fr` columns, so every
 * track resolves to the widest label — scrolling sideways in its own track if
 * the row is wider than the page.
 *
 * The chips NAVIGATE rather than filter in place: always the canonical
 * /categories/<slug> route. The query forms (`/?category=`,
 * `/casinos?category=`) are 301'd to it at the edge (lib/seo/redirects.ts), so
 * linking either would spend a redirect per visitor and crawl budget on URLs
 * that resolve elsewhere.
 */
export default function CategoryNav({
  categories,
  selected,
}: {
  categories: Category[]
  selected: string
}) {
  return (
    <nav aria-label="Casino categories" className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-1">
      <ul className="grid grid-cols-1 gap-2 sm:w-max sm:auto-cols-[1fr] sm:grid-flow-col sm:grid-cols-none" role="list">
        {categories.map((c) => {
          const active = c.slug === selected
          return (
            <li key={c.id}>
              <Link
                href={`/categories/${c.slug}`}
                aria-current={active ? 'page' : undefined}
                className={`fb flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border-[1.5px] px-4 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-brand bg-brand-tint text-ink'
                    : 'border-line-soft text-ink-soft hover:border-brand hover:text-ink'
                }`}
              >
                {/* The category's own icon, as in the Casinos menu. A plain <img>:
                    next/image refuses SVG. alt="" because the label names it. */}
                {c.logo_path && (
                  <img src={resolveImageUrl(c.logo_path)!} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0" />
                )}
                {c.name}
                {typeof c.casinos_count === 'number' && (
                  <span className="text-xs text-muted">{c.casinos_count}</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
