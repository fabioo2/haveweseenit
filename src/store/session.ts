import { create } from 'zustand'
import { forgetToken, readToken, writeToken } from '@/lib/storage'

interface SessionState {
  /** The passphrase, which doubles as the API token. '' when signed out. */
  token: string
  /** Why the last passphrase was turned away, shown on the gate. */
  authError?: string
  signIn: (passphrase: string) => void
  /** Forgets the token; with a reason, the gate explains why it is back. */
  signOut: (reason?: string) => void
  clearAuthError: () => void
}

/**
 * A store rather than state in App: the entry hooks need the token for every
 * call, and threading it through each component in between was most of what
 * made App's props unreadable.
 */
export const useSession = create<SessionState>()((set) => ({
  token: readToken(),
  authError: undefined,
  signIn: (passphrase) => {
    writeToken(passphrase)
    set({ token: passphrase, authError: undefined })
  },
  signOut: (reason) => {
    forgetToken()
    set({ token: '', authError: reason })
  },
  clearAuthError: () => set({ authError: undefined }),
}))
