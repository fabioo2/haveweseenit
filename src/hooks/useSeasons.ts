import { useQuery } from '@tanstack/react-query'
import { fetchSeasons, type Season } from '@/lib/tmdb'
import type { Entry } from '@/lib/types'

/**
 * TMDB's season list for a series, cached for the session: reopening the same
 * show's drawer shouldn't cost another round trip, and a running series only
 * gains a season every year or so.
 */
export function useSeasons(entry: Entry | null) {
  const enabled = Boolean(entry && entry.media_type === 'tv')

  return useQuery({
    queryKey: ['seasons', entry?.tmdb_id],
    queryFn: ({ signal }) => fetchSeasons(entry!.tmdb_id, signal),
    enabled,
    staleTime: Infinity,
  })
}

/**
 * The seasons to offer as chips. TMDB is the source of truth, but if it can't
 * be reached the picker still has to show whatever you have already recorded —
 * otherwise the drawer would look like it had lost your data.
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
