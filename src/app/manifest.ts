import type { MetadataRoute } from 'next'

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? ''

/**
 * Web app manifest, served at /manifest.webmanifest.
 *
 * Lighthouse checks for it under Best Practices, and it is what supplies the
 * install metadata and theme colour to mobile browsers. Kept minimal and
 * honest: these are content sites, not offline-capable apps, so `display` stays
 * `browser` rather than claiming a standalone app experience we do not provide.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: `${SITE_NAME} — slot casinos rated on seven checks, one star each.`,
    start_url: '/',
    display: 'browser',
    background_color: '#0f2a27',
    theme_color: '#e9b649',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
