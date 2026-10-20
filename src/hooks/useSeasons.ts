import { skipToken, useQuery } from '@tanstack/react-query'
import { fetchSeasons } from '@/lib/tmdb'
import type { Entry } from '@/lib/types'

/** TMDB's season list for a series, cached for the session. */
export function useSeasons(entry: Entry) {
  return useQuery({
    queryKey: ['seasons', entry.tmdb_id],
    queryFn:
      entry.media_type === 'tv'
        ? ({ signal }) => fetchSeasons(entry.tmdb_id, signal)
        : skipToken,
    staleTime: Infinity,
  })
}
