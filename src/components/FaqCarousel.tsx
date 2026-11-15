'use client'

import { useRef } from 'react'

type Item = { readonly question: string; readonly answer: string }

/**
 * The home FAQ as a carousel, from sites/sevenstarslots-redesign.html
 * (`.carousel`): one card per question in a sideways-scrolling, snapping track,
 * with ← / → buttons that move it by one card.
 *
 * Server-rendered in full: every question and answer is in the initial HTML,
 * which the FAQPage schema requires — only the scrolling is client-side. The
 * track is focusable, so the arrow keys scroll it too.
 */
export default function FaqCarousel({ items, label, title }: { items: readonly Item[]; label: string; title: string }) {
  const track = useRef<HTMLDivElement>(null)

  const move = (dir: 1 | -1) => {
    const el = track.current
    const card = el?.querySelector<HTMLElement>('[data-card]')
    if (!el || !card) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: dir * (card.offsetWidth + 16), behavior: reduce ? 'auto' : 'smooth' })
  }

  const total = String(items.length).padStart(2, '0')
  const arrow = 'grid h-[46px] w-[46px] place-items-center rounded-xl border-[1.5px] border-line-soft text-lg text-ink transition-colors hover:border-brand hover:text-brand'

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">{label}</p>
          <h2 id="faq-heading" className="mt-2.5 font-display text-[30px] font-extrabold leading-none text-ink sm:text-[clamp(30px,4.2vw,52px)]">
            {title}
          </h2>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => move(-1)} aria-label="Previous question" className={arrow}>←</button>
          <button type="button" onClick={() => move(1)} aria-label="Next question" className={arrow}>→</button>
        </div>
      </div>
      <div
        ref={track}
        role="region"
        aria-label="Questions"
        tabIndex={0}
        className="mt-6 grid snap-x snap-mandatory auto-cols-[minmax(min(340px,86%),1fr)] grid-flow-col gap-4 overflow-x-auto rounded-[22px] pb-2.5 [scrollbar-width:thin]"
      >
        <dl className="contents">
          {items.map((item, i) => (
            <div key={item.question} data-card className="flex snap-start flex-col gap-3 rounded-[22px] border border-line bg-surface p-6 sm:p-[26px]">
              <span aria-hidden className="font-display text-sm font-extrabold text-brand">
                ✦ {String(i + 1).padStart(2, '0')} / {total}
              </span>
              <dt className="text-[19px] font-bold leading-[1.3] text-ink">{item.question}</dt>
              <dd className="text-[15px] leading-[1.7] text-ink-soft">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  )
}
