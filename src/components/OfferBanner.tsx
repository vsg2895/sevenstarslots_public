import Image from 'next/image'

/**
 * A bonus banner shown WHOLE, on the backdrop every bonus block shares.
 *
 * Banner artwork arrives at whatever ratio the operator drew it at — most are
 * far wider than the boxes they land in here. `object-cover` cropped that
 * mismatch away, taking the edges off art meant to be read end to end, and the
 * browser's default `fill` stretched it instead, distorting the logo and the
 * figure on it. `object-contain` keeps the artwork intact, at the cost of
 * letterbox bands.
 *
 * ONE BACKDROP FOR EVERY BONUS, and on this site it is a GRADIENT rather than
 * an image. The bands were briefly filled with a blurred copy of each bonus's
 * own artwork, which made every card a different colour and a grid of them read
 * as a jumble; a single ground behind all of them turns the backdrop into the
 * frame — the part that stays put — and leaves the artwork as the only thing
 * that differs from card to card.
 *
 * Some siblings ship that ground as a .webp in `public/`. Here it is a CSS
 * gradient — `.banner-wash` in globals.css — for two reasons: it costs no
 * request and no bytes, and it cannot fall out of step with the palette, which
 * a hand-cut image would. It is the same ground the detail-page banner uses,
 * so a bonus's artwork sits on the same colour on the card it is listed in and
 * on the page it opens.
 *
 * Rendered even when a bonus has no artwork at all — and in that case
 * `fallbackText` is set on the ground instead, so the card carries the OFFER
 * rather than an empty dark rectangle. Roughly half the bonuses in the
 * catalogue have no banner, so this is the normal case, not the edge one.
 *
 * CARDS ONLY. The single-bonus page shows its banner on nothing — there is no
 * set for it to belong to there, and the gold ground would only compete with
 * the one piece of artwork the page exists to show.
 *
 * Drop it into any `relative overflow-hidden` box: the box owns the aspect
 * ratio, this owns what happens inside it.
 */
export default function OfferBanner({
  src,
  alt,
  sizes,
  priority = false,
  zoomOnHover = false,
  fallbackText = null,
}: {
  /** The bonus's own artwork. Absent leaves the shared backdrop on its own. */
  src?: string | null
  alt: string
  sizes: string
  priority?: boolean
  /** Card use: the artwork lifts on hover, the backdrop stays put. */
  zoomOnHover?: boolean
  /**
   * Shown on the ground when there is no artwork — the bonus figure, usually.
   * Omitted leaves the bare ground, which is right where the caller has
   * nothing worth setting (a banner slot on a page that already states the
   * bonus directly underneath).
   */
  fallbackText?: string | null
}) {
  return (
    <>
      {/* A CSS background rather than an <Image>: it is decoration, it is the
          same on every card, and a gradient costs nothing to fetch or decode. */}
      <span
        aria-hidden
        className="banner-wash absolute inset-0"
      />
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-contain object-center${zoomOnHover ? ' transition-transform duration-300 group-hover:scale-105' : ''}`}
        />
      ) : (
        fallbackText && (
          /* aria-hidden: the card states this same figure as real text a few
             lines down, and the link already carries the offer's name. This is
             the artwork's stand-in, not a second announcement. */
          <span
            aria-hidden
            className="font-display absolute inset-0 flex items-center p-6 text-[22px] font-extrabold leading-tight text-white"
          >
            {fallbackText}
          </span>
        )
      )}
    </>
  )
}
