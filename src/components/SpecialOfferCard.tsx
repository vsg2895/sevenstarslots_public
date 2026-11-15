import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import type { SpecialOffer } from '@shared/types/specialOffer'

/**
 * The bonus type whose cards carry a Claim button.
 *
 * WHY A TYPE AND NOT THE LINK. Claim used to appear on any offer that happened
 * to carry an affiliate URL, which made the card's primary action a property of
 * the data rather than an editorial decision: filing a bonus under "Free Spins"
 * or "Cashback" still produced a Claim button, because those offers have links
 * too. Claim now means one thing — this is a Special Offer — and whether the
 * offer has a link of its own no longer decides it.
 */
export const CLAIMABLE_BONUS_CATEGORY = 'special-offers'

/** The grid offer cards sit in — the mockup's `.og`: 3 / 2 / 1 across. */
export const OFFER_GRID = 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'

/** Up to two initials, for a casino with no logo artwork. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

/**
 * An offer tile, from sites/sevenstarslots-redesign.html (`.ofr`): the casino's
 * logo beside whose offer it is and the offer's name, the amount in pale gold,
 * the stars, then the actions. The whole tile opens the offer (the title link
 * is stretched over it); the buttons sit above that layer.
 *
 * `logo` lets a casino page pass its own logo: the offers it lists arrive
 * without their casino attached, and every one of them is that casino's.
 */
export default function SpecialOfferCard({ offer, logo: logoOverride }: { offer: SpecialOffer; logo?: string | null }) {
  const logo = logoOverride ?? resolveImageUrl(offer.casino?.image_path ?? offer.image_path)
  const casinoName = offer.casino?.name ?? ''

  // Claim is a property of the bonus TYPE, not of whether a link happens
  // to be filled in. See CLAIMABLE_BONUS_CATEGORY.
  const claimable = offer.bonus_category_slug === CLAIMABLE_BONUS_CATEGORY

  return (
    <article className="ofr relative flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white p-1.5 text-[13px] font-extrabold text-cream">
          {logo ? (
            <Image src={logo} alt="" width={112} height={112} sizes="56px" className="h-full w-full object-contain" />
          ) : (
            initials(casinoName || offer.title)
          )}
        </span>
        <div className="min-w-0">
          {/* WHOSE bonus this is, above its name: the first thing someone
              comparing offers needs. Omitted when the casino is not loaded. */}
          {casinoName && (
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{casinoName}</p>
          )}
          <h3 className="text-base font-bold leading-[1.25] text-ink [overflow-wrap:anywhere]">
            <Link href={`/special-offers/${offer.slug}`} className="after:absolute after:inset-0 after:rounded-2xl after:content-['']">
              {offer.title}
            </Link>
          </h3>
        </div>
      </div>
      {offer.bonuses && (
        <p className="mt-1 text-[15px] font-bold leading-[1.3] text-brand-dark">{offer.bonuses}</p>
      )}
      <span
        className="text-[13px] leading-none tracking-[1px] text-gold"
        role="img"
        aria-label={`${offer.rating} out of 5`}
      >
        {'★'.repeat(offer.rating)}
        <span className="text-line-soft" aria-hidden>
          {'★'.repeat(5 - offer.rating)}
        </span>
      </span>
      <div className="relative z-10 mt-auto flex gap-2 pt-2.5">
        {/*
          * Claim belongs to the Special Offers bonus type and to nothing else.
          *
          *   Special Offers + link   →  Details · Claim → the casino
          *   Special Offers, NO link →  Claim alone, leading to the offer's own
          *                              page, where the terms and the operator
          *                              are.
          *   any other bonus type    →  Details alone.
          */}
        {!(claimable && !offer.affiliate_url) && (
          <Link href={`/special-offers/${offer.slug}`} className="btn-o min-h-11 flex-1 px-3 text-sm">Details</Link>
        )}
        {claimable && (
          offer.affiliate_url ? (
            <a href={offer.affiliate_url} target="_blank" rel="nofollow sponsored noopener" className="btn-g min-h-11 flex-1 px-3 text-sm">Claim</a>
          ) : (
            // No affiliate URL of its own: the offer's page is the only place
            // that can lead to the operator. An internal link, so no sponsored rel.
            <Link href={`/special-offers/${offer.slug}`} className="btn-g min-h-11 flex-1 px-3 text-sm">Claim</Link>
          )
        )}
      </div>
    </article>
  )
}
