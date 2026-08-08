import { useEffect, useState } from 'react'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Poster } from '@/components/Poster'
import { searchMovies, type SearchResult } from '@/lib/tmdb'
import { entryId } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Entry ids already in the list, so we can mark them rather than duplicate them. */
  existingIds: Set<string>
  onSelect: (result: SearchResult) => void
}

export function SearchDialog({ open, onOpenChange, existingIds, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      setError(undefined)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(undefined)

    const timer = setTimeout(() => {
      searchMovies(trimmed, controller.signal)
        .then((found) => {
          setResults(found)
          setLoading(false)
        })
        .catch((cause: unknown) => {
          // An abort is the normal case — every keystroke cancels the previous
          // request — so only a real failure should be reported or clear the
          // loading state, which the next request has already taken over.
          if (controller.signal.aborted) return
          setError(
            cause instanceof Error && cause.message
              ? cause.message
              : 'Search is unavailable right now.',
          )
          setLoading(false)
        })
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  // Start each visit with a clean slate rather than last week's search.
  useEffect(() => {
    if (!open) {
      setQuery('')
      setResults([])
      setError(undefined)
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search movies</DialogTitle>
          <DialogDescription>Find a movie to add to your list</DialogDescription>
        </DialogHeader>

        {/* TMDB already ranks the results, so cmdk must not re-filter them. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search for a movie…"
          />
          <CommandList>
            <CommandEmpty>
              {error
                ? error
                : loading
                  ? 'Searching…'
                  : query.trim()
                    ? 'Nothing found.'
                    : 'Start typing a title.'}
            </CommandEmpty>

            {results.map((result) => {
              const id = entryId(result.media_type, result.tmdb_id)
              const alreadyAdded = existingIds.has(id)
              return (
                <CommandItem
                  key={id}
                  value={id}
                  // Still selectable when added: picking it jumps to the entry
                  // rather than doing nothing.
                  onSelect={() => onSelect(result)}
                  className="gap-3"
                >
                  <Poster
                    path={result.poster_path}
                    title={result.title}
                    size="w92"
                    className="h-14 w-10 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{result.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {result.year ?? 'Year unknown'}
                    </p>
                  </div>
                  {alreadyAdded && <Badge variant="secondary">Added</Badge>}
                </CommandItem>
              )
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
