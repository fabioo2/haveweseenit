import { combinedRating, isWatchlist } from './entries'
import { languageLabel } from './format'
import { PERSON_LABELS, type Entry, type MediaType } from './types'

/** Select value meaning "no filter". */
export const ANY = '__any__'

export const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'both', label: 'Both seen' },
  { value: 'person1', label: PERSON_LABELS.person1 },
  { value: 'person2', label: PERSON_LABELS.person2 },
  { value: 'watchlist', label: 'Watchlist' },
] as const

export type Filter = (typeof FILTERS)[number]['value']

export const SORTS = [
  { value: 'watched', label: 'Recently watched' },
  { value: 'added', label: 'Recently added' },
  { value: 'rating-desc', label: 'Highest rated' },
  { value: 'rating-asc', label: 'Lowest rated' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'language', label: 'Language' },
] as const

export type Sort = (typeof SORTS)[number]['value']

export const SORT_LABELS: Record<string, string> = Object.fromEntries(
  SORTS.map(({ value, label }) => [value, label]),
)

export const EMPTY_STATES: Record<Filter, (noun: string) => string> = {
  all: (noun) => `Nothing here yet. Search for a ${noun} to get started.`,
  both: (noun) => `You haven't both seen a ${noun} yet.`,
  person1: (noun) => `${PERSON_LABELS.person1} hasn’t watched a ${noun} yet.`,
  person2: (noun) => `${PERSON_LABELS.person2} hasn’t watched a ${noun} yet.`,
  watchlist: (noun) => `No ${noun}s on the watchlist.`,
}

export const MEDIA_NOUNS: Record<MediaType, string> = {
  movie: 'movie',
  tv: 'show',
}

export function matchesFilter(entry: Entry, filter: Filter): boolean {
  switch (filter) {
    case 'both':
      return entry.person1_watched && entry.person2_watched
    case 'person1':
      return entry.person1_watched
    case 'person2':
      return entry.person2_watched
    case 'watchlist':
      return isWatchlist(entry)
    default:
      return true
  }
}

export function comparatorFor(sort: Sort): (a: Entry, b: Entry) => number {
  switch (sort) {
    case 'added':
      return (a, b) => b.added_at.localeCompare(a.added_at)
    case 'rating-desc':
      return byRating(-1)
    case 'rating-asc':
      return byRating(1)
    case 'title':
      return (a, b) => a.title.localeCompare(b.title)
    // By language, then title.
    case 'language':
      return (a, b) => {
        const left = languageLabel(a.original_language)
        const right = languageLabel(b.original_language)
        return left === right
          ? a.title.localeCompare(b.title)
          : left.localeCompare(right)
      }
    default:
      return byRecency
  }
}

/** Unrated entries go last in either direction. */
function byRating(direction: 1 | -1) {
  return (a: Entry, b: Entry): number => {
    const left = combinedRating(a)
    const right = combinedRating(b)

    if (left === null || right === null) {
      if (left === right) return a.title.localeCompare(b.title)
      return left === null ? 1 : -1
    }
    if (left === right) return a.title.localeCompare(b.title)
    return (left - right) * direction
  }
}

/** Watched entries by watch date, then the watchlist by date added. */
function byRecency(a: Entry, b: Entry): number {
  const aWatchlist = isWatchlist(a)
  const bWatchlist = isWatchlist(b)
  if (aWatchlist !== bWatchlist) return aWatchlist ? 1 : -1

  const key = aWatchlist ? 'added_at' : 'date_watched'
  return b[key].localeCompare(a[key])
}
