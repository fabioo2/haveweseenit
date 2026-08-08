import type { MediaType } from './types'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

/** TMDB serves several fixed widths; w92 for autocomplete rows, w185 for list cards. */
export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500'

export interface SearchResult {
  tmdb_id: number
  media_type: MediaType
  title: string
  year: number | null
  poster_path: string
  overview: string
}

interface TmdbMovie {
  id: number
  title: string
  release_date?: string
  poster_path?: string | null
  overview?: string
  popularity?: number
}

export function posterUrl(path: string, size: PosterSize = 'w185'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null
}

export async function searchMovies(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const url = new URL(`${TMDB_BASE}/search/movie`)
  url.searchParams.set('query', trimmed)
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('language', 'en-US')
  url.searchParams.set('page', '1')

  const res = await fetch(url, {
    signal,
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_TMDB_TOKEN}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`TMDB search failed (${res.status})`)
  }

  const data: { results?: TmdbMovie[] } = await res.json()
  return (data.results ?? []).map(toSearchResult)
}

function toSearchResult(movie: TmdbMovie): SearchResult {
  const year = movie.release_date ? Number(movie.release_date.slice(0, 4)) : NaN

  return {
    tmdb_id: movie.id,
    media_type: 'movie',
    title: movie.title,
    year: Number.isFinite(year) ? year : null,
    poster_path: movie.poster_path ?? '',
    overview: movie.overview ?? '',
  }
}
