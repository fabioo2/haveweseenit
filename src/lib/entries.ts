import type { SearchResult } from './tmdb'
import type { Entry, MediaType, Ratings } from './types'

/** Movie and TV ids are separate TMDB namespaces and can collide. */
export function entryId(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType[0]}-${tmdbId}`
}

export function isWatchlist(entry: Entry): boolean {
  return !entry.fabio_watched && !entry.haemin_watched
}

function givenRatings(entry: Ratings): number[] {
  return [entry.fabio_rating, entry.haemin_rating].filter(
    (rating): rating is number => rating !== null,
  )
}

/** Average of whichever ratings exist. */
export function combinedRating(entry: Ratings): number | null {
  const given = givenRatings(entry)
  if (given.length === 0) return null
  return given.reduce((sum, rating) => sum + rating, 0) / given.length
}

/** Higher of the two ratings. */
export function bestRating(entry: Ratings): number | null {
  const given = givenRatings(entry)
  return given.length > 0 ? Math.max(...given) : null
}

/** Seasons either person has seen. */
export function seasonsSeen(entry: Entry): number[] {
  const union = new Set([...entry.fabio_seasons, ...entry.haemin_seasons])
  return [...union].sort((a, b) => a - b)
}

/** Local calendar date as YYYY-MM-DD (toISOString would give the UTC date). */
export function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** The fields that differ, so a save doesn't overwrite the other person's edits. */
export function changedFields(before: Entry, after: Entry): Partial<Entry> {
  const keys = (Object.keys(after) as Array<keyof Entry>).filter(
    (key) => key !== 'id' && key !== 'added_at' && !sameValue(before[key], after[key]),
  )
  return Object.fromEntries(keys.map((key) => [key, after[key]]))
}

function sameValue(before: unknown, after: unknown): boolean {
  if (Array.isArray(before) && Array.isArray(after)) {
    return (
      before.length === after.length &&
      before.every((value, index) => value === after[index])
    )
  }
  return before === after
}

export function draftFromSearch(result: SearchResult): Entry {
  return {
    id: entryId(result.media_type, result.tmdb_id),
    media_type: result.media_type,
    tmdb_id: result.tmdb_id,
    title: result.title,
    year: result.year,
    poster_path: result.poster_path,
    date_watched: today(),
    fabio_watched: false,
    haemin_watched: false,
    fabio_rating: null,
    haemin_rating: null,
    notes: '',
    added_at: '',
    fabio_seasons: [],
    haemin_seasons: [],
    original_language: result.original_language,
    genres: result.genres,
  }
}
