const TOKEN_KEY = 'hwsi.token'

/** The passphrase doubles as the API token, so it lives on the device only. */
export function readToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function writeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* private mode — the app still works, it just asks again next visit */
  }
}

export function forgetToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* nothing to do */
  }
}
