import { create } from 'zustand'
import { ANY, type Filter, type Sort } from '@/lib/listing'
import type { Entry, MediaType } from '@/lib/types'

interface Editing {
  entry: Entry
  isNew: boolean
}

interface ListViewState {
  tab: MediaType
  filter: Filter
  language: string
  genre: string
  sort: Sort
  /** The "Filter your list…" box. */
  query: string
  searchOpen: boolean
  editing: Editing | null
  /** Briefly ringed after the search jumps to it. */
  highlightId: string | null
  /** Waiting for its card to render so it can be scrolled into view. */
  pendingScrollId: string | null

  setTab: (tab: MediaType) => void
  setFilter: (filter: Filter) => void
  setLanguage: (language: string) => void
  setGenre: (genre: string) => void
  setSort: (sort: Sort) => void
  setQuery: (query: string) => void
  setSearchOpen: (open: boolean) => void
  openEntry: (entry: Entry) => void
  openDraft: (entry: Entry) => void
  closeEditor: () => void
  /** Clears anything that could hide the entry, then scrolls to it and opens it. */
  revealEntry: (entry: Entry) => void
  clearHighlight: () => void
  clearPendingScroll: () => void
}

/**
 * Everything about how the list is being looked at, as opposed to what is in
 * it — that lives in the react-query cache. Components subscribe to the slice
 * they use, so typing in the filter box doesn't re-render the header.
 */
export const useListView = create<ListViewState>()((set) => ({
  tab: 'movie',
  filter: 'all',
  language: ANY,
  genre: ANY,
  sort: 'watched',
  query: '',
  searchOpen: false,
  editing: null,
  highlightId: null,
  pendingScrollId: null,

  setTab: (tab) => set({ tab }),
  setFilter: (filter) => set({ filter }),
  setLanguage: (language) => set({ language }),
  setGenre: (genre) => set({ genre }),
  setSort: (sort) => set({ sort }),
  setQuery: (query) => set({ query }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  openEntry: (entry) => set({ editing: { entry, isNew: false } }),
  openDraft: (entry) => set({ editing: { entry, isNew: true } }),
  closeEditor: () => set({ editing: null }),
  revealEntry: (entry) =>
    set({
      // Search spans both kinds, so the entry may well live in the other tab.
      tab: entry.media_type,
      filter: 'all',
      language: ANY,
      genre: ANY,
      query: '',
      pendingScrollId: entry.id,
      highlightId: entry.id,
      editing: { entry, isNew: false },
    }),
  clearHighlight: () => set({ highlightId: null }),
  clearPendingScroll: () => set({ pendingScrollId: null }),
}))
