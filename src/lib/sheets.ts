import type { Entry, NewEntry } from './types'

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL

type ApiResponse<T> = ({ ok: true } & T) | { ok: false; error: string }

export class SheetsError extends Error {}
export class UnauthorizedError extends SheetsError {
  constructor() {
    super('That passphrase was not accepted.')
  }
}

/**
 * Apps Script can't answer CORS preflight requests, so every call must stay a
 * "simple request": POST, Content-Type text/plain, no custom headers. The
 * token and action therefore ride inside the JSON body rather than a header.
 */
async function call<T>(payload: Record<string, unknown>): Promise<T> {
  if (!SCRIPT_URL) {
    throw new SheetsError('VITE_SCRIPT_URL is not set — see README.')
  }

  let res: Response
  try {
    res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    })
  } catch {
    throw new SheetsError('Could not reach the sheet. Check your connection.')
  }

  if (!res.ok) {
    throw new SheetsError(`Sheet request failed (${res.status})`)
  }

  // Apps Script answers with an HTML page and HTTP 200 when a deployment or
  // authorisation is unhealthy, which would otherwise surface as a raw
  // "Unexpected token '<'" in a toast.
  let data: ApiResponse<T>
  try {
    data = (await res.json()) as ApiResponse<T>
  } catch {
    throw new SheetsError('Unexpected response from the sheet. Is the deployment current?')
  }

  if (!data.ok) {
    if (data.error === 'unauthorized') throw new UnauthorizedError()
    throw new SheetsError(data.error)
  }
  return data as T
}

/**
 * The Apps Script deployment is updated by hand, so the client can be newer
 * than the backend for as long as it takes to paste and redeploy. Filling in
 * the fields an older deployment doesn't return yet means that window shows
 * entries without seasons or genres, rather than white-screening the app on the
 * first `.includes` of an undefined.
 */
function fromServer(entry: Entry): Entry {
  return {
    ...entry,
    fabio_seasons: entry.fabio_seasons ?? [],
    haemin_seasons: entry.haemin_seasons ?? [],
    genres: entry.genres ?? [],
    original_language: entry.original_language ?? '',
  }
}

export async function listEntries(token: string): Promise<Entry[]> {
  const { entries } = await call<{ entries: Entry[] }>({ action: 'list', token })
  return entries.map(fromServer)
}

export async function addEntry(token: string, entry: NewEntry): Promise<Entry> {
  const res = await call<{ entry: Entry }>({ action: 'add', token, entry })
  return fromServer(res.entry)
}

export async function updateEntry(
  token: string,
  id: string,
  patch: Partial<Entry>,
): Promise<Entry> {
  const res = await call<{ entry: Entry }>({ action: 'update', token, id, patch })
  return fromServer(res.entry)
}

export async function deleteEntry(token: string, id: string): Promise<void> {
  await call<Record<string, never>>({ action: 'delete', token, id })
}
