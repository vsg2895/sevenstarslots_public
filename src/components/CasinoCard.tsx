import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import type { CasinoWithAttachment } from '@shared/types/casino'

/** How many region chips a card shows before collapsing the rest into a count. */
const REGIONS_SHOWN = 3

function Stars({ rating }: { rating: number }) {
  // `Math.round` rather than a partial star: the ratings are whole or half
  // numbers and a half-filled glyph at 18px reads as a rendering fault. The
  // exact figure is printed beside it either way.
  const filled = Math.round(rating)

  return (
    <span
      className="inline-flex items-center tracking-[2px] text-[15px] leading-none"
      role="img"
      aria-label={`${rating} out of 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < filled ? 'text-gold' : 'text-line-soft'} aria-hidden>
          ★
        </span>
      ))}
    </span>
  )
}

/**
 * The list the cards sit in: two across from `lg`, one column below — the
 * mockup's `.cards`. Callers render `<ol className={CASINO_GRID}>`; the order of
 * the list is the ranking.
 */
export const CASINO_GRID = 'grid grid-cols-1 gap-[22px] lg:grid-cols-2'

/**
 * A casino as a framed playing card — `.pc` in sites/sevenstarslots-redesign.html:
 * an outer card and an inner frame, the logo on a white plate beside the name,
 * the rating, the regions it accepts, the bonus in pale gold and the two
 * actions. On hover or keyboard focus the card lifts and its edges turn gold.
 *
 * NO RANK NUMBER. The mockup pins a numbered star to each logo; the network
 * rule is that no casino card shows a rank — the `<ol>` order is the ranking.
 * `rank` is still accepted so callers did not have to change.
 *
 * The chips carry `countries` — real, attached per casino. Nothing on this card
 * is invented: no payout time, no seven-point score (see the note in copy.ts).
 */
export default function CasinoCard({
  casino,
}: {
  casino: CasinoWithAttachment
  rank?: number
}) {
  // The casino's "Image" (logo), NOT the wide "Banner Image" used big on the
  // casino page. Falls back to the banner if there is no Image.
  const image = resolveImageUrl(casino.image_path ?? casino.banner_image)

  const regions = casino.countries ?? []
  const shownRegions = regions.slice(0, REGIONS_SHOWN)
  const extraRegions = regions.length - shownRegions.length

  return (
    <li className="pc relative rounded-3xl border border-line bg-paper p-2.5">
      <div className="pc-in grid h-full grid-cols-1 gap-[18px] rounded-[18px] border border-line p-5 sm:grid-cols-[128px_minmax(0,1fr)]">
        {/* The logo plate. WHITE, not a theme token: operator logos arrive with
            their own white ground baked in, so a white plate lets that ground
            merge with it. The image fills the plate (contained), so a small
            logo file is never drawn smaller than its box. With no artwork the
            operator's NAME fills the plate instead. */}
        <div className="flex h-[76px] w-[112px] items-center justify-center self-start overflow-hidden rounded-[14px] bg-white p-2 sm:h-[88px] sm:w-[128px]">
          {image ? (
            <Image
              src={image}
              alt={`${casino.name} logo`}
              width={256}
              height={176}
              sizes="128px"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-center text-[15px] font-extrabold leading-tight text-cream [overflow-wrap:anywhere]">
              {casino.name}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2.5">
          <h3 className="font-display text-[clamp(20px,6.4vw,24px)] font-extrabold leading-[1.05] text-ink [overflow-wrap:anywhere] sm:text-[26px]">
            {casino.name}
          </h3>

          <div className="flex flex-wrap items-center gap-2.5 text-[13px] font-semibold text-ink-soft">
            <span className="inline-flex items-center gap-1.5">
              <Stars rating={casino.rating} />
              <span className="tabular-nums">{casino.rating.toFixed(1)}</span>
            </span>
            {shownRegions.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Accepts players from">
                {shownRegions.map((country) => (
                  <li
                    key={country.id}
                    className="inline-flex items-center rounded-full bg-win-bg px-2.5 py-[3px] text-win"
                  >
                    {country.name}
                  </li>
                ))}
                {extraRegions > 0 && (
                  /* A count, not a tooltip: the full list is on the review
                     page, and a hover affordance is invisible on a phone. */
                  <li className="inline-flex items-center rounded-full bg-surface px-2.5 py-[3px] text-ink-soft">
                    +{extraRegions} more
                  </li>
                )}
              </ul>
            )}
          </div>

          {casino.bonuses && (
            <p className="line-clamp-2 font-display text-[19px] font-bold leading-[1.25] text-brand-dark">
              {casino.bonuses}
            </p>
          )}

          <div className="mt-auto flex flex-wrap gap-2 pt-1">
            <a
              href={casino.attachment.affiliate_url}
              target="_blank"
              rel="nofollow sponsored noopener"
              className="btn-g min-h-11 flex-1 whitespace-nowrap px-3.5 text-sm"
            >
              {COPY.casinos.visitCasino}
            </a>
            <Link
              href={`/casinos/${casino.slug}`}
              className="btn-o min-h-11 flex-1 whitespace-nowrap px-3.5 text-sm"
            >
              {COPY.casinos.readReview}
            </Link>
          </div>
        </div>
      </div>
    </li>
  )
}
