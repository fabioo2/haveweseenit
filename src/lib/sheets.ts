import type { Entry, NewEntry, PublicEntry } from './types'

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL

type ApiResponse<T> = ({ ok: true } & T) | { ok: false; error: string }

export class SheetsError extends Error {}
export class UnauthorizedError extends SheetsError {
  constructor() {
    super('That passphrase was not accepted.')
  }
}

/**
 * Apps Script can't answer CORS preflight requests, so every call must be a
 * "simple request": POST with Content-Type text/plain and no custom headers.
 * The token and action therefore go in the JSON body.
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

  // A broken deployment answers 200 with an HTML page.
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

/** Defaults for fields an older backend deployment may not return. */
function fromServer(entry: Entry): Entry {
  return {
    ...entry,
    fabio_seasons: entry.fabio_seasons ?? [],
    haemin_seasons: entry.haemin_seasons ?? [],
    genres: entry.genres ?? [],
    original_language: entry.original_language ?? '',
  }
}

export interface PublicSnapshot {
  generated_at: string
  entries: PublicEntry[]
}

/**
 * The public snapshot; the only call without a passphrase. Any failure
 * resolves to an empty list so visitors never see an error screen.
 */
export async function fetchPublicSnapshot(): Promise<PublicSnapshot> {
  const empty: PublicSnapshot = { generated_at: '', entries: [] }
  if (!SCRIPT_URL) return empty

  try {
    const res = await fetch(`${SCRIPT_URL}?action=public`, { redirect: 'follow' })
    if (!res.ok) return empty

    const data = (await res.json()) as ApiResponse<PublicSnapshot>
    if (!data.ok) return empty

    return { generated_at: data.generated_at ?? '', entries: data.entries ?? [] }
  } catch {
    return empty
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
