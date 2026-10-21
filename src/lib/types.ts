export const MEDIA_TYPES = ['movie', 'tv'] as const
export type MediaType = (typeof MEDIA_TYPES)[number]

export const MEDIA_LABELS: Record<MediaType, string> = {
  movie: 'Movies',
  tv: 'TV',
}

export const PEOPLE = ['fabio', 'haemin'] as const
export type Person = (typeof PEOPLE)[number]

/** Display names, set at build time. The keys stay fixed because they name the sheet columns. */
export const PERSON_LABELS: Record<Person, string> = {
  fabio: import.meta.env.VITE_PERSON_1_NAME || 'Person 1',
  haemin: import.meta.env.VITE_PERSON_2_NAME || 'Person 2',
}

/** One row of the `watched` sheet. Mirrors HEADERS in apps-script/Code.gs. */
export interface Entry {
  id: string
  media_type: MediaType
  tmdb_id: number
  title: string
  year: number | null
  poster_path: string
  /** YYYY-MM-DD, or '' while on the watchlist. */
  date_watched: string
  fabio_watched: boolean
  haemin_watched: boolean
  fabio_rating: number | null
  haemin_rating: number | null
  notes: string
  added_at: string
  /** Sorted season numbers; empty for a movie. */
  fabio_seasons: number[]
  haemin_seasons: number[]
  /** ISO 639-1 code, or '' if unknown. */
  original_language: string
  genres: string[]
}

export type NewEntry = Omit<Entry, 'added_at'>

/** The fields the server includes in the public snapshot. */
export interface PublicEntry {
  id: string
  media_type: MediaType
  tmdb_id: number
  title: string
  year: number | null
  poster_path: string
  fabio_rating: number | null
  haemin_rating: number | null
  original_language: string
  genres: string[]
}

export type Ratings = Pick<Entry, 'fabio_rating' | 'haemin_rating'>
