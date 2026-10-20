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
  /** Text in the list filter box. */
  query: string
  searchOpen: boolean
  editing: Editing | null
  /** Entry to highlight after jumping to it from search. */
  highlightId: string | null
  /** Entry to scroll into view once its card renders. */
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
  /** Clears filters that could hide the entry, then scrolls to and opens it. */
  revealEntry: (entry: Entry) => void
  clearHighlight: () => void
  clearPendingScroll: () => void
}

/** UI state for the list page. The entries themselves live in React Query. */
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
