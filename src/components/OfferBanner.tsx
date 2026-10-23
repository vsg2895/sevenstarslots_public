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
 * That ground is `/bonus-backdrop.webp`, the same file every site in the
 * network uses, so a bonus card reads the same wherever it is seen. It was a
 * CSS gradient here first — cheaper, and impossible to drift from the palette
 * — but a flat gradient leaves the letterbox bands as plain colour, and a grid
 * then reads as coloured boxes with pictures floating in them. The pattern
 * gives the bands something to be.
 *
 * The DETAIL page keeps the `.banner-wash` gradient, deliberately: there is no
 * set there for a banner to belong to, so the frame has no work to do and the
 * pattern would only compete with the single piece of artwork on the page.
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
      {/* ONE BACKDROP FOR EVERY BONUS, from `/bonus-backdrop.webp` — the same
          file the eight older sites use, so a bonus card reads the same across
          the network.

          This replaced a per-site gradient. The gradient was consistent too,
          but it left the letterbox bands either side of a contained banner as
          flat colour, and a grid of cards then read as a column of coloured
          boxes with pictures floating in them. The patterned ground gives the
          bands something to be, which turns the backdrop into the FRAME — the
          part that stays put — and leaves the artwork as the only thing that
          differs from card to card.

          A CSS background rather than a second <Image>: it is decoration, the
          same few KB on every card, and the browser fetches and decodes it once
          for the whole page instead of once per bonus.

          CARDS ONLY. The single-bonus page shows its banner on a plain ground —
          there is no set for it to belong to there, and the pattern would
          compete with the one piece of artwork that page exists to show. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-[url('/bonus-backdrop.webp')] bg-cover bg-center"
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
