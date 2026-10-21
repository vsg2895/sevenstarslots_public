import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Manrope, Unbounded } from 'next/font/google'
import Link from 'next/link'
import NewsletterForm from '@/components/NewsletterForm'
import SocialIcons from '@/components/SocialIcons'
import CookieConsent from '@/components/CookieConsent'
import ToastProvider from '@/components/ToastProvider'
import CookieSettingsButton from '@/components/CookieSettingsButton'
import Logo from '@/components/Logo'
import { getSocialLinks, hasSpecialOffers } from '@/lib/api'
import { buildOrganizationSchema, buildWebSiteSchema, jsonLdScript } from '@/lib/seo'
import { SITE_URL } from '@/lib/config'
import { COPY } from '@/constants/copy'
import { LEGAL_PAGES } from '@/constants/legalPages'
import type { SocialLink } from '@shared/types/socialLink'
import './globals.css'

const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] })
// Unbounded is a display face and is used at three weights only — 500 for
// card headings, 700 for section headings, 800 for the numerals and the
// wordmark. It has no 400: asking for one silently falls back and the
// headings come out heavier than intended.
const unbounded = Unbounded({ variable: '--font-unbounded', subsets: ['latin'], weight: ['500', '700', '800'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

/**
 * Subscribe capture: every entry point on this site — the newsletter form and,
 * where the site has one, the timed subscribe modal.
 *
 * The components, the /api/newsletter route and the backend double-opt-in flow
 * are never touched by this; it only decides whether they are rendered. That is
 * the point of a flag rather than deleted markup: turning capture off and back
 * on is one edit, and nothing has to be rebuilt from memory.
 */
const SUBSCRIBE_ENABLED = true

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'SevenStarSlots'

// Both strings live in COPY so this site's wording is defined in exactly one
// place — the same place the page-level titles and descriptions come from.
// The previous SITE_DESCRIPTION here was byte-identical to a sibling domain's,
// which made this site's default meta/og/twitter description duplicate content
// on every page that falls back to it.
const SITE_TITLE = `${SITE_NAME} — ${COPY.site.titleTail}`
const SITE_DESCRIPTION = `${SITE_NAME} ${COPY.site.description}`

export const metadata: Metadata = {
  // THE origin every relative canonical and og:url in the app resolves
  // against. `SITE_URL` is validated at module load (see lib/config), so the
  // old `|| 'https://…'` literal is gone: a second hardcoded host here is
  // exactly how the canonical and the sitemap drifted onto different hosts.
  metadataBase: new URL(SITE_URL),
  // Root default. Every page overrides it with its own path, so each URL
  // gets a SELF-referencing canonical rather than inheriting the homepage's.
  alternates: { canonical: '/' },
  title: {
    // Home & inner pages set their own; this is the SEO-friendly fallback title.
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Terms that describe what THIS site publishes. The generic set that was
  // here was shared with a sibling domain and described neither in particular.
  keywords: [...COPY.site.keywords, SITE_NAME],
  // Tab icon.
  //
  // This used to offer ONLY icon.svg. Browsers that do not take an SVG favicon
  // — Safari most visibly — then had nothing to fall back to, because
  // /favicon.ico 404'd, so they showed a placeholder or a stale cached icon
  // instead of this site's own mark. app/favicon.ico now holds 16/32/48 rasters
  // cut from that same artwork, and Next links it automatically from the file
  // convention, so it is deliberately NOT repeated here.
  //
  // `apple` DOES have to be listed: an explicit icons object suppresses the
  // apple-icon file convention, so app/apple-icon.tsx was generating a 180x180
  // PNG at /apple-icon that no page ever linked to.
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // Relative on purpose: Next resolves it against metadataBase, so og:url
    // and the canonical can never disagree about the host.
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: SITE_TITLE, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // Search-engine ownership verification, supplied per environment. Absent env
  // vars simply produce no tag, so nothing has to be committed to the repo.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    other: {
      ...(process.env.NEXT_PUBLIC_BING_VERIFICATION
        ? { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_VERIFICATION }
        : {}),
      ...(process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION
        ? { 'p:domain_verify': process.env.NEXT_PUBLIC_PINTEREST_VERIFICATION }
        : {}),
    },
  },
}

/**
 * Viewport + theme colour.
 *
 * Next 14 moved these out of `metadata` into their own export; leaving
 * themeColor in `metadata` is silently ignored, which is why the sites had no
 * theme-color at all. `viewport-fit=cover` is deliberately omitted — nothing
 * here draws into the notch area.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e9b649',
}

/**
 * The eleven legal pages, dealt into two footer columns.
 *
 * Computed from LEGAL_PAGES rather than written out, so adding a twelfth page
 * in one place puts it in the footer, the sitemap and generateStaticParams at
 * once. The first column takes the ceiling, so an odd count leaves the longer
 * list on the left where the heading above it is also longer.
 */
const LEGAL_SPLIT = Math.ceil(LEGAL_PAGES.length / 2)
const LEGAL_COLUMNS = [LEGAL_PAGES.slice(0, LEGAL_SPLIT), LEGAL_PAGES.slice(LEGAL_SPLIT)]

const NAV_LINKS = [
  { href: '/casinos', label: COPY.nav.casinos },
  { href: '/special-offers', label: COPY.nav.specialOffers },
  { href: '/categories', label: COPY.nav.categories },
]

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let socialLinks: SocialLink[] = []
  try {
    socialLinks = (await getSocialLinks()).data
  } catch {
    socialLinks = []
  }

  // "Special Offers" only earns its slot in the nav when this site actually has
  // a visible offer to show; with none, the link would lead to an empty page,
  // so both the header and the footer drop it.
  const showSpecialOffers = await hasSpecialOffers()
  const navLinks = NAV_LINKS.filter(({ href }) => href !== '/special-offers' || showSpecialOffers)

  // Site-wide structured data, rendered once here so every page carries it.
  // Next.js manages the document <head> (manual <head> tags in a root layout are
  // discouraged), so per the framework's JSON-LD guide the <script> is rendered
  // in the layout body — crawlers read JSON-LD from anywhere in the document.
  // The `<` escaping keeps the payload XSS-safe.
  //
  // Two nodes, cross-referenced by @id: the publisher (Organization) and the
  // site (WebSite). socialLinks is already fetched above for the footer, so
  // `sameAs` costs no extra request.
  const siteGraph = [buildOrganizationSchema(socialLinks), buildWebSiteSchema()]

  return (
    <html lang="en" className={`${manrope.variable} ${unbounded.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <ToastProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdScript(siteGraph),
          }}
        />
        {/* Header — 72px tall, translucent over the warm ground.

            The nav is a horizontally scrollable row rather than the mockup's
            burger. Three links fit on a phone, and a burger would put the
            site's whole navigation behind a tap to save space it does not need
            to save; the row keeps every destination visible and needs no
            client-side JavaScript to open. */}
        <header className="sticky top-0 z-40 border-b border-line bg-cream/90 backdrop-blur-xl">
          <div className="container mx-auto flex h-[72px] max-w-[1160px] items-center justify-between gap-4 px-5">
            <Logo />
            <nav aria-label="Main navigation" className="no-scrollbar -mr-5 min-w-0 overflow-x-auto pr-5">
              <ul className="flex items-center gap-1 sm:gap-2" role="list">
                {navLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 py-2 text-[15px] font-semibold text-ink transition-colors hover:bg-brand/10 hover:text-brand sm:px-4"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>

        {/* Newsletter strip — rendered while SUBSCRIBE_ENABLED is true.

            On white rather than on the page's cream, which is what separates it
            from the hero immediately below without needing a second rule. */}
        {SUBSCRIBE_ENABLED && (
          <section className="border-b border-line bg-paper" aria-label="Newsletter">
            <div className="container mx-auto max-w-[1160px] px-5 py-[22px]">
              <NewsletterForm />
            </div>
          </section>
        )}

        <div className="flex-1">{children}</div>

        {/* Footer — the ink ground, the one place on the site that inverts.

            Four tracks on desktop (brand · Explore · Legal · Responsible play),
            collapsing to two on tablets and one on phones, as the mockup does.
            The brand column takes 1.6fr so its blurb has a readable measure
            while the three link columns stay narrow. */}
        {/* The footer sits on its OWN ground, deeper than the page — the
            mockup's `--footer`, with a hairline rule separating the two.

            NOT `bg-ink`, which is what this markup said when it was cloned
            from the light sibling. There `ink` was a dark navy and the class
            produced a dark footer; here `ink` is warm cream, so the same class
            rendered a cream slab carrying cream text. That one token is the
            whole difference between cloning a dark site and a light one. */}
        <footer className="mt-auto border-t border-line bg-[#0a1f1c] text-night-ink">
          <div className="container mx-auto max-w-[1160px] px-5 pb-7 pt-14">
            <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
              <div>
                {/* The Logo component itself, in its dark-ground variant, so the
                    mark and wordmark here can never drift from the header's —
                    the previous footer carried a hand-built copy, which is how
                    it kept the old brand after the site was re-themed. */}
                <Logo onDark />
                <p className="mt-4 max-w-[360px] text-[14.5px] leading-relaxed text-night-muted">
                  {COPY.footer.tagline}
                </p>
                {socialLinks.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-night-accent">
                      Follow us
                    </p>
                    <SocialIcons links={socialLinks} onDark />
                  </div>
                )}
              </div>

              <div>
                <p className="font-display mb-3.5 text-base font-bold text-white">Explore</p>
                <ul className="flex flex-col gap-1">
                  {navLinks.map(({ href, label }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="inline-block -mx-1 -my-1 px-1 py-2 text-[14.5px] text-night-ink transition-colors hover:text-ink"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* The eleven legal pages, split across two columns so neither
                  runs to eleven rows against a four-row Explore list. `split`
                  is computed rather than hardcoded: the array is shared with
                  the sitemap and `generateStaticParams`, and a hand-written
                  index would silently drop a page the day one is added. */}
              {LEGAL_COLUMNS.map((column, i) => (
                <nav key={i} aria-label={i === 0 ? 'Legal' : 'Policies'}>
                  <p className="font-display mb-3.5 text-base font-bold text-white">
                    {i === 0 ? 'Company' : 'Legal'}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {column.map(({ slug, label }) => (
                      <li key={slug}>
                        <Link
                          href={`/${slug}`}
                          className="inline-block -mx-1 -my-1 px-1 py-2 text-[14.5px] text-night-ink transition-colors hover:text-ink"
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              ))}
            </div>

            {/* The legal bar. The circled 18+ reads as a mark rather than as
                another line of grey type — on a page of bonus figures that is
                the one piece of small print that has to be seen. */}
            <div className="mt-10 flex flex-col gap-4 border-t border-night-line pt-5 text-[13.5px] text-night-muted sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border-2 border-accent text-xs font-extrabold text-accent"
                >
                  18+
                </span>
                <span>
                  Gamble responsibly. Help:{' '}
                  <a
                    href="https://www.begambleaware.org"
                    target="_blank"
                    rel="noopener nofollow"
                    className="underline decoration-line-soft underline-offset-2 transition-colors hover:text-ink"
                  >
                    BeGambleAware.org
                  </a>
                </span>
              </p>
              <div className="sm:text-right">
                <p>
                  © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
                </p>
                {/* Postal address on its own line under the copyright: it stays
                    legible on a phone, where the two would otherwise wrap into
                    one another. `address` is the correct element semantically;
                    `not-italic` is load-bearing, because Preflight does not
                    reset it and the browser default for the tag is italic. */}
                <address className="mt-1 not-italic">{COPY.footer.postalAddress}</address>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-night-faint">
              <p className="max-w-[760px]">{COPY.footer.disclaimer}</p>
              <CookieSettingsButton onDark />
            </div>
          </div>
        </footer>

        <CookieConsent />
        </ToastProvider>
      </body>
    </html>
  )
}
