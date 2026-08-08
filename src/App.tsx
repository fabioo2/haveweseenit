import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { SearchIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EntryCard } from '@/components/EntryCard'
import { EntryDrawer } from '@/components/EntryDrawer'
import { LoadingScreen } from '@/components/LoadingScreen'
import { PassphraseGate } from '@/components/PassphraseGate'
import { SearchDialog } from '@/components/SearchDialog'
import { useAddEntry, useDeleteEntry, useEntries, useUpdateEntry } from '@/hooks/useEntries'
import { UnauthorizedError } from '@/lib/sheets'
import { forgetToken, readToken, writeToken } from '@/lib/storage'
import { entryId, isWatchlist, type Entry } from '@/lib/types'
import type { SearchResult } from '@/lib/tmdb'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'both', label: 'Both seen' },
  { value: 'fabio', label: 'Only Fabio' },
  { value: 'haemin', label: 'Only Haemin' },
  { value: 'watchlist', label: 'Watchlist' },
] as const

type Filter = (typeof FILTERS)[number]['value']

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
    () => entries.filter((entry) => matchesFilter(entry, filter)).sort(byRecency),
    [entries, filter],
  )

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
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <h1 className="text-lg font-semibold tracking-tight">Have We Seen It?</h1>
          <Button size="sm" onClick={() => setSearchOpen(true)}>
            <SearchIcon />
            Add
          </Button>
        </div>

        <div className="overflow-x-auto px-4 pb-3">
          <ToggleGroup
            value={[filter]}
            onValueChange={(value) => {
              const next = value[0]
              if (next) setFilter(next as Filter)
            }}
            variant="outline"
            size="sm"
            className="w-max"
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

        {visible.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onSelect={(selected) => setEditing({ entry: selected, isNew: false })}
          />
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
