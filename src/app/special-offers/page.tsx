import type { Metadata } from 'next'
import { getSpecialOffers } from '@/lib/api'
import { buildWebPageSchema, jsonLdScript, SHARE_IMAGES } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import SpecialOfferCard, { OFFER_GRID } from '@/components/SpecialOfferCard'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY.specialOffers.pageTitle,
    description: COPY.specialOffers.pageDescription,
    alternates: { canonical: `/special-offers` },
    openGraph: { type: 'website', url: `/special-offers`, siteName: SITE_NAME, title: COPY.specialOffers.pageTitle, description: COPY.specialOffers.pageDescription, images: SHARE_IMAGES },
  }
}

export default async function SpecialOffersPage() {
  const res = await getSpecialOffers()
  const offers = res.data

  // These listing pages carried no structured data at all. A WebPage node
  // anchors them into the site graph so they are not read as orphans.
  const webPage = buildWebPageSchema({
    name: COPY.specialOffers.pageTitle,
    url: `${SITE_URL}/special-offers`,
    description: COPY.specialOffers.pageDescription,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(webPage) }} />
      <main className="pb-12 pt-6 sm:pb-16 sm:pt-10">
      <div className="mx-auto max-w-[1200px] px-4">
        <header className="mb-4 sm:mb-8">
          <h1 className="font-display text-[clamp(26px,8.5vw,32px)] font-extrabold leading-none text-ink [overflow-wrap:break-word] sm:text-[clamp(32px,4.6vw,56px)]">{COPY.specialOffers.pageTitle}</h1>
          <p className="mt-1 max-w-[680px] text-[15px] text-ink-soft sm:mt-2 sm:text-[17px]">{COPY.specialOffers.pageDescription}</p>
        </header>
        {offers.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line bg-paper p-10 text-center text-muted">{COPY.specialOffers.noResults}</p>
        ) : (
          <div className={OFFER_GRID}>
            {offers.map((offer) => <SpecialOfferCard key={offer.id} offer={offer} />)}
          </div>
        )}
      </div>
      </main>
    </>
  )
}
