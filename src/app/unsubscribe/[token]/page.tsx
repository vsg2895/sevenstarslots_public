import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { unsubscribe } from '@/lib/api'

// One-click unsubscribe landing. Performs the removal server-side on load

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Unsubscribe',
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

type Props = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ done?: string }>
}

/**
 * The actual opt-out. A Server Action, so it only ever runs on a POST.
 *
 * This used to happen on page load. Mail-server anti-spam scanners fetch every
 * URL in a message, so a single scan silently unsubscribed the recipient — the
 * page had to be opened by a human for that to be intended. GET now only asks;
 * nothing is recorded until this button is pressed.
 */
async function confirmUnsubscribe(formData: FormData): Promise<void> {
  'use server'
  const token = String(formData.get('token') ?? '')
  const ok = await unsubscribe(token)
  redirect(`/unsubscribe/${encodeURIComponent(token)}?done=${ok ? '1' : '0'}`)
}

export default async function UnsubscribePage({ params, searchParams }: Props) {
  const { token } = await params
  const { done } = await searchParams
  // `done` is only ever present after the action above redirected here.
  const submitted = done !== undefined
  const ok = done === '1'

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
        <div className="bg-brand px-8 py-7 text-brand-ink">
          <h1 className="text-xl font-bold">
            {!submitted
              ? 'Confirm unsubscribe'
              : ok
                ? 'You’ve been unsubscribed'
                : 'Something went wrong'}
          </h1>
          <p className="mt-1 text-sm text-brand-ink/75">{SITE_NAME}</p>
        </div>

        <div className="px-8 py-7">
          {!submitted ? (
            <>
              <p className="text-sm leading-relaxed text-ink-soft">
                Click the button below to stop receiving these emails from{' '}
                <span className="font-semibold text-ink">{SITE_NAME}</span>.
              </p>

              <form action={confirmUnsubscribe}>
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-brand px-5 py-2 text-sm font-bold text-brand-ink transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Unsubscribe me
                </button>
              </form>
            </>
          ) : ok ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              You will no longer receive these emails from{' '}
              <span className="font-semibold text-ink">{SITE_NAME}</span>. Changed your mind?
              You can subscribe again any time from our homepage.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-ink-soft">
              We couldn’t process this unsubscribe link. It may be invalid or expired. Please try the
              link in your most recent email, or contact support.
            </p>
          )}

          <Link
            href="/"
            className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-line-soft px-5 py-2 text-sm font-bold text-ink transition-colors hover:border-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    </main>
  )
}
