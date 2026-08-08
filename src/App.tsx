import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpDownIcon, SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EntryCard } from '@/components/EntryCard'
import { EntryDrawer } from '@/components/EntryDrawer'
import { LoadingScreen } from '@/components/LoadingScreen'
import { PassphraseGate } from '@/components/PassphraseGate'
import { SearchDialog } from '@/components/SearchDialog'
import { useAddEntry, useDeleteEntry, useEntries, useUpdateEntry } from '@/hooks/useEntries'
import { UnauthorizedError } from '@/lib/sheets'
import { forgetToken, readToken, writeToken } from '@/lib/storage'
import { combinedRating, entryId, isWatchlist, type Entry } from '@/lib/types'
import type { SearchResult } from '@/lib/tmdb'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'both', label: 'Both seen' },
  { value: 'fabio', label: 'Only Fabio' },
  { value: 'haemin', label: 'Only Haemin' },
  { value: 'watchlist', label: 'Watchlist' },
] as const

type Filter = (typeof FILTERS)[number]['value']

const SORTS = [
  { value: 'watched', label: 'Recently watched' },
  { value: 'added', label: 'Recently added' },
  { value: 'rating-desc', label: 'Highest rated' },
  { value: 'rating-asc', label: 'Lowest rated' },
  { value: 'title', label: 'Title A–Z' },
] as const

type Sort = (typeof SORTS)[number]['value']

const SORT_LABELS: Record<string, string> = Object.fromEntries(
  SORTS.map(({ value, label }) => [value, label]),
)

const EMPTY_STATES: Record<Filter, string> = {
  all: 'Nothing here yet. Search for a movie to get started.',
  both: "You haven't both seen anything yet.",
  fabio: 'Nothing Fabio has seen that Haemin hasn’t.',
  haemin: 'Nothing Haemin has seen that Fabio hasn’t.',
  watchlist: 'Watchlist is empty.',
}

export default function App() {
  const queryClient = useQueryClient()
  const [token, setToken] = useState(readToken)
  const [authError, setAuthError] = useState<string>()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('watched')
  const [searchOpen, setSearchOpen] = useState(false)
  const [editing, setEditing] = useState<{ entry: Entry; isNew: boolean } | null>(null)

  const entriesQuery = useEntries(token)
  const addEntry = useAddEntry(token)
  const updateEntry = useUpdateEntry(token)
  const deleteEntry = useDeleteEntry(token)

  // A rejected passphrase is the one error worth forgetting the token over.
  useEffect(() => {
    if (entriesQuery.error instanceof UnauthorizedError) {
      forgetToken()
      setToken('')
      setAuthError('That passphrase was not accepted.')
      queryClient.removeQueries({ queryKey: ['entries'] })
    }
  }, [entriesQuery.error, queryClient])

  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data])

  const existingIds = useMemo(
    () => new Set(entries.map((entry) => entry.tmdb_id)),
    [entries],
  )

  const visible = useMemo(
    () =>
      entries
        .filter((entry) => matchesFilter(entry, filter))
        .sort(comparatorFor(sort)),
    [entries, filter, sort],
  )

  // Watched and watchlist are different kinds of thing, so they get their own
  // sections rather than one run-on list.
  const watched = visible.filter((entry) => !isWatchlist(entry))
  const watchlist = visible.filter(isWatchlist)
  const showSectionHeadings = watched.length > 0 && watchlist.length > 0
  const sections = [
    { title: 'Watched', entries: watched },
    { title: 'Watchlist', entries: watchlist },
  ].filter((section) => section.entries.length > 0)

  if (!token) {
    return (
      <PassphraseGate
        error={authError}
        pending={entriesQuery.isFetching}
        onSubmit={(passphrase) => {
          setAuthError(undefined)
          writeToken(passphrase)
          setToken(passphrase)
        }}
      />
    )
  }

  // Hold the loading screen until the passphrase has actually been accepted, so
  // a rejected one never flashes the app on its way back to the gate. The
  // unauthorized case covers the frame between the failure and the effect above
  // clearing the token.
  if (entriesQuery.isPending || entriesQuery.error instanceof UnauthorizedError) {
    return <LoadingScreen />
  }

  function handleSearchSelect(result: SearchResult) {
    setSearchOpen(false)
    setEditing({ entry: draftFromSearch(result), isNew: true })
  }

  function handleSave(entry: Entry) {
    const wasNew = editing?.isNew
    setEditing(null)

    if (wasNew) {
      const { added_at: _ignored, ...newEntry } = entry
      addEntry.mutate(newEntry, {
        onError: (error) => toast.error(`Could not add ${entry.title}`, messageOf(error)),
      })
    } else {
      updateEntry.mutate(
        { id: entry.id, patch: entry },
        { onError: (error) => toast.error(`Could not save ${entry.title}`, messageOf(error)) },
      )
    }
  }

  function handleDelete(id: string) {
    setEditing(null)
    deleteEntry.mutate(id, {
      onError: (error) => toast.error('Could not remove that', messageOf(error)),
    })
  }

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-16">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2 px-4 py-3">
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
            Have We Seen It?
          </h1>

          {/* Icon-only, so the filter chips below get the full width. */}
          <Select
            items={SORT_LABELS}
            value={sort}
            onValueChange={(value) => setSort(value as Sort)}
          >
            <SelectTrigger size="sm" className="shrink-0 px-2" aria-label="Sort by">
              <ArrowUpDownIcon className="text-muted-foreground" />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" className="shrink-0" onClick={() => setSearchOpen(true)}>
            <SearchIcon />
            Add
          </Button>
        </div>

        <div className="no-scrollbar overflow-x-auto px-4 pb-3">
          <ToggleGroup
            value={[filter]}
            onValueChange={(value) => {
              const next = value[0]
              if (next) setFilter(next as Filter)
            }}
            variant="outline"
            size="sm"
            className="w-max select-none"
          >
            {FILTERS.map(({ value, label }) => (
              <ToggleGroupItem key={value} value={value} className="whitespace-nowrap px-3">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </header>

      <main className="space-y-2 p-4">
        {entriesQuery.isError && !(entriesQuery.error instanceof UnauthorizedError) && (
          <div className="space-y-3 rounded-lg border border-destructive/40 p-4 text-sm">
            <p className="text-destructive">{entriesQuery.error.message}</p>
            <Button variant="outline" size="sm" onClick={() => entriesQuery.refetch()}>
              Try again
            </Button>
          </div>
        )}

        {entriesQuery.isSuccess && visible.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {EMPTY_STATES[filter]}
          </p>
        )}

        {sections.map(({ title, entries: sectionEntries }) => (
          <section key={title} className="space-y-2">
            {/* Only labelled when both kinds are on screen — otherwise the
                filter chip already says what you're looking at. */}
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
                onSelect={(selected) => setEditing({ entry: selected, isNew: false })}
              />
            ))}
          </section>
        ))}
      </main>

      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        existingIds={existingIds}
        onSelect={handleSearchSelect}
      />

      <EntryDrawer
        draft={editing?.entry ?? null}
        isNew={editing?.isNew ?? false}
        onClose={() => setEditing(null)}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  )
}

function matchesFilter(entry: Entry, filter: Filter): boolean {
  switch (filter) {
    case 'both':
      return entry.fabio_watched && entry.haemin_watched
    case 'fabio':
      return entry.fabio_watched && !entry.haemin_watched
    case 'haemin':
      return entry.haemin_watched && !entry.fabio_watched
    case 'watchlist':
      return isWatchlist(entry)
    default:
      return true
  }
}

function comparatorFor(sort: Sort): (a: Entry, b: Entry) => number {
  switch (sort) {
    case 'added':
      return (a, b) => b.added_at.localeCompare(a.added_at)
    case 'rating-desc':
      return byRating(-1)
    case 'rating-asc':
      return byRating(1)
    case 'title':
      return (a, b) => a.title.localeCompare(b.title)
    default:
      return byRecency
  }
}

/** Unrated entries sink to the bottom whichever direction you sort. */
function byRating(direction: 1 | -1) {
  return (a: Entry, b: Entry): number => {
    const left = combinedRating(a)
    const right = combinedRating(b)

    if (left === null || right === null) {
      if (left === right) return a.title.localeCompare(b.title)
      return left === null ? 1 : -1
    }
    if (left === right) return a.title.localeCompare(b.title)
    return (left - right) * direction
  }
}

/** Watched things sort by when you watched them; watchlist items by when they were added. */
function byRecency(a: Entry, b: Entry): number {
  const aWatchlist = isWatchlist(a)
  const bWatchlist = isWatchlist(b)
  if (aWatchlist !== bWatchlist) return aWatchlist ? 1 : -1

  const key = aWatchlist ? 'added_at' : 'date_watched'
  return b[key].localeCompare(a[key])
}

function draftFromSearch(result: SearchResult): Entry {
  return {
    id: entryId(result.media_type, result.tmdb_id),
    media_type: result.media_type,
    tmdb_id: result.tmdb_id,
    title: result.title,
    year: result.year,
    poster_path: result.poster_path,
    date_watched: today(),
    fabio_watched: false,
    haemin_watched: false,
    fabio_rating: null,
    haemin_rating: null,
    notes: '',
    added_at: '',
  }
}

function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function messageOf(error: unknown) {
  return { description: error instanceof Error ? error.message : 'Please try again.' }
}
