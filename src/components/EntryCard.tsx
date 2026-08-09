import { memo } from 'react'
import { BookmarkIcon, StarIcon, UserRoundIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Poster } from '@/components/Poster'
import {
  combinedRating,
  formatSeasons,
  isWatchlist,
  languageLabel,
  PEOPLE,
  PERSON_LABELS,
  PERSON_STYLES,
  seasonsSeen,
  type Entry,
} from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  entry: Entry
  onSelect: (entry: Entry) => void
  /** Briefly ringed after the search jumps to this entry. */
  highlighted?: boolean
}

/** Memoised: every keystroke in the list filter re-renders the whole list. */
export const EntryCard = memo(function EntryCard({ entry, onSelect, highlighted }: Props) {
  const combined = combinedRating(entry)
  const watchlist = isWatchlist(entry)
  const raters = PEOPLE.filter((person) => entry[`${person}_rating`] !== null)
  const seasons = seasonsSeen(entry)

  const meta = [
    entry.year ? String(entry.year) : 'Year unknown',
    // English is the unmarked case: tagging every Hollywood film "English"
    // would bury the Korean and Japanese ones this line exists to surface.
    entry.original_language && entry.original_language !== 'en'
      ? languageLabel(entry.original_language)
      : null,
    seasons.length > 0 ? formatSeasons(seasons) : null,
    entry.date_watched ? `watched ${formatDate(entry.date_watched)}` : null,
  ].filter(Boolean)

  return (
    <button
      type="button"
      id={`entry-${entry.id}`}
      onClick={() => onSelect(entry)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-all hover:bg-accent/50 focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
        highlighted && 'border-primary ring-[3px] ring-primary/30',
      )}
    >
      <Poster
        path={entry.poster_path}
        title={entry.title}
        className="h-20 w-14 shrink-0"
      />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{entry.title}</p>
          <p className="truncate text-xs text-muted-foreground">{meta.join(' · ')}</p>
        </div>

        {watchlist ? (
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          >
            <BookmarkIcon className="text-amber-600 dark:text-amber-400" />
            Watchlist
          </Badge>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {PEOPLE.map((person) => {
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
          {/* Only an average of two is "both" — with one rating this is just
              that person's score, and labelling it "both" reads as a lie. */}
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {raters.length > 1 ? 'both' : PERSON_LABELS[raters[0]]}
          </p>
        </div>
      )}
    </button>
  )
})

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
