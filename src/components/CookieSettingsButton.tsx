'use client'

import { openCookieSettings } from './CookieConsent'

// Footer link that reopens the cookie consent banner so visitors can review or
// withdraw consent at any time (GDPR best practice).
//
// `onDark` is for this site's inverted footer: `text-faint` is tuned against
// cream and loses most of its contrast on the ink ground, so the night ramp
// takes over there. See the night-* tokens in globals.css.
export default function CookieSettingsButton({ onDark = false }: { onDark?: boolean }) {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className={`inline-block -mx-1 px-1 py-3 -my-3 text-xs transition-colors ${
        onDark ? 'text-night-faint hover:text-white' : 'text-faint hover:text-brand'
      }`}
    >
      Cookie Settings
    </button>
  )
}
