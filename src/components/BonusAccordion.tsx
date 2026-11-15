import Link from 'next/link'
import { COPY } from '@/constants/copy'
import SpecialOfferCard, { OFFER_GRID } from '@/components/SpecialOfferCard'
import OpenDetailsOnHash from '@/components/OpenDetailsOnHash'
import type { BonusSection } from '@/lib/api'

/**
 * The home page's Bonuses, from sites/sevenstarslots-redesign.html (`.acc`):
 * one accordion row per bonus type — its name and offer count — opening onto
 * that type's offer tiles and a link to its own page. The first is open.
 *
 * Native `<details>`, no client state: EVERY type's offers are in the server
 * HTML whether a panel is open or closed, so crawlers read all of them. Each
 * panel keeps the `#bonus-<slug>` anchor every site's home page exposes, and
 * OpenDetailsOnHash opens the one a link points at.
 */
export default function BonusAccordion({ sections }: { sections: BonusSection[] }) {
  if (sections.length === 0) return null

  return (
    <div className="acc mt-6 flex flex-col gap-2.5">
      <OpenDetailsOnHash />
      {sections.map((section, i) => (
        <details
          key={section.id}
          id={`bonus-${section.slug}`}
          open={i === 0}
          className="scroll-mt-24 overflow-hidden rounded-[18px] border border-line bg-paper open:border-line-soft"
        >
          <summary className="flex min-h-16 cursor-pointer items-center gap-3.5 px-4 py-4 sm:px-[22px] sm:py-[18px]">
            <h3 className="min-w-0 flex-1 font-display text-[clamp(16px,5.2vw,19px)] font-extrabold leading-tight text-ink [overflow-wrap:anywhere] sm:text-[22px]">
              {section.name}
            </h3>
            <span className="shrink-0 text-[13px] font-semibold text-muted">
              {section.offers_count} {section.offers_count === 1 ? COPY.bonusCategory.countOne : COPY.bonusCategory.countMany}
            </span>
          </summary>
          <div className="px-4 pb-4 sm:px-[22px] sm:pb-[22px]">
            {section.description && <p className="mb-4 text-sm text-ink-soft">{section.description}</p>}
            <div className={OFFER_GRID}>
              {section.offers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} />)}
            </div>
            <Link
              href={`/bonuses/${section.slug}`}
              aria-label={`${COPY.home.seeMore} — ${section.name}`}
              className="btn-o mt-4 min-h-11 px-5 text-sm"
            >
              {COPY.home.seeMore} →
            </Link>
          </div>
        </details>
      ))}
    </div>
  )
}
