import Link from 'next/link'

/**
 * SevenStarSlots brand mark: a near-black tile holding a seven-pointed gold
 * star, with a stylised "7" cut out of its centre. Beside it the wordmark and a
 * small-caps tagline. Taken from sites/sevenstarslots.html.
 *
 * SEVEN points, counted — not a generic five-pointed star rotated. The whole
 * brand is "one star per check, seven checks", so a five-pointed star in the
 * logo would contradict the thing the site is named after. The path below is
 * the mockup's, and its vertices are at 360/7° intervals.
 *
 * Inlined SVG rather than an image: it renders instantly with no extra request,
 * stays crisp at any size, and takes its colours from the theme tokens, so a
 * palette change here is a palette change everywhere. The Link carries the
 * accessible name; the artwork is aria-hidden to avoid a duplicate
 * announcement.
 *
 * `onDark` exists for the footer. Unlike the light sibling this component was
 * cloned from, the mark needs NO inversion — the site is dark and the footer is
 * merely deeper, so the tile reads correctly on both. Only the tagline shifts,
 * because the footer ground is darker than the page and `faint` loses contrast
 * on it. The prop is kept rather than dropped so the footer markup stays
 * identical across the network.
 */
export default function Logo({
  className = '',
  onDark = false,
}: {
  className?: string
  onDark?: boolean
}) {
  return (
    <Link
      href="/"
      aria-label="SevenStarSlots home"
      className={`inline-flex min-h-11 shrink-0 items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
        onDark ? 'focus-visible:ring-offset-[#0a1f1c]' : 'focus-visible:ring-offset-cream'
      } ${className}`.trim()}
    >
      <svg
        viewBox="0 0 42 42"
        className="h-9 w-9 shrink-0 sm:h-[42px] sm:w-[42px]"
        aria-hidden="true"
        focusable="false"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="42" height="42" rx="11" fill="#0a1f1c" />
        {/* A hairline inset frame, at the mockup's 45% opacity — it keeps the
            tile from reading as a flat block on the near-black footer. */}
        <rect
          x="4"
          y="4"
          width="34"
          height="34"
          rx="8"
          fill="none"
          stroke="var(--color-brand)"
          strokeWidth="1.2"
          opacity="0.45"
        />
        <path
          d="M21.00 6.60L24.56 14.21L32.73 12.25L28.99 19.78L35.62 24.94L27.41 26.71L27.51 35.11L21.00 29.80L14.49 35.11L14.59 26.71L6.38 24.94L13.01 19.78L9.27 12.25L17.44 14.21Z"
          fill="var(--color-brand)"
        />
        {/* The 7, drawn as a stroke so it keeps its weight at any size and
            stays a clean cut-out of the star rather than a glyph sitting on
            top of it. */}
        <path
          d="M16.6 16.4h9.2l-5 10.4"
          fill="none"
          stroke="#0a1f1c"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="flex flex-col leading-none">
        <span className="font-display text-[18px] font-bold tracking-[-0.02em] text-ink sm:text-[20px]">
          SevenStar<span className="text-brand">Slots</span>
        </span>
        <span
          className={`mt-[5px] text-[9px] font-semibold uppercase tracking-[0.2em] ${
            onDark ? 'text-night-muted' : 'text-muted'
          }`}
        >
          Seven-point slot ratings
        </span>
      </span>
    </Link>
  )
}
