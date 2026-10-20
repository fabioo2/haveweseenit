import { useMemo } from 'react'
import { EntryDrawer } from '@/components/EntryDrawer'
import { EntryList } from '@/components/EntryList'
import { ListHeader } from '@/components/ListHeader'
import { SearchDialog } from '@/components/SearchDialog'
import { useEntryEditor } from '@/hooks/useEntryEditor'
import { useVisibleEntries } from '@/hooks/useVisibleEntries'
import { UnauthorizedError } from '@/lib/sheets'
import { useListView } from '@/store/listView'

interface Props {
  onShowPublicPage: () => void
}

/**
 * The private list. A default export so App can lazy-load it: everything here
 * (search, the drawer, the dropdowns) is dead weight to a visitor who only
 * ever sees the public page.
 */
export default function ListPage({ onShowPublicPage }: Props) {
  const { entriesQuery, entries, languages, genres, visible, sections } = useVisibleEntries()
  const { selectSearchResult, save, remove } = useEntryEditor()
  const searchOpen = useListView((state) => state.searchOpen)
  const setSearchOpen = useListView((state) => state.setSearchOpen)
  const editing = useListView((state) => state.editing)
  const closeEditor = useListView((state) => state.closeEditor)

  // Keyed by entry id, not raw tmdb_id: movie and TV ids collide.
  const existingIds = useMemo(() => new Set(entries.map((entry) => entry.id)), [entries])

  // A rejected passphrase is handled by App, which signs out; anything else
  // gets a retry button in place.
  const error =
    entriesQuery.error && !(entriesQuery.error instanceof UnauthorizedError)
      ? entriesQuery.error
      : null

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-16">
      <ListHeader languages={languages} genres={genres} onShowPublicPage={onShowPublicPage} />

      <EntryList
        entries={entries}
        visible={visible}
        sections={sections}
        error={error}
        onRetry={() => entriesQuery.refetch()}
      />

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        existingIds={existingIds}
        onSelect={selectSearchResult}
      />

      <EntryDrawer
        draft={editing?.entry ?? null}
        isNew={editing?.isNew ?? false}
        onClose={closeEditor}
        onSave={save}
        onDelete={remove}
      />
    </div>
  )
}
