import type { Metadata } from 'next'
import Link from 'next/link'
import { verifyEmail } from '@/lib/api'

// Double opt-in verify landing. Confirms the subscriber server-side on load
// (idempotent) and is never indexed.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Email verified',
  robots: { index: false, follow: false },
  // Cleared, not inherited: the layout's defaults are the HOMEPAGE's canonical,
  // og:url and share card. A per-subscriber token URL has none of those.
  alternates: { canonical: null },
  openGraph: null,
  twitter: null,
}

/*
 * Colours come from THIS site's tokens, not a hex constant. This page carried
 * `#c91f58` — partnerplaypro's crimson, copied in with the shared page and
 * neither this site's brand nor anything in its palette. The panel is
 * the `brand` token with `brand-ink` on it, as on this site's own primary
 * buttons (white on this gold would not be readable).
 */
const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'our newsletter'

// Focus ring shared by both links, so the page stays keyboard-navigable, and
// transitions are dropped under prefers-reduced-motion.
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-current'

type Props = { params: Promise<{ token: string }> }

export default async function VerifyPage({ params }: Props) {
  const { token } = await params
  const { ok, bonusEmailExpected } = await verifyEmail(token)

  // The token in this URL is the subscriber's existing subscription token, and
  // the unsubscribe route resolves any of their per-stream tokens — so the
  // opt-out link reuses both rather than minting anything new.
  const unsubscribeHref = `/unsubscribe/${encodeURIComponent(token)}`

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
        <div className="bg-brand px-8 py-7 text-brand-ink">
          {ok && bonusEmailExpected && (
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-ink/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-ink">
              <span aria-hidden="true">✓</span> Email verified
            </p>
          )}
          <h1 className="text-xl font-bold">
            {!ok
              ? 'Something went wrong'
              : bonusEmailExpected
                ? 'Your bonus is on its way'
                : '🎉 You’re all set!'}
          </h1>
          <p className="mt-1 text-sm text-brand-ink/75">{SITE_NAME}</p>
        </div>

        <div className="px-8 py-7">
          {!ok ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              We couldn’t verify this link. It may be invalid or expired. Please use the link in your
              most recent email, or subscribe again from our homepage.
            </p>
          ) : bonusEmailExpected ? (
            <>
              <p className="text-sm leading-relaxed text-ink-soft">
                Your subscription to <span className="font-semibold text-ink">{SITE_NAME}</span> is
                active. We&apos;re sending your exclusive subscriber bonus to your inbox now.
              </p>

              {/* The site's own tinted panel. The light-theme yellow box that was
                  here sat as a bright slab in the middle of a dark page. */}
              <div className="mt-5 rounded-xl border border-brand/35 bg-brand-tint px-4 py-4">
                <p className="text-sm font-bold text-brand">Don&apos;t see it?</p>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-ink-soft marker:text-brand">
                  <li>
                    Check your <span className="font-bold">Promotions</span> tab and your {' '}
                    <span className="font-bold">Spam</span> folder — that&apos;s where it usually
                    lands.
                  </li>
                  <li>
                    Search your mailbox for <span className="font-bold">{SITE_NAME}</span>.
                  </li>
                  <li>
                    Found it in Spam? Mark it <span className="font-bold">Not spam</span> and drag it
                    to your inbox, so future offers reach you.
                  </li>
                  <li>Add us to your contacts so our emails always arrive.</li>
                </ul>
              </div>
            </>
          ) : (
            // Promotion after verification is switched off: confirm the
            // subscription, but never promise an email that will not be sent.
            <p className="text-sm leading-relaxed text-ink-soft">
              Your email is verified and your subscription to{' '}
              <span className="font-semibold text-ink">{SITE_NAME}</span> is now active. You’ll be
              the first to hear about our latest special offers and exclusive bonuses.
            </p>
          )}

          <Link
            href="/"
            className={`mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-2 text-sm font-bold text-brand-ink transition-colors hover:bg-brand-dark motion-reduce:transition-none ${FOCUS}`}
          >
            Explore {SITE_NAME}
          </Link>

          {ok && bonusEmailExpected && (
            <>
              <hr className="mt-7 border-line" />
              <p className="mt-4 text-xs leading-relaxed text-ink-soft">
                18+ only. Gambling can be addictive — play responsibly. You can{' '}
                <Link href={unsubscribeHref} className={`underline ${FOCUS}`}>
                  unsubscribe
                </Link>{' '}
                at any time.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
