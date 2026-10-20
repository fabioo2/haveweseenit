import { useEffect } from 'react'
import { SearchIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EntryCard } from '@/components/EntryCard'
import type { Section } from '@/hooks/useVisibleEntries'
import { EMPTY_STATES, MEDIA_NOUNS } from '@/lib/listing'
import type { Entry } from '@/lib/types'
import { useListView } from '@/store/listView'

interface Props {
  entries: Entry[]
  visible: Entry[]
  sections: Section[]
  /** Whether a language or genre filter is active. */
  filtered: boolean
  error: Error | null
  onRetry: () => void
}

export function EntryList({ entries, visible, sections, filtered, error, onRetry }: Props) {
  const query = useListView((state) => state.query)
  const setQuery = useListView((state) => state.setQuery)
  const openEntry = useListView((state) => state.openEntry)
  const highlightId = useListView((state) => state.highlightId)

  useRevealScroll(visible)

  const showSectionHeadings = sections.length > 1

  return (
    <main className="space-y-2 p-4">
      {entries.length > 0 && (
        <div className="relative pb-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter your list…"
            aria-label="Filter your list"
            className="pl-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear filter"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="space-y-3 rounded-lg border border-destructive/40 p-4 text-sm">
          <p className="text-destructive">{error.message}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}

      {!error && visible.length === 0 && <EmptyState filtered={filtered} />}

      {sections.map(({ title, entries: sectionEntries }) => (
        <section key={title} className="space-y-2">
          {showSectionHeadings && (
            <h2 className="flex items-baseline gap-2 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
              <span className="text-muted-foreground/60">{sectionEntries.length}</span>
            </h2>
          )}

          {sectionEntries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              highlighted={entry.id === highlightId}
              onSelect={openEntry}
            />
          ))}
        </section>
      ))}
    </main>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  const query = useListView((state) => state.query.trim())
  const filter = useListView((state) => state.filter)
  const tab = useListView((state) => state.tab)

  return (
    <p className="py-12 text-center text-sm text-muted-foreground">
      {query
        ? `Nothing in your list matches “${query}”.`
        : filtered
          ? 'Nothing matches those filters.'
          : EMPTY_STATES[filter](MEDIA_NOUNS[tab])}
    </p>
  )
}

/**
 * After search jumps to an existing entry, scrolls its card into view once it
 * has rendered and clears the highlight after two seconds.
 */
function useRevealScroll(visible: Entry[]) {
  const pendingScrollId = useListView((state) => state.pendingScrollId)
  const clearPendingScroll = useListView((state) => state.clearPendingScroll)
  const highlightId = useListView((state) => state.highlightId)
  const clearHighlight = useListView((state) => state.clearHighlight)

  useEffect(() => {
    if (!pendingScrollId) return
    const card = document.getElementById(`entry-${pendingScrollId}`)
    if (!card) return
    card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    clearPendingScroll()
  }, [pendingScrollId, visible, clearPendingScroll])

  useEffect(() => {
    if (!highlightId) return
    const timer = setTimeout(clearHighlight, 2000)
    return () => clearTimeout(timer)
  }, [highlightId, clearHighlight])
}
