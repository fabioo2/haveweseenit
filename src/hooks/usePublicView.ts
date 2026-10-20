import { useState } from 'react'

// The public page is a query parameter rather than a route, since GitHub Pages
// serves the same index.html for every path.
const SHARED_PARAM = 'shared'

function sharedInUrl(): boolean {
  return new URLSearchParams(window.location.search).has(SHARED_PARAM)
}

function setSharedInUrl(shared: boolean) {
  const url = new URL(window.location.href)
  // Assigned directly so the URL reads `?shared` rather than `?shared=`.
  url.search = shared ? `?${SHARED_PARAM}` : ''
  window.history.replaceState(null, '', url)
}

/** Whether the public page is showing, kept in sync with `?shared` in the URL. */
export function usePublicView() {
  const [isPublicView, setIsPublicView] = useState(sharedInUrl)

  function enter() {
    setIsPublicView(true)
    setSharedInUrl(true)
  }

  function leave() {
    setIsPublicView(false)
    setSharedInUrl(false)
  }

  return { isPublicView, enter, leave }
}
