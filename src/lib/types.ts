export type MediaType = 'movie' | 'tv'

/** One row of the `watched` sheet. Mirrors HEADERS in apps-script/Code.gs. */
export interface Entry {
  id: string
  media_type: MediaType
  tmdb_id: number
  title: string
  year: number | null
  poster_path: string
  /** YYYY-MM-DD, or '' while it's still on the watchlist. */
  date_watched: string
  fabio_watched: boolean
  haemin_watched: boolean
  fabio_rating: number | null
  haemin_rating: number | null
  notes: string
  added_at: string
}

export type NewEntry = Omit<Entry, 'added_at'>

export const PEOPLE = ['fabio', 'haemin'] as const
export type Person = (typeof PEOPLE)[number]

export const PERSON_LABELS: Record<Person, string> = {
  fabio: 'Fabio',
  haemin: 'Haemin',
}

/**
 * Average of whichever ratings exist. Derived rather than stored so a rating
 * edit can never leave a stale combined value behind in the sheet.
 */
export function combinedRating(entry: Entry): number | null {
  const given = [entry.fabio_rating, entry.haemin_rating].filter(
    (r): r is number => typeof r === 'number',
  )
  if (given.length === 0) return null
  return given.reduce((sum, r) => sum + r, 0) / given.length
}

export function isWatchlist(entry: Entry): boolean {
  return !entry.fabio_watched && !entry.haemin_watched
}

export function entryId(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType[0]}-${tmdbId}`
}
