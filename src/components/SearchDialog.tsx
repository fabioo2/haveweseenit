import { useState } from 'react'
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
import { useTitleSearch } from '@/hooks/useTitleSearch'
import { entryId } from '@/lib/entries'
import { titleMeta } from '@/lib/format'
import type { SearchResult } from '@/lib/tmdb'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ids already in the list, marked as "Added" in the results. */
  existingIds: Set<string>
  onSelect: (result: SearchResult) => void
}

export function SearchDialog({ open, onOpenChange, existingIds, onSelect }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Near the top on phones so the keyboard doesn't cover the results. */}
      <DialogContent
        className="top-[max(1rem,env(safe-area-inset-top))] translate-y-0 overflow-hidden rounded-xl! p-0 sm:top-1/3"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search movies and TV</DialogTitle>
          <DialogDescription>Find a movie or series to add to your list</DialogDescription>
        </DialogHeader>

        {/* Unmounted when the dialog closes, so each search starts empty. */}
        <SearchCommand existingIds={existingIds} onSelect={onSelect} />
      </DialogContent>
    </Dialog>
  )
}

function SearchCommand({ existingIds, onSelect }: Pick<Props, 'existingIds' | 'onSelect'>) {
  const [query, setQuery] = useState('')
  const { results, loading, error } = useTitleSearch(query)

  return (
    // TMDB already ranks results, so cmdk's own filtering is off.
    <Command shouldFilter={false}>
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search for a movie or show…"
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
          return (
            <CommandItem
              key={id}
              value={id}
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
                <p className="line-clamp-2 font-medium">{result.title}</p>
                <p className="text-xs text-muted-foreground">{titleMeta(result).join(' · ')}</p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {result.media_type === 'tv' ? 'TV' : 'Movie'}
              </Badge>
              {existingIds.has(id) && <Badge variant="secondary">Added</Badge>}
            </CommandItem>
          )
        })}
      </CommandList>
    </Command>
  )
}
