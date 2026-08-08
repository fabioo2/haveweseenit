import { BookmarkIcon, StarIcon, UserRoundIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Poster } from '@/components/Poster'
import {
  combinedRating,
  isWatchlist,
  PERSON_LABELS,
  PERSON_STYLES,
  type Entry,
} from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  entry: Entry
  onSelect: (entry: Entry) => void
}

export function EntryCard({ entry, onSelect }: Props) {
  const combined = combinedRating(entry)
  const watchlist = isWatchlist(entry)

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
    >
      <Poster
        path={entry.poster_path}
        title={entry.title}
        className="h-20 w-14 shrink-0"
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{entry.title}</p>
          <p className="text-xs text-muted-foreground">
            {entry.year ?? 'Year unknown'}
            {entry.date_watched && ` · watched ${formatDate(entry.date_watched)}`}
          </p>
        </div>

        {watchlist ? (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <BookmarkIcon className="text-amber-600 dark:text-amber-400" />
            Watchlist
          </Badge>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(['fabio', 'haemin'] as const).map((person) => {
              if (!entry[`${person}_watched`]) return null
              const rating = entry[`${person}_rating`]
              const style = PERSON_STYLES[person]
              return (
                <Badge key={person} variant="outline" className={cn(style.badge)}>
                  <UserRoundIcon className={style.icon} />
                  {PERSON_LABELS[person]}
                  {rating === null ? '' : ` ${rating}`}
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      {combined !== null && (
        <div className="shrink-0 text-right">
          <p className="flex items-center gap-1 text-xl font-semibold leading-none">
            <StarIcon className="size-4 fill-amber-400 text-amber-500" />
            {formatRating(combined)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">both</p>
        </div>
      )}
    </button>
  )
}

function formatRating(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/** date_watched is a plain YYYY-MM-DD string; parsing it as UTC avoids an off-by-one day. */
function formatDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
