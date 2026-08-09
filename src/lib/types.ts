export type MediaType = 'movie' | 'tv'

export const MEDIA_TYPES = ['movie', 'tv'] as const

export const MEDIA_LABELS: Record<MediaType, string> = {
  movie: 'Movies',
  tv: 'TV',
}

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
  /** Season numbers that person has seen; always sorted, and empty for a movie. */
  fabio_seasons: number[]
  haemin_seasons: number[]
  /** ISO 639-1 from TMDB, or '' for rows added before the column existed. */
  original_language: string
  /** TMDB genre names, resolved when the entry was added. */
  genres: string[]
}

export type NewEntry = Omit<Entry, 'added_at'>

export const PEOPLE = ['fabio', 'haemin'] as const
export type Person = (typeof PEOPLE)[number]

export const PERSON_LABELS: Record<Person, string> = {
  fabio: 'Fabio',
  haemin: 'Haemin',
}

/**
 * One colour per person, defined once so a badge, a toggle and an icon can
 * never drift apart. Tailwind needs these as complete literal class strings.
 *
 * `switch` needs `!`: the base Switch already sets data-checked:bg-primary,
 * and which of two same-variant background utilities wins is a stylesheet-
 * order coin flip.
 */
export const PERSON_STYLES: Record<
  Person,
  { badge: string; icon: string; dot: string; fill: string; card: string; switch: string }
> = {
  fabio: {
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    icon: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
    fill: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300',
    card: 'border-sky-500/25 bg-sky-500/5',
    switch: 'data-checked:bg-sky-600! dark:data-checked:bg-sky-500!',
  },
  haemin: {
    badge: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    icon: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
    fill: 'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300',
    card: 'border-violet-500/25 bg-violet-500/5',
    switch: 'data-checked:bg-violet-600! dark:data-checked:bg-violet-500!',
  },
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

/** Seasons either of them has seen, for the one-line summary on a card. */
export function seasonsSeen(entry: Entry): number[] {
  const union = new Set([...entry.fabio_seasons, ...entry.haemin_seasons])
  return [...union].sort((a, b) => a - b)
}

/**
 * "S1–S3" rather than "S1, S2, S3" — a long-running show would otherwise wrap
 * the card. Gaps stay visible, because "seen 1–3 and 5" is the interesting bit.
 */
export function formatSeasons(seasons: number[]): string {
  if (seasons.length === 0) return ''

  const runs: string[] = []
  let start = seasons[0]
  let previous = seasons[0]

  for (const season of seasons.slice(1).concat(Infinity)) {
    if (season === previous + 1) {
      previous = season
      continue
    }
    runs.push(start === previous ? `S${start}` : `S${start}–S${previous}`)
    start = season
    previous = season
  }
  return runs.join(', ')
}

/**
 * Movie and TV ids are separate TMDB namespaces and do collide, so the media
 * type has to be part of the key — for dedupe and lookups, not just storage.
 */
export function entryId(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType[0]}-${tmdbId}`
}

/**
 * Intl already knows every ISO 639-1 code, so a hand-maintained lookup table
 * would only be a way to be wrong about Korean one day.
 */
const languageNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(undefined, { type: 'language' })
    : null

export function languageLabel(code: string): string {
  if (!code) return 'Unknown'
  try {
    return languageNames?.of(code) ?? code.toUpperCase()
  } catch {
    // Intl throws on a malformed tag rather than returning undefined.
    return code.toUpperCase()
  }
}

/** Local calendar date as YYYY-MM-DD — not toISOString(), which is UTC. */
export function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}
