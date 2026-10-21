export const MEDIA_TYPES = ['movie', 'tv'] as const
export type MediaType = (typeof MEDIA_TYPES)[number]

export const MEDIA_LABELS: Record<MediaType, string> = {
  movie: 'Movies',
  tv: 'TV',
}

export const PEOPLE = ['person1', 'person2'] as const
export type Person = (typeof PEOPLE)[number]

/** Display names, set at build time. The keys name the sheet columns, so they stay generic. */
export const PERSON_LABELS: Record<Person, string> = {
  person1: import.meta.env.VITE_PERSON_1_NAME || 'Person 1',
  person2: import.meta.env.VITE_PERSON_2_NAME || 'Person 2',
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
  person1_watched: boolean
  person2_watched: boolean
  person1_rating: number | null
  person2_rating: number | null
  notes: string
  added_at: string
  /** Sorted season numbers; empty for a movie. */
  person1_seasons: number[]
  person2_seasons: number[]
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
  person1_rating: number | null
  person2_rating: number | null
  original_language: string
  genres: string[]
}

export type Ratings = Pick<Entry, 'person1_rating' | 'person2_rating'>
