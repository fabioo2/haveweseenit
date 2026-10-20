import { useState } from 'react'

/**
 * The public page is a query string rather than a route: GitHub Pages serves
 * the same index.html whatever follows the base path, so `?shared` is a
 * shareable link with no router and no 404 rewrite rules.
 */
const SHARED_PARAM = 'shared'

function sharedInUrl(): boolean {
  return new URLSearchParams(window.location.search).has(SHARED_PARAM)
}

/**
 * replaceState, not pushState: previewing shouldn't need two taps of Back.
 * The search string is assigned rather than edited through URLSearchParams,
 * which would render the flag as `?shared=` — this link gets shared by hand,
 * so the trailing `=` is worth avoiding. Safe because nothing else in this app
 * puts anything in the query string.
 */
function setSharedInUrl(shared: boolean) {
  const url = new URL(window.location.href)
  url.search = shared ? `?${SHARED_PARAM}` : ''
  window.history.replaceState(null, '', url)
}

/** Whether to show the public page, kept in step with the URL. */
export function usePublicView() {
  const [publicView, setPublicView] = useState(sharedInUrl)

  function enter() {
    setPublicView(true)
    setSharedInUrl(true)
  }

  function leave() {
    setPublicView(false)
    setSharedInUrl(false)
  }

  return { publicView, enter, leave }
}
