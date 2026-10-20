import { create } from 'zustand'
import { forgetToken, readToken, writeToken } from '@/lib/storage'

interface SessionState {
  /** The passphrase, used as the API token. Empty when signed out. */
  token: string
  /** Shown on the passphrase screen after a rejected passphrase. */
  authError?: string
  signIn: (passphrase: string) => void
  signOut: (reason?: string) => void
  clearAuthError: () => void
}

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
