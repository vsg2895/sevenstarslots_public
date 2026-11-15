'use client'

import { useEffect } from 'react'

/**
 * Opens the `<details>` a `#fragment` points at.
 *
 * The home Bonuses are an accordion (BonusAccordion) whose panels keep the
 * `#bonus-<slug>` anchors every site's home page exposes. A link to one should
 * land on that type OPEN, but a browser only scrolls to a closed `<details>` —
 * it does not expand it. This expands it, on load and on every later hash
 * change, then scrolls it into view.
 *
 * Progressive enhancement only: every panel's offers are already in the server
 * HTML, open or closed, so nothing a crawler reads depends on this.
 */
export default function OpenDetailsOnHash() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1))
      if (id === '') return
      const target = document.getElementById(id)
      if (target instanceof HTMLDetailsElement) {
        target.open = true
        target.scrollIntoView({ block: 'start' })
      }
    }
    open()
    window.addEventListener('hashchange', open)
    return () => window.removeEventListener('hashchange', open)
  }, [])

  return null
}
