import { lazy, Suspense, useEffect, useState } from 'react'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useEntries } from '@/hooks/useEntries'
import { usePublicView } from '@/hooks/usePublicView'
import { UnauthorizedError } from '@/lib/sheets'
import { PassphraseGate } from '@/pages/PassphraseGate'
import { PublicPage } from '@/pages/PublicPage'
import { useSession } from '@/store/session'

// Code-split so visitors to the public page don't download the private app.
const loadListPage = () =>
  import('@/pages/ListPage').then((module) => ({ default: module.ListPage }))
const ListPage = lazy(loadListPage)

export function App() {
  const token = useSession((state) => state.token)
  const authError = useSession((state) => state.authError)
  const signIn = useSession((state) => state.signIn)
  const clearAuthError = useSession((state) => state.clearAuthError)
  const publicView = usePublicView()
  const [loginRequested, setLoginRequested] = useState(false)
  const entriesQuery = useEntries()

  // Start downloading the list page while the entries load.
  useEffect(() => {
    if (token) void loadListPage()
  }, [token])

  if (!token && !loginRequested && !authError) {
    return <PublicPage onLogin={() => setLoginRequested(true)} />
  }

  if (!token) {
    return (
      <PassphraseGate
        error={authError}
        onBack={() => {
          clearAuthError()
          setLoginRequested(false)
        }}
        onSubmit={(passphrase) => {
          signIn(passphrase)
          publicView.leave()
        }}
      />
    )
  }

  if (publicView.isPublicView) {
    return <PublicPage onExitPreview={publicView.leave} />
  }

  // Wait until the passphrase is accepted so a rejected one never flashes the list.
  if (entriesQuery.isPending || entriesQuery.error instanceof UnauthorizedError) {
    return <LoadingScreen />
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <ListPage onShowPublicPage={publicView.enter} />
    </Suspense>
  )
}
