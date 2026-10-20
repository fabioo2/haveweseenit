import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { searchTitles } from '@/lib/tmdb'

/** Debounced, cached TMDB search. */
export function useTitleSearch(query: string) {
  const trimmed = query.trim()
  const debounced = useDebouncedValue(trimmed, 300)

  const search = useQuery({
    queryKey: ['search', debounced],
    queryFn: ({ signal }) => searchTitles(debounced, signal),
    enabled: debounced.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  })

  return {
    results: trimmed ? (search.data ?? []) : [],
    loading: trimmed.length > 0 && (trimmed !== debounced || search.isFetching),
    error:
      trimmed && search.error
        ? search.error.message || 'Search is unavailable right now.'
        : undefined,
  }
}
