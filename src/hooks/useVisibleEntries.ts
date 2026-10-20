import { useDeferredValue, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEntries } from '@/hooks/useEntries'
import { isWatchlist } from '@/lib/entries'
import { languageLabel } from '@/lib/format'
import { ANY, comparatorFor, matchesFilter } from '@/lib/listing'
import type { Entry } from '@/lib/types'
import { useListView } from '@/store/listView'

export interface Section {
  title: string
  entries: Entry[]
}

/** The current tab's entries, filtered and sorted according to the list view. */
export function useVisibleEntries() {
  const entriesQuery = useEntries()
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data])

  const { tab, filter, sort, query, ...selected } = useListView(
    useShallow((state) => ({
      tab: state.tab,
      filter: state.filter,
      language: state.language,
      genre: state.genre,
      sort: state.sort,
      query: state.query,
    })),
  )

  // Keeps typing responsive while the list re-filters.
  const deferredQuery = useDeferredValue(query)

  const inTab = useMemo(
    () => entries.filter((entry) => entry.media_type === tab),
    [entries, tab],
  )

  const languages = useMemo(() => {
    const codes = new Set(inTab.map((entry) => entry.original_language).filter(Boolean))
    return [...codes].sort((a, b) => languageLabel(a).localeCompare(languageLabel(b)))
  }, [inTab])

  const genres = useMemo(() => {
    const names = new Set(inTab.flatMap((entry) => entry.genres))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [inTab])

  // A selection the current tab doesn't offer (e.g. after switching tabs) is ignored.
  const language = languages.includes(selected.language) ? selected.language : ANY
  const genre = genres.includes(selected.genre) ? selected.genre : ANY

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    return inTab
      .filter((entry) => matchesFilter(entry, filter))
      .filter((entry) => language === ANY || entry.original_language === language)
      .filter((entry) => genre === ANY || entry.genres.includes(genre))
      .filter((entry) => !needle || entry.title.toLowerCase().includes(needle))
      .sort(comparatorFor(sort))
  }, [inTab, filter, language, genre, sort, deferredQuery])

  const sections = useMemo<Section[]>(
    () =>
      [
        { title: 'Watched', entries: visible.filter((entry) => !isWatchlist(entry)) },
        { title: 'Watchlist', entries: visible.filter(isWatchlist) },
      ].filter((section) => section.entries.length > 0),
    [visible],
  )

  return { entriesQuery, entries, languages, genres, language, genre, visible, sections }
}
