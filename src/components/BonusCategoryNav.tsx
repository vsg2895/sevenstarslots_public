import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import type { BonusSection } from '@/lib/api'

/**
 * The catch-all heading, which this row deliberately leaves out.
 *
 * Every offer not filed under a real type lands under "Special Offers", so it
 * is not a type at all — it is the whole area, already reachable from the nav
 * and the offers page. Hidden here rather than in the admin: the admin's
 * "Shown" switch would also remove it from the menu and the sections.
 */
const CATCH_ALL_SLUG = 'special-offers'

/**
 * "Bonus Types On The Board", from sites/sevenstarslots-redesign.html: one
 * medallion per type — a dashed ring around a disc carrying the number of
 * offers, the type's name underneath. Hover solidifies the ring in gold and
 * turns it like a coin (`.md` / `.md-ring` in globals.css). Each one opens that
 * type's own page.
 *
 * The counts are the SITE's — active, claimable, owned by a casino attached
 * here — resolved server-side, so a medallion never promises more than its page
 * has. Renders nothing when the site has no Bonus area or every type is empty.
 */
export default function BonusCategoryNav({ sections }: { sections: BonusSection[] }) {
  const types = sections.filter((section) => section.slug !== CATCH_ALL_SLUG)
  if (types.length === 0) return null

  return (
    <nav aria-labelledby="bonus-types-heading">
      <h2 id="bonus-types-heading" className="font-display text-[30px] font-extrabold leading-none text-ink sm:text-[clamp(30px,4.2vw,52px)]">
        {COPY.home.bonusTypesTitle}
      </h2>
      <ul className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" role="list">
        {types.map((section) => (
          <li key={section.id}>
            <Link href={`/bonuses/${section.slug}`} className="md group flex flex-col items-center gap-3 rounded-xl text-center text-ink">
              <span className="md-ring relative flex aspect-square w-full max-w-[132px] flex-col items-center justify-center gap-1.5 rounded-full border-2 border-dashed border-line-soft">
                {/* The type's own icon, as in the Bonus menu. A plain <img>: next/image
                    refuses SVG. alt="" because the label names it. */}
                {section.icon_path && (
                  <img src={resolveImageUrl(section.icon_path)!} alt="" width={28} height={28} className="relative h-7 w-7" />
                )}
                <span className="relative font-display text-[40px] font-extrabold leading-none text-brand">
                  {section.offers_count}
                  <span className="sr-only"> {section.offers_count === 1 ? COPY.bonusCategory.countOne : COPY.bonusCategory.countMany}</span>
                </span>
              </span>
              <span className="text-[15px] font-bold">{section.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
