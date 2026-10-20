import { useDeferredValue, useEffect, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useEntries } from '@/hooks/useEntries'
import { ANY, comparatorFor, matchesFilter } from '@/lib/listing'
import { isWatchlist, languageLabel, type Entry } from '@/lib/types'
import { useListView } from '@/store/listView'

export interface Section {
  title: string
  entries: Entry[]
}

/**
 * The current tab's entries, narrowed and sorted by whatever the list view
 * says, plus the language and genre choices that tab actually offers.
 */
export function useVisibleEntries() {
  const entriesQuery = useEntries()
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data])

  const { tab, filter, language, genre, sort, query, setLanguage, setGenre } = useListView(
    useShallow((state) => ({
      tab: state.tab,
      filter: state.filter,
      language: state.language,
      genre: state.genre,
      sort: state.sort,
      query: state.query,
      setLanguage: state.setLanguage,
      setGenre: state.setGenre,
    })),
  )

  // The input updates on every keystroke; the list catches up when React has
  // a moment, so typing stays responsive however long the list gets.
  const deferredQuery = useDeferredValue(query)

  const inTab = useMemo(
    () => entries.filter((entry) => entry.media_type === tab),
    [entries, tab],
  )

  // Both dropdowns offer only what is actually in the current tab, so there is
  // never a language in the list that returns nothing.
  const languages = useMemo(() => {
    const codes = new Set(inTab.map((entry) => entry.original_language).filter(Boolean))
    return [...codes].sort((a, b) => languageLabel(a).localeCompare(languageLabel(b)))
  }, [inTab])

  const genres = useMemo(() => {
    const names = new Set(inTab.flatMap((entry) => entry.genres))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [inTab])

  // Switching tabs can strip the selected language or genre out from under the
  // dropdown — Korean films but no Korean series. Drop it rather than showing
  // an empty list under a filter that is no longer on offer.
  useEffect(() => {
    if (language !== ANY && !languages.includes(language)) setLanguage(ANY)
  }, [language, languages, setLanguage])

  useEffect(() => {
    if (genre !== ANY && !genres.includes(genre)) setGenre(ANY)
  }, [genre, genres, setGenre])

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    return inTab
      .filter((entry) => matchesFilter(entry, filter))
      .filter((entry) => language === ANY || entry.original_language === language)
      .filter((entry) => genre === ANY || entry.genres.includes(genre))
      .filter((entry) => !needle || entry.title.toLowerCase().includes(needle))
      .sort(comparatorFor(sort))
  }, [inTab, filter, language, genre, sort, deferredQuery])

  // Watched and watchlist are different kinds of thing, so they get their own
  // sections rather than one run-on list.
  const sections = useMemo<Section[]>(
    () =>
      [
        { title: 'Watched', entries: visible.filter((entry) => !isWatchlist(entry)) },
        { title: 'Watchlist', entries: visible.filter(isWatchlist) },
      ].filter((section) => section.entries.length > 0),
    [visible],
  )

  return { entriesQuery, entries, languages, genres, visible, sections }
}
