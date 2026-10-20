import { useAddEntry, useDeleteEntry, useEntries, useUpdateEntry } from '@/hooks/useEntries'
import { changedFields, draftFromSearch, entryId } from '@/lib/entries'
import type { SearchResult } from '@/lib/tmdb'
import { errorToast } from '@/lib/toast'
import type { Entry } from '@/lib/types'
import { useListView } from '@/store/listView'

/** Save, delete and search-select actions for the entry drawer and search dialog. */
export function useEntryEditor() {
  const { data: entries = [] } = useEntries()
  const addEntry = useAddEntry()
  const updateEntry = useUpdateEntry()
  const deleteEntry = useDeleteEntry()

  const editing = useListView((state) => state.editing)
  const closeEditor = useListView((state) => state.closeEditor)
  const setSearchOpen = useListView((state) => state.setSearchOpen)
  const setTab = useListView((state) => state.setTab)
  const revealEntry = useListView((state) => state.revealEntry)
  const openDraft = useListView((state) => state.openDraft)

  function selectSearchResult(result: SearchResult) {
    setSearchOpen(false)

    const id = entryId(result.media_type, result.tmdb_id)
    const existing = entries.find((entry) => entry.id === id)
    if (existing) {
      revealEntry(existing)
      return
    }

    setTab(result.media_type)
    openDraft(draftFromSearch(result))
  }

  function save(entry: Entry) {
    closeEditor()

    if (editing?.isNew) {
      const { added_at: _ignored, ...newEntry } = entry
      addEntry.mutate(newEntry, {
        onError: (error) => errorToast(`Could not add ${entry.title}`, error),
      })
      return
    }

    // Only send changed fields, so a stale tab can't overwrite the other person's edits.
    const patch = editing ? changedFields(editing.entry, entry) : entry
    if (Object.keys(patch).length === 0) return

    updateEntry.mutate(
      { id: entry.id, patch },
      { onError: (error) => errorToast(`Could not save ${entry.title}`, error) },
    )
  }

  function remove(id: string) {
    closeEditor()
    deleteEntry.mutate(id, {
      onError: (error) => errorToast('Could not remove that', error),
    })
  }

  return { selectSearchResult, save, remove }
}
