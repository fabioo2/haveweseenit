import { useMemo } from 'react'
import { EntryDrawer } from '@/components/EntryDrawer'
import { EntryList } from '@/components/EntryList'
import { ListHeader } from '@/components/ListHeader'
import { SearchDialog } from '@/components/SearchDialog'
import { useEntryEditor } from '@/hooks/useEntryEditor'
import { useVisibleEntries } from '@/hooks/useVisibleEntries'
import { ANY } from '@/lib/listing'
import { useListView } from '@/store/listView'

interface Props {
  onShowPublicPage: () => void
}

export function ListPage({ onShowPublicPage }: Props) {
  const { entriesQuery, entries, languages, genres, language, genre, visible, sections } =
    useVisibleEntries()
  const { selectSearchResult, save, remove } = useEntryEditor()
  const searchOpen = useListView((state) => state.searchOpen)
  const setSearchOpen = useListView((state) => state.setSearchOpen)
  const editing = useListView((state) => state.editing)
  const closeEditor = useListView((state) => state.closeEditor)

  const existingIds = useMemo(() => new Set(entries.map((entry) => entry.id)), [entries])

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-16">
      <ListHeader
        languages={languages}
        genres={genres}
        language={language}
        genre={genre}
        onShowPublicPage={onShowPublicPage}
      />

      <EntryList
        entries={entries}
        visible={visible}
        sections={sections}
        filtered={language !== ANY || genre !== ANY}
        error={entriesQuery.error}
        onRetry={() => entriesQuery.refetch()}
      />

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        existingIds={existingIds}
        onSelect={selectSearchResult}
      />

      {editing && (
        <EntryDrawer
          key={editing.entry.id}
          initialEntry={editing.entry}
          isNew={editing.isNew}
          onClose={closeEditor}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  )
}
