import type { Metadata, Viewport } from 'next'
import { Geist_Mono, Manrope, Unbounded } from 'next/font/google'
import Link from 'next/link'
import NewsletterForm from '@/components/NewsletterForm'
import SocialIcons from '@/components/SocialIcons'
import CookieConsent from '@/components/CookieConsent'
import ToastProvider from '@/components/ToastProvider'
import CookieSettingsButton from '@/components/CookieSettingsButton'
import Logo from '@/components/Logo'
import { getSocialLinks, hasSpecialOffers, getCategories, getBonusArea } from '@/lib/api'
import { buildOrganizationSchema, buildWebSiteSchema, jsonLdScript } from '@/lib/seo'
import { SITE_URL } from '@/lib/config'
import { COPY } from '@/constants/copy'
import NavDropdown from '@/components/NavDropdown'
import FooterNavGroup from '@/components/FooterNavGroup'
import MobileNav from '@/components/MobileNav'
import { resolveImageUrl } from '@/lib/images'
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

const NAV_LINKS = [
  { href: '/casinos', label: COPY.nav.casinos },
  { href: '/special-offers', label: COPY.nav.specialOffers },
  { href: '/categories', label: COPY.nav.categories },
]

/** The header dropdown panel, in this site's own palette. */
const NAV_PANEL = {
  panelClassName: 'bg-paper ring-1 ring-line',
  itemClassName: 'text-ink-soft hover:bg-brand/10 hover:text-brand',
  allItemClassName: 'text-ink hover:bg-brand/10 hover:text-brand',
  arrowClassName: 'text-brand',
}

/** The phone menu (below `md`), in this site's own palette. */
const NAV_MOBILE = {
  triggerClassName: 'text-ink hover:bg-brand/10 hover:text-brand',
  panelClassName: 'bg-paper border-line',
  rowClassName: 'text-ink hover:bg-brand/10 hover:text-brand',
  rowExpandedClassName: 'bg-brand/10 text-brand',
  allClassName: 'text-ink hover:bg-brand/10 hover:text-brand',
  childClassName: 'text-ink-soft hover:bg-brand/10 hover:text-brand',
  guideClassName: 'border-line',
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  /*
   * Widened to `string` deliberately.
   *
   * COPY is `as const`, so this would otherwise carry the LITERAL type of
   * whatever address is written in copy.ts — and TypeScript then rejects
   * `!== ''` as a comparison that can never be true. The check is not
   * pointless: a freshly cloned site ships with this blank, and the footer has
   * to omit the whole <address> element rather than print an empty one.
   */
  const postalAddress: string = COPY.footer.postalAddress

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

  // Children for the Casinos and Bonuses entries, header and footer
  // alike. Each carries the icon its chip shows, resolved here on the server so
  // the client menus never need the storage URL. A failed fetch yields no
  // items, and the entry then stays the plain link it always was.
  const categoryMenuItems = await getCategories()
    .then((res) => res.data.map((c) => ({ slug: c.slug, name: c.name, icon: resolveImageUrl(c.logo_path) })))
    .catch(() => [])
  // Bonus types with at least one visible offer on this site (the API drops
  // empty ones). getBonusArea already falls back to [] on failure.
  const bonusMenuItems = (await getBonusArea()).map((section) => ({
    slug: section.slug,
    name: section.name,
    icon: resolveImageUrl(section.icon_path),
  }))

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
            <nav aria-label="Main navigation" className="hidden md:block no-scrollbar -mr-5 min-w-0 overflow-x-auto pr-5">
              <ul className="flex items-center gap-1 sm:gap-2" role="list">
                {navLinks.map(({ href, label }) =>
                  href === '/casinos' && categoryMenuItems.length > 0 ? (
                    <NavDropdown key={href} label={label} href={href} allLabel={COPY.nav.allCasinos} itemBasePath="/categories" items={categoryMenuItems} triggerClassName="flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 py-2 text-[15px] font-semibold text-ink transition-colors hover:bg-brand/10 hover:text-brand sm:px-4" {...NAV_PANEL} />
                  ) : href === '/special-offers' && bonusMenuItems.length > 0 ? (
                    <NavDropdown key={href} label={label} href={href} allLabel={COPY.nav.allOffers} itemBasePath="/bonuses" items={bonusMenuItems} triggerClassName="flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 py-2 text-[15px] font-semibold text-ink transition-colors hover:bg-brand/10 hover:text-brand sm:px-4" {...NAV_PANEL} />
                  ) : (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 py-2 text-[15px] font-semibold text-ink transition-colors hover:bg-brand/10 hover:text-brand sm:px-4"
                    >
                      {label}
                    </Link>
                  </li>
                ),
                )}
              </ul>
            </nav>
            {/* Below md the strip above is hidden and this menu replaces it. */}
            <MobileNav
              links={navLinks}
              groups={{
                '/casinos': { allLabel: COPY.nav.allCasinos, items: categoryMenuItems, itemBasePath: '/categories' },
                '/special-offers': { allLabel: COPY.nav.allOffers, items: bonusMenuItems, itemBasePath: '/bonuses' },
              }}
              theme={NAV_MOBILE}
            />
          </div>
        </header>

        {/* Newsletter strip — rendered while SUBSCRIBE_ENABLED is true.

            On white rather than on the page's cream, which is what separates it
            from the hero immediately below without needing a second rule. */}
        {SUBSCRIBE_ENABLED && (
          <section className="border-b border-line bg-paper" aria-label="Newsletter">
            <div className="container mx-auto max-w-[1160px] px-5 py-3.5 sm:py-[22px]">
              <NewsletterForm />
            </div>
          </section>
        )}

        <div className="flex-1">{children}</div>

        {/* Footer — partnerplaypro's structure: two columns, then the full
            legal row, then the legal bar.

            The GROUND and the token ramp stay this brand's own. Each of the
            three HTML briefs names its own `--footer`, and the two-column
            arrangement does not depend on the colour, so copying the layout
            costs the brands nothing.

            What this replaces: a four-track grid that split the eleven legal
            pages across two headed columns. On a phone those columns stacked
            into eleven rows under two headings, which made the footer taller
            than most of the content above it and pushed the Explore links out
            of reach. One wrapping row says the same thing in three. */}
        <footer className="mt-auto border-t border-line bg-[#0a1f1c] text-night-ink">
          <div className="container mx-auto max-w-[1160px] px-5 py-12">
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
              <div>
                {/* The Logo component itself, in its dark-ground variant, so
                    the mark and wordmark here can never drift from the
                    header's. */}
                <Logo onDark />
                <p className="mt-3 text-sm leading-relaxed text-night-muted">
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

              {/* On the right edge but LEFT-aligned, as on winpalack: right-aligning
                  started every label at a different x, so the column read as
                  ragged. `justify-self-end` sizes the column to its labels and
                  pushes it to the right of its grid track. */}
              <div className="sm:justify-self-end">
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-night-accent">
                  Explore
                </p>
                <ul className="flex flex-col gap-2">
                  {navLinks.map(({ href, label }) =>
                    href === '/casinos' && categoryMenuItems.length > 0 ? (
                      <FooterNavGroup key={href} label={label} href={href} allLabel={COPY.nav.allCasinos} itemBasePath="/categories" items={categoryMenuItems} linkClassName="inline-block -mx-1 -my-3 px-1 py-3 text-sm text-night-ink transition-colors hover:text-ink" guideClassName="border-night-line" />
                    ) : href === '/special-offers' && bonusMenuItems.length > 0 ? (
                      <FooterNavGroup key={href} label={label} href={href} allLabel={COPY.nav.allOffers} itemBasePath="/bonuses" items={bonusMenuItems} linkClassName="inline-block -mx-1 -my-3 px-1 py-3 text-sm text-night-ink transition-colors hover:text-ink" guideClassName="border-night-line" />
                    ) : (
                    <li key={href}>
                      <Link
                        href={href}
                        className="inline-block -mx-1 -my-3 px-1 py-3 text-sm text-night-ink transition-colors hover:text-ink"
                      >
                        {label}
                      </Link>
                    </li>
                  ),
                  )}
                </ul>
              </div>
            </div>

            {/* All eleven legal pages in ONE wrapping row. The 44px tap target
                comes from the padding; the negative margins cancel it so the
                rows still sit tight together. */}
            {/* Two even columns on a phone, so every link starts on one of two
                shared edges; wrapped as a paragraph, no two rows lined up. */}
            <nav aria-label="Legal" className="mt-10 border-t border-night-line pt-6">
              <ul className="grid grid-cols-2 gap-x-5 gap-y-3 sm:flex sm:flex-wrap sm:gap-y-2">
                {LEGAL_PAGES.map(({ slug, label }) => (
                  <li key={slug}>
                    <Link
                      href={`/${slug}`}
                      className="inline-block -mx-1 -my-3 px-1 py-3 text-xs text-night-faint transition-colors hover:text-ink"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
                <li>
                  <CookieSettingsButton onDark />
                </li>
              </ul>
            </nav>

            <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-night-line pt-6 sm:flex-row">
              <div className="text-center sm:text-left">
                <p className="text-xs text-night-faint">
                  © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
                </p>
                {/* Rendered only when an address exists: a freshly cloned site
                    ships with this blank, and an empty <address> is worse than
                    none. `not-italic` is load-bearing — Preflight does not
                    reset the tag's italic default. */}
                {postalAddress !== '' && (
                  <address className="mt-1 text-xs not-italic text-night-faint">{postalAddress}</address>
                )}
              </div>
              {/* The circled 18+ reads as a mark rather than as another line of
                  grey type, with "Gamble responsibly" beside it — the same pair
                  partnerplaypro's footer carries. The BeGambleAware link that
                  used to follow was removed on the owner's instruction; the
                  wording stayed. Not `aria-hidden`: the sentence beside it
                  never says the age, so a screen reader needs the "18+" too. */}
              <p className="flex items-center gap-3 text-xs text-night-faint">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-accent text-[13px] font-extrabold text-accent"
                >
                  18+
                </span>
                Gamble responsibly
              </p>
            </div>
            <p className="mt-4 text-xs text-night-faint">{COPY.footer.disclaimer}</p>
          </div>
        </footer>

        <CookieConsent />
        </ToastProvider>
      </body>
    </html>
  )
}
