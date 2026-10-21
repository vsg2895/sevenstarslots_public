import type { Metadata } from 'next'
import Link from 'next/link'
import { getCategories } from '@/lib/api'
import { buildWebPageSchema, jsonLdScript } from '@/lib/seo'
import { COPY } from '@/constants/copy'
import { SITE_URL } from '@/lib/config'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: COPY.categories.pageTitle,
    description: COPY.categories.pageDescription,
    alternates: { canonical: `/categories` },
    openGraph: { type: 'website', url: `/categories`, siteName: SITE_NAME, title: COPY.categories.pageTitle, description: COPY.categories.pageDescription },
  }
}

export default async function CategoriesPage() {
  const res = await getCategories()
  const categories = res.data

  // These listing pages carried no structured data at all. A WebPage node
  // anchors them into the site graph so they are not read as orphans.
  const webPage = buildWebPageSchema({
    name: COPY.categories.pageTitle,
    url: `${SITE_URL}/categories`,
    description: COPY.categories.pageDescription,
  })

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(webPage) }} />
      <main className="px-5 pb-16 pt-10">
      <div className="mx-auto max-w-[1160px]">
        <header className="mb-8">
          <h1 className="font-display text-[34px] font-extrabold leading-[1.08] text-ink sm:text-[46px]">{COPY.categories.pageTitle}</h1>
          <p className="mt-2 max-w-[680px] text-[17px] text-ink-soft">{COPY.categories.pageDescription}</p>
        </header>
        {categories.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line bg-paper p-10 text-center text-muted">{COPY.categories.noResults}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className="block rounded-2xl border border-line bg-paper p-6 text-center font-semibold text-ink shadow-sm hover:border-brand hover:text-brand transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      </main>
    </>
  )
}
