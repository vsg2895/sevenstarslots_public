'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { resolveImageUrl } from '@/lib/images'
import { COPY } from '@/constants/copy'
import type { SpecialOffer } from '@shared/types/specialOffer'

const PER_PAGE = 4

/**
 * A casino's attached special offers, shown 4 at a time with the total count —
 * the mockup's "Bonuses At This Casino": offer tiles (`.ofr`) with the
 * casino's logo, the bonus type, the offer and its amount. When there are more
 * than 4, client-side pagination pages through them (the offers already arrive
 * with the casino, so no extra fetch is needed).
 *
 * `logo` is the casino's own: the offers listed here arrive without their
 * casino attached, and every one of them is this casino's.
 */
export default function CasinoSpecialOffers({ offers, logo }: { offers: SpecialOffer[]; logo?: string | null }) {
  const [page, setPage] = useState(0)

  // The API may serialize an empty relation as {} rather than []; guard for it
  // so a casino with no offers doesn't crash (offers.slice is not a function).
  const list = Array.isArray(offers) ? offers : []
  const total = list.length
  if (total === 0) return null

  const pageCount = Math.ceil(total / PER_PAGE)
  const start = page * PER_PAGE
  const visible = list.slice(start, start + PER_PAGE)

  return (
    <section className="mt-11">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <h2 className="min-w-0 font-display text-[26px] font-extrabold leading-tight text-ink sm:text-[clamp(26px,3vw,36px)]">
          {COPY.casinos.offersHeading} <span className="font-sans text-lg font-semibold text-faint">({total})</span>
        </h2>
        {pageCount > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous offers"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[1.5px] border-line-soft text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line-soft disabled:hover:text-ink"
            >
              ←
            </button>
            {/* `whitespace-nowrap`, and it is load-bearing: in a flex row next
                to a heading this is three tokens ("1", "/", "2"), and a long
                heading squeezed it into three stacked lines between the two
                arrows. The counter is one word, so it is told to behave like
                one. */}
            <span className="whitespace-nowrap text-sm tabular-nums text-muted">{page + 1} / {pageCount}</span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              aria-label="More offers"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[1.5px] border-line-soft text-ink transition-colors hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-line-soft disabled:hover:text-ink"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-3">
        {visible.map((offer) => {
          const thumb = logo ?? resolveImageUrl(offer.image_path ?? offer.banner_image)
          return (
            <Link
              key={offer.id}
              href={`/special-offers/${offer.slug}`}
              className="ofr flex flex-col gap-1.5 rounded-2xl border border-line bg-surface p-4 text-ink"
            >
              <span className="flex items-center gap-2.5">
                <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white p-1.5">
                  {thumb && <Image src={thumb} alt="" width={112} height={112} sizes="56px" className="h-full w-full object-contain" />}
                </span>
                <span className="min-w-0">
                  {/* The bonus TYPE, as the editor named it. Only when filed under one. */}
                  {offer.bonus_category_name && (
                    <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{offer.bonus_category_name}</span>
                  )}
                  <span className="block text-base font-bold leading-[1.25] [overflow-wrap:anywhere]">{offer.title}</span>
                </span>
              </span>
              {offer.bonuses && <span className="mt-1 block text-[15px] font-bold leading-[1.3] text-brand-dark">{offer.bonuses}</span>}
              <span className="mt-auto pt-2 text-sm font-bold text-brand">View offer →</span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
