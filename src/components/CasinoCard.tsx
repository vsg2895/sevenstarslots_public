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
      className="inline-flex items-center tracking-[2px] text-[18px] leading-none"
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
 * BetPulseHQ — the ranked row.
 *
 * Four columns on desktop: the rank numeral, the operator's logo at a size you
 * can actually recognise, the reading itself (name · rating · bonus · regions),
 * and the two actions. Taken from `.ccard` in sites/betpulsehq.html.
 *
 * ── Why a grid and not a flex row ───────────────────────────────────────────
 *
 * Because the logo column has to be the SAME WIDTH on every row. Operator logos
 * arrive at wildly different aspect ratios, and under `flex` each row sized its
 * own logo box to its own artwork — so a list of seven casinos had seven
 * different left edges on the text beside it. A grid track fixes the column
 * once for the whole list.
 *
 * ── What this card does NOT show ────────────────────────────────────────────
 *
 * The mockup gives each row an "Avg. payout time" chip and a pulse score out of
 * five. Neither has a column behind it on a site configured like this one, and
 * inventing a withdrawal time per operator would be the single most damaging
 * thing this page could do — it is the number a reader would act on. The chips
 * carry `countries` instead, which is real, attached per casino, and the same
 * fact the mockup's green chips were showing.
 */
export default function CasinoCard({
  casino,
  rank,
}: {
  casino: CasinoWithAttachment
  rank?: number
}) {
  // Card shows the casino's "Image" (logo), NOT the wide "Banner Image" (that's
  // used big on the single casino page). Falls back to the banner if no Image.
  const image = resolveImageUrl(casino.image_path ?? casino.banner_image)

  const regions = casino.countries ?? []
  const shownRegions = regions.slice(0, REGIONS_SHOWN)
  const extraRegions = regions.length - shownRegions.length

  return (
    <li
      className="
        grid items-center gap-x-5 gap-y-4 rounded-[14px] border border-line bg-paper p-[18px]
        transition-[box-shadow,border-color] duration-200
        hover:border-brand/50 hover:shadow-[0_18px_36px_-22px_rgba(0,0,0,0.6)]
        [grid-template-areas:'rank_logo''info_info''act_act'] [grid-template-columns:36px_1fr]
        md:gap-x-6 md:p-[22px] md:[grid-template-areas:'rank_logo_info''act_act_act'] md:[grid-template-columns:44px_140px_1fr]
        lg:[grid-template-areas:'rank_logo_info_act'] lg:[grid-template-columns:56px_180px_1fr_auto] lg:p-6
      "
    >
      {rank != null && (
        <span
          className="font-display self-center text-center text-[30px] font-extrabold leading-none tabular-nums text-brand [grid-area:rank] lg:text-[40px]"
          aria-label={`Rank ${rank}`}
        >
          {rank}
        </span>
      )}

      {/* The logo plate. Fixed height, contained artwork, so a tall logo and a
          wide one occupy the same box and the rows stay aligned. When there is
          no artwork the operator's NAME fills the plate — the mockup's own
          fallback, and far more use to a reader than an initial in a circle. */}
      <div className="flex h-[90px] items-center justify-center overflow-hidden rounded-xl border border-line bg-cream p-2.5 [grid-area:logo] lg:h-[110px]">
        {image ? (
          <Image
            src={image}
            alt={`${casino.name} logo`}
            width={360}
            height={220}
            sizes="180px"
            className="max-h-[70px] w-auto lg:max-h-[90px]"
            style={{ objectFit: 'contain' }}
          />
        ) : (
          <span className="font-display text-center text-[15px] font-extrabold leading-tight tracking-[-0.02em] text-ink [overflow-wrap:anywhere] lg:text-[19px]">
            {casino.name}
          </span>
        )}
      </div>

      <div className="min-w-0 [grid-area:info]">
        <h3 className="font-display text-[21px] font-bold leading-tight text-ink lg:text-[26px]">
          {casino.name}
        </h3>

        <div className="my-1.5 flex items-center gap-2">
          <Stars rating={casino.rating} />
          <span className="text-[15px] font-semibold text-muted tabular-nums">
            {casino.rating.toFixed(1)}
          </span>
        </div>

        {casino.bonuses && (
          <p className="line-clamp-2 text-[16px] font-bold text-brand lg:text-[17.5px]">
            {casino.bonuses}
          </p>
        )}

        {shownRegions.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {shownRegions.map((country) => (
              <li
                key={country.id}
                className="inline-flex items-center rounded-full bg-win-bg px-[11px] py-1 text-[13px] font-semibold text-win"
              >
                {country.name}
              </li>
            ))}
            {extraRegions > 0 && (
              /* A count, not a tooltip: the full list is on the review page,
                 and a hover affordance would be invisible on a phone. */
              <li className="inline-flex items-center rounded-full bg-surface px-[11px] py-1 text-[13px] font-semibold text-ink-soft">
                +{extraRegions} more
              </li>
            )}
          </ul>
        )}
      </div>

      {/* Actions. Stacked in their own column on a wide card, side by side when
          the card is mid-width, full width on a phone — so neither button ever
          has to wrap its label. */}
      <div className="grid gap-2.5 [grid-area:act] md:grid-cols-2 lg:min-w-[220px] lg:grid-cols-1">
        <a
          href={casino.attachment.affiliate_url}
          target="_blank"
          rel="nofollow sponsored noopener"
          className="inline-flex min-h-[46px] items-center justify-center rounded-xl bg-brand px-6 text-center text-[15px] font-bold text-brand-ink shadow-[0_8px_22px_-10px_rgba(233,182,73,0.8)] transition-all hover:-translate-y-px hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          {COPY.casinos.visitCasino}
        </a>
        <Link
          href={`/casinos/${casino.slug}`}
          className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-line bg-paper px-6 text-center text-[15px] font-bold text-ink transition-colors hover:border-brand hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {COPY.casinos.readReview}
        </Link>
      </div>
    </li>
  )
}
