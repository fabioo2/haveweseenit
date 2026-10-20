import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { searchTitles } from '@/lib/tmdb'

/** How long typing has to pause before TMDB is asked. */
const DEBOUNCE_MS = 300

/**
 * TMDB search, debounced and cached. Cached by query, so backspacing to
 * something you already typed answers instantly instead of asking again;
 * react-query also aborts the request a newer keystroke has made stale.
 */
export function useTitleSearch(query: string) {
  const trimmed = query.trim()
  const debounced = useDebouncedValue(trimmed, DEBOUNCE_MS)

  const search = useQuery({
    queryKey: ['search', debounced],
    queryFn: ({ signal }) => searchTitles(debounced, signal),
    enabled: debounced.length > 0,
    staleTime: 5 * 60_000,
    // The last results stay up while the next ones load, rather than the list
    // blanking on every keystroke.
    placeholderData: keepPreviousData,
  })

  return {
    // Cleared the moment the box is, without waiting out the debounce.
    results: trimmed ? (search.data ?? []) : [],
    loading: trimmed.length > 0 && (trimmed !== debounced || search.isFetching),
    error: trimmed && search.error
      ? search.error.message || 'Search is unavailable right now.'
      : undefined,
  }
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
