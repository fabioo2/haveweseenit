import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowUpDownIcon, SearchIcon, Share2Icon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { EntryCard } from '@/components/EntryCard'
import { EntryDrawer } from '@/components/EntryDrawer'
import { LoadingScreen } from '@/components/LoadingScreen'
import { PassphraseGate } from '@/components/PassphraseGate'
import { PublicPage } from '@/components/PublicPage'
import { SearchDialog } from '@/components/SearchDialog'
import { ThemeToggle } from '@/components/ThemeToggle'
import {
  ENTRIES_KEY,
  useAddEntry,
  useDeleteEntry,
  useEntries,
  useUpdateEntry,
} from '@/hooks/useEntries'
import { UnauthorizedError } from '@/lib/sheets'
import { forgetToken, readToken, writeToken } from '@/lib/storage'
import {
  combinedRating,
  entryId,
  isWatchlist,
  languageLabel,
  MEDIA_LABELS,
  MEDIA_TYPES,
  today,
  type Entry,
  type MediaType,
} from '@/lib/types'
import type { SearchResult } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

/** Sentinel for "don't filter on this", so the selects stay single-valued. */
const ANY = '__any__'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'both', label: 'Both seen' },
  { value: 'fabio', label: 'Fabio' },
  { value: 'haemin', label: 'Haemin' },
  { value: 'watchlist', label: 'Watchlist' },
] as const

type Filter = (typeof FILTERS)[number]['value']

const SORTS = [
  { value: 'watched', label: 'Recently watched' },
  { value: 'added', label: 'Recently added' },
  { value: 'rating-desc', label: 'Highest rated' },
  { value: 'rating-asc', label: 'Lowest rated' },
  { value: 'title', label: 'Title A–Z' },
  { value: 'language', label: 'Language' },
] as const

type Sort = (typeof SORTS)[number]['value']

const SORT_LABELS: Record<string, string> = Object.fromEntries(
  SORTS.map(({ value, label }) => [value, label]),
)

const EMPTY_STATES: Record<Filter, (noun: string) => string> = {
  all: (noun) => `Nothing here yet. Search for a ${noun} to get started.`,
  both: (noun) => `You haven't both seen a ${noun} yet.`,
  fabio: (noun) => `Fabio hasn’t watched a ${noun} yet.`,
  haemin: (noun) => `Haemin hasn’t watched a ${noun} yet.`,
  watchlist: (noun) => `No ${noun}s on the watchlist.`,
}

const MEDIA_NOUNS: Record<MediaType, string> = {
  movie: 'movie',
  tv: 'show',
}

/**
 * The public page is a query string rather than a route: GitHub Pages serves
 * the same index.html whatever follows the base path, so `?shared` is a
 * shareable link with no router and no 404 rewrite rules.
 */
const SHARED_PARAM = 'shared'

function sharedInUrl(): boolean {
  return new URLSearchParams(window.location.search).has(SHARED_PARAM)
}

/**
 * replaceState, not pushState: previewing shouldn't need two taps of Back.
 * The search string is assigned rather than edited through URLSearchParams,
 * which would render the flag as `?shared=` — this link gets shared by hand,
 * so the trailing `=` is worth avoiding. Safe because nothing else in this app
 * puts anything in the query string.
 */
function setSharedInUrl(shared: boolean) {
  const url = new URL(window.location.href)
  url.search = shared ? `?${SHARED_PARAM}` : ''
  window.history.replaceState(null, '', url)
}

export default function App() {
  const queryClient = useQueryClient()
  const [token, setToken] = useState(readToken)
  const [authError, setAuthError] = useState<string>()
  const [filter, setFilter] = useState<Filter>('all')
  const [tab, setTab] = useState<MediaType>('movie')
  const [language, setLanguage] = useState<string>(ANY)
  const [genre, setGenre] = useState<string>(ANY)
  const [sort, setSort] = useState<Sort>('watched')
  const [listQuery, setListQuery] = useState('')
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [editing, setEditing] = useState<{ entry: Entry; isNew: boolean } | null>(null)
  const [publicView, setPublicView] = useState(sharedInUrl)
  // Without a passphrase the public page is the landing page, so reaching the
  // gate is now a deliberate act rather than the default.
  const [gateRequested, setGateRequested] = useState(false)

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
      queryClient.removeQueries({ queryKey: ENTRIES_KEY })
    }
  }, [entriesQuery.error, queryClient])

  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data])

  // Stable, so memoised cards actually stay memoised.
  const openEntry = useCallback((entry: Entry) => {
    setEditing({ entry, isNew: false })
  }, [])

  // Keyed by entry id, not raw tmdb_id: movie and TV ids collide.
  const existingIds = useMemo(
    () => new Set(entries.map((entry) => entry.id)),
    [entries],
  )

  const inTab = useMemo(
    () => entries.filter((entry) => entry.media_type === tab),
    [entries, tab],
  )

  // Both dropdowns offer only what is actually in the current tab, so there is
  // never a language in the list that returns nothing.
  const languages = useMemo(() => {
    const codes = new Set(
      inTab.map((entry) => entry.original_language).filter(Boolean),
    )
    return [...codes].sort((a, b) => languageLabel(a).localeCompare(languageLabel(b)))
  }, [inTab])

  const genres = useMemo(() => {
    const names = new Set(inTab.flatMap((entry) => entry.genres))
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [inTab])

  const languageItems = useMemo(
    () => ({
      [ANY]: 'Any language',
      ...Object.fromEntries(languages.map((code) => [code, languageLabel(code)])),
    }),
    [languages],
  )

  const genreItems = useMemo(
    () => ({
      [ANY]: 'Any genre',
      ...Object.fromEntries(genres.map((name) => [name, name])),
    }),
    [genres],
  )

  // Switching tabs can strip the selected language or genre out from under the
  // dropdown — Korean films but no Korean series. Drop it rather than showing
  // an empty list under a filter that is no longer on offer.
  useEffect(() => {
    if (language !== ANY && !languages.includes(language)) setLanguage(ANY)
  }, [language, languages])

  useEffect(() => {
    if (genre !== ANY && !genres.includes(genre)) setGenre(ANY)
  }, [genre, genres])

  const visible = useMemo(() => {
    const needle = listQuery.trim().toLowerCase()
    return inTab
      .filter((entry) => matchesFilter(entry, filter))
      .filter((entry) => language === ANY || entry.original_language === language)
      .filter((entry) => genre === ANY || entry.genres.includes(genre))
      .filter((entry) => !needle || entry.title.toLowerCase().includes(needle))
      .sort(comparatorFor(sort))
  }, [inTab, filter, language, genre, sort, listQuery])

  // Waits for the card to exist — clearing the filters takes a render, and the
  // entry may have been hidden by whatever was active.
  useEffect(() => {
    if (!pendingScrollId) return
    const card = document.getElementById(`entry-${pendingScrollId}`)
    if (!card) return
    card.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setPendingScrollId(null)
  }, [pendingScrollId, visible])

  useEffect(() => {
    if (!highlightId) return
    const timer = setTimeout(() => setHighlightId(null), 2000)
    return () => clearTimeout(timer)
  }, [highlightId])

  // Watched and watchlist are different kinds of thing, so they get their own
  // sections rather than one run-on list.
  const watched = visible.filter((entry) => !isWatchlist(entry))
  const watchlist = visible.filter(isWatchlist)
  const showSectionHeadings = watched.length > 0 && watchlist.length > 0
  const sections = [
    { title: 'Watched', entries: watched },
    { title: 'Watchlist', entries: watchlist },
  ].filter((section) => section.entries.length > 0)

  function enterPublicView() {
    setPublicView(true)
    setSharedInUrl(true)
  }

  function leavePublicView() {
    setPublicView(false)
    setSharedInUrl(false)
  }

  // A rejected passphrase drops back to the gate with its error, not to the
  // public page — otherwise the typo would look like the app logging you out.
  if (!token && !gateRequested && !authError) {
    return (
      <PublicPage mode="anonymous" onEnter={() => setGateRequested(true)} onExit={leavePublicView} />
    )
  }

  if (!token) {
    return (
      <PassphraseGate
        error={authError}
        onBack={() => {
          setAuthError(undefined)
          setGateRequested(false)
        }}
        onSubmit={(passphrase) => {
          setAuthError(undefined)
          writeToken(passphrase)
          setToken(passphrase)
          // Someone who followed a ?shared link and then signed in has asked
          // to come inside; without this they would land back on the public
          // page, because publicView was seeded from that same URL.
          leavePublicView()
        }}
      />
    )
  }

  // Checked before the loading screen: previewing shouldn't wait on the
  // private list, and the token and query cache are untouched throughout, so
  // this can never log anyone out.
  if (publicView) {
    return <PublicPage mode="preview" onEnter={() => {}} onExit={leavePublicView} />
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

    const id = entryId(result.media_type, result.tmdb_id)

    // Search spans both kinds, so the result may well live in the other tab.
    setTab(result.media_type)

    const existing = entries.find((entry) => entry.id === id)
    if (existing) {
      // Clear anything that could be hiding it, then jump to it and open it.
      setFilter('all')
      setLanguage(ANY)
      setGenre(ANY)
      setListQuery('')
      setPendingScrollId(existing.id)
      setHighlightId(existing.id)
      setEditing({ entry: existing, isNew: false })
      return
    }

    setEditing({ entry: draftFromSearch(result), isNew: true })
  }

  function handleSave(entry: Entry) {
    const original = editing?.entry
    const wasNew = editing?.isNew
    setEditing(null)

    if (wasNew) {
      const { added_at: _ignored, ...newEntry } = entry
      addEntry.mutate(newEntry, {
        onError: (error) => toast.error(`Could not add ${entry.title}`, messageOf(error)),
      })
      return
    }

    // Send only what changed. Sending the whole row would make the last save
    // win outright — so one of you editing a note on a stale tab would quietly
    // revert the other's rating.
    const patch = original ? changedFields(original, entry) : entry
    if (Object.keys(patch).length === 0) return

    updateEntry.mutate(
      { id: entry.id, patch },
      { onError: (error) => toast.error(`Could not save ${entry.title}`, messageOf(error)) },
    )
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
        {/* Four controls plus a title is more than a phone header holds. The
            title is allowed to wrap rather than truncate, and everything but
            Add is icon-only, so at 375 it still lands on one line. */}
        <div className="flex items-center gap-1.5 px-4 py-3">
          <h1 className="min-w-0 flex-1 text-base font-semibold tracking-tight sm:text-lg">
            Have We Seen It?
          </h1>

          <ThemeToggle />

          {/* Icon-only, so the filter chips below get the full width. */}
          <Select
            items={SORT_LABELS}
            value={sort}
            onValueChange={(value) => setSort(value as Sort)}
          >
            {/* The trailing chevron is dropped: next to ⇅ it says nothing the
                icon doesn't, and its ~20px is the difference between the
                title fitting on one line and wrapping on an Android phone. */}
            <SelectTrigger
              size="sm"
              className="shrink-0 px-2 [&>svg:last-child]:hidden"
              aria-label="Sort by"
            >
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

          <Button
            size="sm"
            variant="outline"
            className="shrink-0 px-2"
            aria-label="See the shared page"
            title="See the shared page"
            onClick={enterPublicView}
          >
            <Share2Icon className="text-muted-foreground" />
          </Button>

          <Button size="sm" className="shrink-0" onClick={() => setSearchOpen(true)}>
            <SearchIcon />
            Add
          </Button>
        </div>

        <div className="px-4 pb-2">
          <ToggleGroup
            value={[tab]}
            onValueChange={(value) => {
              const next = value[0]
              if (next) setTab(next as MediaType)
            }}
            variant="outline"
            size="sm"
            spacing={0}
            className="w-full select-none"
          >
            {MEDIA_TYPES.map((value) => (
              <ToggleGroupItem key={value} value={value} className="flex-1">
                {MEDIA_LABELS[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Every way of narrowing the list in one place: the person chips
            first, then language and genre as compact dropdowns that only
            appear once there is a real choice to make. The row wraps rather
            than scrolls — a clipped dropdown reads as a rendering bug, not
            as "more this way". A dropdown with an active filter darkens so
            it reads as "on" at a glance. */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
          <ToggleGroup
            value={[filter]}
            onValueChange={(value) => {
              const next = value[0]
              if (next) setFilter(next as Filter)
            }}
            variant="outline"
            size="sm"
            className="w-max shrink-0 select-none"
          >
            {FILTERS.map(({ value, label }) => (
              <ToggleGroupItem key={value} value={value} className="whitespace-nowrap px-3">
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {languages.length > 1 && (
            <Select
              items={languageItems}
              value={language}
              onValueChange={(value) => setLanguage(value as string)}
            >
              <SelectTrigger
                size="sm"
                className={cn('shrink-0', language !== ANY && 'border-foreground/30 bg-muted')}
                aria-label="Language"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(languageItems).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {genres.length > 1 && (
            <Select
              items={genreItems}
              value={genre}
              onValueChange={(value) => setGenre(value as string)}
            >
              <SelectTrigger
                size="sm"
                className={cn('shrink-0', genre !== ANY && 'border-foreground/30 bg-muted')}
                aria-label="Genre"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(genreItems).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <main className="space-y-2 p-4">
        {entries.length > 0 && (
          <div className="relative pb-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={listQuery}
              onChange={(event) => setListQuery(event.target.value)}
              placeholder="Filter your list…"
              aria-label="Filter your list"
              className="pl-9"
            />
            {listQuery && (
              <button
                type="button"
                onClick={() => setListQuery('')}
                aria-label="Clear filter"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            )}
          </div>
        )}

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
            {listQuery.trim()
              ? `Nothing in your list matches “${listQuery.trim()}”.`
              : language !== ANY || genre !== ANY
                ? 'Nothing matches those filters.'
                : EMPTY_STATES[filter](MEDIA_NOUNS[tab])}
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
                highlighted={entry.id === highlightId}
                onSelect={openEntry}
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
    // Everything that person has seen, shared watches included — "only Fabio"
    // turned out to be the less useful cut.
    case 'fabio':
      return entry.fabio_watched
    case 'haemin':
      return entry.haemin_watched
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
    // Groups the Korean films together and sorts within each group by title,
    // which is the point of sorting by language at all.
    case 'language':
      return (a, b) => {
        const left = languageLabel(a.original_language)
        const right = languageLabel(b.original_language)
        return left === right
          ? a.title.localeCompare(b.title)
          : left.localeCompare(right)
      }
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

function changedFields(before: Entry, after: Entry): Partial<Entry> {
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(after) as Array<keyof Entry>) {
    if (key === 'id' || key === 'added_at') continue
    if (!sameValue(before[key], after[key])) patch[key] = after[key]
  }
  return patch as Partial<Entry>
}

/**
 * Seasons and genres are arrays, and a fresh one is a different reference on
 * every render — comparing by identity would put them in every patch and
 * quietly undo the point of sending diffs at all. Both are kept sorted, so
 * comparing in order is enough.
 */
function sameValue(before: unknown, after: unknown): boolean {
  if (Array.isArray(before) && Array.isArray(after)) {
    return (
      before.length === after.length &&
      before.every((value, index) => value === after[index])
    )
  }
  return before === after
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
    fabio_seasons: [],
    haemin_seasons: [],
    original_language: result.original_language,
    genres: result.genres,
  }
}

function messageOf(error: unknown) {
  return { description: error instanceof Error ? error.message : 'Please try again.' }
}
