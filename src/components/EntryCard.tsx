import { Badge } from '@/components/ui/badge'
import { Poster } from '@/components/Poster'
import { combinedRating, isWatchlist, PERSON_LABELS, type Entry } from '@/lib/types'

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
          <Badge variant="outline">Watchlist</Badge>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(['fabio', 'haemin'] as const).map((person) => {
              if (!entry[`${person}_watched`]) return null
              const rating = entry[`${person}_rating`]
              return (
                <Badge key={person} variant="secondary">
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
          <p className="text-xl font-semibold leading-none">{formatRating(combined)}</p>
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
