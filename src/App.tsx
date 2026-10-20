import { lazy, Suspense, useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { LoadingScreen } from '@/components/LoadingScreen'
import { PassphraseGate } from '@/components/PassphraseGate'
import { PublicPage } from '@/components/PublicPage'
import { ENTRIES_KEY, useEntries } from '@/hooks/useEntries'
import { usePublicView } from '@/hooks/usePublicView'
import { UnauthorizedError } from '@/lib/sheets'
import { useSession } from '@/store/session'

// Its own chunk: a visitor on the public page never downloads the list, the
// search or the drawer. With a passphrase it is fetched alongside the list
// data rather than after it, so the two of you never wait on it.
const loadListPage = () => import('@/components/ListPage')
const ListPage = lazy(loadListPage)

/** Decides which screen you are on; each screen owns its own state. */
export default function App() {
  const queryClient = useQueryClient()
  const token = useSession((state) => state.token)
  const authError = useSession((state) => state.authError)
  const signIn = useSession((state) => state.signIn)
  const signOut = useSession((state) => state.signOut)
  const clearAuthError = useSession((state) => state.clearAuthError)
  const publicView = usePublicView()
  // Without a passphrase the public page is the landing page, so reaching the
  // gate is a deliberate act rather than the default.
  const [gateRequested, setGateRequested] = useState(false)

  const entriesQuery = useEntries()

  useEffect(() => {
    if (token) void loadListPage()
  }, [token])

  // A rejected passphrase is the one error worth forgetting the token over.
  useEffect(() => {
    if (entriesQuery.error instanceof UnauthorizedError) {
      signOut('That passphrase was not accepted.')
      queryClient.removeQueries({ queryKey: ENTRIES_KEY })
    }
  }, [entriesQuery.error, queryClient, signOut])

  // A rejected passphrase drops back to the gate with its error, not to the
  // public page — otherwise the typo would look like the app logging you out.
  if (!token && !gateRequested && !authError) {
    return (
      <PublicPage
        mode="anonymous"
        onEnter={() => setGateRequested(true)}
        onExit={publicView.leave}
      />
    )
  }

  if (!token) {
    return (
      <PassphraseGate
        error={authError}
        onBack={() => {
          clearAuthError()
          setGateRequested(false)
        }}
        onSubmit={(passphrase) => {
          signIn(passphrase)
          // Someone who followed a ?shared link and then signed in has asked
          // to come inside; without this they would land back on the public
          // page, because publicView was seeded from that same URL.
          publicView.leave()
        }}
      />
    )
  }

  // Checked before the loading screen: previewing shouldn't wait on the
  // private list, and the token and query cache are untouched throughout, so
  // this can never log anyone out.
  if (publicView.publicView) {
    return <PublicPage mode="preview" onEnter={() => {}} onExit={publicView.leave} />
  }

  // Hold the loading screen until the passphrase has actually been accepted, so
  // a rejected one never flashes the app on its way back to the gate. The
  // unauthorized case covers the frame between the failure and the effect above
  // clearing the token.
  if (entriesQuery.isPending || entriesQuery.error instanceof UnauthorizedError) {
    return <LoadingScreen />
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ListPage onShowPublicPage={publicView.enter} />
    </Suspense>
  )
}
