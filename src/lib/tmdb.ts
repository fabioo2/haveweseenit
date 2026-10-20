import { MEDIA_TYPES, type MediaType } from './types'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const IMAGE_BASE = 'https://image.tmdb.org/t/p'

/** Poster widths TMDB serves. */
export type PosterSize = 'w92' | 'w154' | 'w185' | 'w342' | 'w500'

export interface SearchResult {
  tmdb_id: number
  media_type: MediaType
  title: string
  year: number | null
  poster_path: string
  overview: string
  original_language: string
  genres: string[]
}

export interface Season {
  season_number: number
  name: string
  episode_count: number
  year: number | null
}

/** A /search/multi row. Movies use title/release_date, series name/first_air_date. */
interface TmdbResult {
  id: number
  media_type?: string
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  overview?: string
  original_language?: string
  genre_ids?: number[]
}

export function posterUrl(path: string, size: PosterSize = 'w185'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null
}

async function tmdb<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`)
  url.searchParams.set('language', 'en-US')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url, {
    signal,
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_TMDB_TOKEN}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`TMDB request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

const GENRE_ENDPOINTS: Record<MediaType, string> = {
  movie: '/genre/movie/list',
  tv: '/genre/tv/list',
}

let genreNames: Promise<Map<string, string>> | null = null

/**
 * Genre id → name, fetched once per page load and keyed by media type because
 * movie and TV genre ids are separate namespaces. Not tied to a caller's
 * AbortSignal, since later searches share the same request.
 */
function genreMap(): Promise<Map<string, string>> {
  if (!genreNames) {
    genreNames = Promise.all(
      MEDIA_TYPES.map(async (mediaType) => {
        const data = await tmdb<{ genres?: Array<{ id: number; name: string }> }>(
          GENRE_ENDPOINTS[mediaType],
          {},
        )
        return (data.genres ?? []).map(
          (genre) => [`${mediaType}:${genre.id}`, genre.name] as const,
        )
      }),
    )
      .then((pairs) => new Map(pairs.flat()))
      .catch((cause: unknown) => {
        genreNames = null
        throw cause
      })
  }
  return genreNames
}

export async function searchTitles(
  query: string,
  signal?: AbortSignal,
): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  const [data, genres] = await Promise.all([
    tmdb<{ results?: TmdbResult[] }>(
      '/search/multi',
      { query: trimmed, include_adult: 'false', page: '1' },
      signal,
    ),
    // Search still works without genres.
    genreMap().catch(() => new Map<string, string>()),
  ])

  return (data.results ?? [])
    // Multi-search also returns people.
    .filter((result) => result.media_type === 'movie' || result.media_type === 'tv')
    .map((result) => toSearchResult(result, genres))
}

function toSearchResult(result: TmdbResult, genres: Map<string, string>): SearchResult {
  const isTv = result.media_type === 'tv'
  const mediaType: MediaType = isTv ? 'tv' : 'movie'
  const released = (isTv ? result.first_air_date : result.release_date) ?? ''
  const year = released ? Number(released.slice(0, 4)) : NaN

  return {
    tmdb_id: result.id,
    media_type: mediaType,
    title: (isTv ? result.name : result.title) ?? '',
    year: Number.isFinite(year) ? year : null,
    poster_path: result.poster_path ?? '',
    overview: result.overview ?? '',
    original_language: result.original_language ?? '',
    genres: (result.genre_ids ?? [])
      .map((id) => genres.get(`${mediaType}:${id}`))
      .filter((name): name is string => Boolean(name)),
  }
}

interface TmdbSeason {
  season_number: number
  name?: string
  episode_count?: number
  air_date?: string | null
}

/** A series' seasons, without season 0 (TMDB's "Specials"). */
export async function fetchSeasons(tmdbId: number, signal?: AbortSignal): Promise<Season[]> {
  const data = await tmdb<{ seasons?: TmdbSeason[] }>(`/tv/${tmdbId}`, {}, signal)

  return (data.seasons ?? [])
    .filter((season) => season.season_number >= 1)
    .map((season) => {
      const year = season.air_date ? Number(season.air_date.slice(0, 4)) : NaN
      return {
        season_number: season.season_number,
        name: season.name || `Season ${season.season_number}`,
        episode_count: season.episode_count ?? 0,
        year: Number.isFinite(year) ? year : null,
      }
    })
    .sort((a, b) => a.season_number - b.season_number)
}

/**
 * The seasons to offer in the picker. Falls back to the seasons already
 * recorded when TMDB can't be reached, so saved data is still shown.
 */
export function seasonOptions(seasons: Season[] | undefined, recorded: number[]): Season[] {
  if (seasons && seasons.length > 0) return seasons

  return recorded.map((season_number) => ({
    season_number,
    name: `Season ${season_number}`,
    episode_count: 0,
    year: null,
  }))
}
