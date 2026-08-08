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

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** tmdb ids already in the list, so we can mark them instead of allowing a duplicate. */
  existingIds: Set<number>
  onSelect: (result: SearchResult) => void
}

export function SearchDialog({ open, onOpenChange, existingIds, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)

    const timer = setTimeout(() => {
      searchMovies(trimmed, controller.signal)
        .then((found) => setResults(found))
        .catch(() => {
          /* aborted or offline — leave the previous results in place */
        })
        .finally(() => setLoading(false))
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
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader className="sr-only">
        <DialogTitle>Search movies</DialogTitle>
        <DialogDescription>Find a movie to add to your list</DialogDescription>
      </DialogHeader>

      <DialogContent
        className="top-1/3 translate-y-0 overflow-hidden rounded-xl! p-0"
        showCloseButton={false}
      >
        {/* TMDB already ranks the results, so cmdk must not re-filter them. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search for a movie…"
          />
          <CommandList>
            <CommandEmpty>
              {loading
                ? 'Searching…'
                : query.trim()
                  ? 'Nothing found.'
                  : 'Start typing a title.'}
            </CommandEmpty>

            {results.map((result) => {
              const alreadyAdded = existingIds.has(result.tmdb_id)
              return (
                <CommandItem
                  key={result.tmdb_id}
                  value={String(result.tmdb_id)}
                  disabled={alreadyAdded}
                  onSelect={() => {
                    if (alreadyAdded) return
                    onSelect(result)
                  }}
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
