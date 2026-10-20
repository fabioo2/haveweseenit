import type { SearchResult } from './tmdb'
import { entryId, today, type Entry } from './types'

export function changedFields(before: Entry, after: Entry): Partial<Entry> {
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(after) as Array<keyof Entry>) {
    if (key === 'id' || key === 'added_at') continue
    if (!sameValue(before[key], after[key])) patch[key] = after[key]
  }
  return patch as Partial<Entry>
}

/**
 * Seasons and genres are arrays, and a fresh one is a different reference on
 * every render — comparing by identity would put them in every patch and
 * quietly undo the point of sending diffs at all. Both are kept sorted, so
 * comparing in order is enough.
 */
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

export function messageOf(error: unknown) {
  return { description: error instanceof Error ? error.message : 'Please try again.' }
}
