import { toast } from 'sonner'
import { useAddEntry, useDeleteEntry, useEntries, useUpdateEntry } from '@/hooks/useEntries'
import { changedFields, draftFromSearch, messageOf } from '@/lib/entries'
import type { SearchResult } from '@/lib/tmdb'
import { entryId, type Entry } from '@/lib/types'
import { useListView } from '@/store/listView'

/** What the drawer and the search dialog do when you commit to something. */
export function useEntryEditor() {
  const { data: entries = [] } = useEntries()
  const addEntry = useAddEntry()
  const updateEntry = useUpdateEntry()
  const deleteEntry = useDeleteEntry()

  function selectSearchResult(result: SearchResult) {
    const { setSearchOpen, setTab, revealEntry, openDraft } = useListView.getState()
    setSearchOpen(false)

    const existing = entries.find(
      (entry) => entry.id === entryId(result.media_type, result.tmdb_id),
    )
    if (existing) {
      revealEntry(existing)
      return
    }

    setTab(result.media_type)
    openDraft(draftFromSearch(result))
  }

  function save(entry: Entry) {
    const { editing, closeEditor } = useListView.getState()
    closeEditor()

    if (editing?.isNew) {
      const { added_at: _ignored, ...newEntry } = entry
      addEntry.mutate(newEntry, {
        onError: (error) => toast.error(`Could not add ${entry.title}`, messageOf(error)),
      })
      return
    }

    // Send only what changed. Sending the whole row would make the last save
    // win outright — so one of you editing a note on a stale tab would quietly
    // revert the other's rating.
    const patch = editing ? changedFields(editing.entry, entry) : entry
    if (Object.keys(patch).length === 0) return

    updateEntry.mutate(
      { id: entry.id, patch },
      { onError: (error) => toast.error(`Could not save ${entry.title}`, messageOf(error)) },
    )
  }

  function remove(id: string) {
    useListView.getState().closeEditor()
    deleteEntry.mutate(id, {
      onError: (error) => toast.error('Could not remove that', messageOf(error)),
    })
  }

  return { selectSearchResult, save, remove }
}
