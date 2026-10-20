import { combinedRating, isWatchlist, languageLabel, type Entry, type MediaType } from './types'

/** Sentinel for "don't filter on this", so the selects stay single-valued. */
export const ANY = '__any__'

export const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'both', label: 'Both seen' },
  { value: 'fabio', label: 'Fabio' },
  { value: 'haemin', label: 'Haemin' },
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
  fabio: (noun) => `Fabio hasn’t watched a ${noun} yet.`,
  haemin: (noun) => `Haemin hasn’t watched a ${noun} yet.`,
  watchlist: (noun) => `No ${noun}s on the watchlist.`,
}

export const MEDIA_NOUNS: Record<MediaType, string> = {
  movie: 'movie',
  tv: 'show',
}

export function matchesFilter(entry: Entry, filter: Filter): boolean {
  switch (filter) {
    case 'both':
      return entry.fabio_watched && entry.haemin_watched
    // Everything that person has seen, shared watches included — "only Fabio"
    // turned out to be the less useful cut.
    case 'fabio':
      return entry.fabio_watched
    case 'haemin':
      return entry.haemin_watched
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
    // Groups the Korean films together and sorts within each group by title,
    // which is the point of sorting by language at all.
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

/** Unrated entries sink to the bottom whichever direction you sort. */
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

/** Watched things sort by when you watched them; watchlist items by when they were added. */
function byRecency(a: Entry, b: Entry): number {
  const aWatchlist = isWatchlist(a)
  const bWatchlist = isWatchlist(b)
  if (aWatchlist !== bWatchlist) return aWatchlist ? 1 : -1

  const key = aWatchlist ? 'added_at' : 'date_watched'
  return b[key].localeCompare(a[key])
}
