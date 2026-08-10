import { useEffect, useState } from 'react'
import { CheckIcon, StarIcon } from 'lucide-react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Poster } from '@/components/Poster'
import { RatingPicker } from '@/components/RatingPicker'
import { seasonOptions, useSeasons } from '@/hooks/useSeasons'
import type { Season } from '@/lib/tmdb'
import {
  combinedRating,
  formatSeasons,
  languageLabel,
  PEOPLE,
  PERSON_LABELS,
  PERSON_STYLES,
  today,
  type Entry,
  type Person,
} from '@/lib/types'
import { cn } from '@/lib/utils'

interface Props {
  draft: Entry | null
  isNew: boolean
  onClose: () => void
  onSave: (entry: Entry) => void
  onDelete: (id: string) => void
}

export function EntryDrawer({ draft, isNew, onClose, onSave, onDelete }: Props) {
  const [entry, setEntry] = useState<Entry | null>(draft)
  const seasonsQuery = useSeasons(entry)

  useEffect(() => {
    setEntry(draft)
  }, [draft])

  if (!entry) return null

  const isSeries = entry.media_type === 'tv'

  const patch = (changes: Partial<Entry>) =>
    setEntry((current) => (current ? { ...current, ...changes } : current))

  /** Promoting something off the watchlist shouldn't leave it dateless. */
  const withDate = (current: Entry) =>
    current.date_watched ? {} : { date_watched: today() }

  function setWatched(person: Person, watched: boolean) {
    setEntry((current) => {
      if (!current) return current
      return {
        ...current,
        [`${person}_watched`]: watched,
        // Clearing "watched" should not leave a stray rating or a list of
        // seasons behind claiming otherwise.
        ...(watched
          ? withDate(current)
          : { [`${person}_rating`]: null, [`${person}_seasons`]: [] }),
      }
    })
  }

  /**
   * Ticking a season is the series-shaped way of saying you watched it, so it
   * marks the person watched exactly as tapping a score does. Untickng the last
   * one is the undo of that, and lands back on the watchlist rather than
   * leaving a watched show with nothing behind it.
   */
  function setSeasons(person: Person, seasons: number[]) {
    setEntry((current) => {
      if (!current) return current
      const sorted = [...seasons].sort((a, b) => a - b)

      if (sorted.length === 0) {
        return {
          ...current,
          [`${person}_seasons`]: [],
          [`${person}_watched`]: false,
          [`${person}_rating`]: null,
        }
      }

      return {
        ...current,
        [`${person}_seasons`]: sorted,
        [`${person}_watched`]: true,
        ...withDate(current),
      }
    })
  }

  /**
   * A score implies you saw it, so scoring marks it watched rather than making
   * you say so first. That was the confusing part: you had to answer "did you
   * watch this" before the app would let you say what you thought of it.
   */
  function setRating(person: Person, rating: number | null) {
    setEntry((current) => {
      if (!current) return current
      return {
        ...current,
        [`${person}_rating`]: rating,
        ...(rating === null
          ? {}
          : { [`${person}_watched`]: true, ...withDate(current) }),
      }
    })
  }

  const watchedByAnyone = entry.fabio_watched || entry.haemin_watched
  const combined = combinedRating(entry)

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[92dvh]">
        <div className="mx-auto flex w-full max-w-md flex-col overflow-y-auto">
          {/* pb: DrawerHeader's base is p-4 pb-0, which leaves the poster
              touching the first person row. */}
          {/* md:gap-6 matters: DrawerHeader's base styles include md:gap-0.5,
              which beats a plain gap-6 at desktop widths. */}
          <DrawerHeader className="flex flex-row items-center gap-6 pt-8 pb-6 md:gap-6">
            <Poster
              path={entry.poster_path}
              title={entry.title}
              size="w154"
              className="h-24 w-16 shrink-0"
            />
            {/* text-left on the wrapper, not the header: a bottom drawer sets
                text-center via a group-data variant that outranks a plain
                utility on the header itself. */}
            <div className="min-w-0 flex-1 text-left">
              <DrawerTitle>{entry.title}</DrawerTitle>
              <DrawerDescription className="flex flex-wrap items-center gap-x-2 text-left">
                <span>{entry.year ?? 'Year unknown'}</span>
                {entry.original_language && (
                  <span>· {languageLabel(entry.original_language)}</span>
                )}
                {combined !== null && (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <StarIcon className="size-3.5 fill-amber-400 text-amber-500" />
                    {formatRating(combined)}
                  </span>
                )}
                {entry.genres.length > 0 && (
                  <span className="w-full">{entry.genres.join(' · ')}</span>
                )}
              </DrawerDescription>
            </div>
          </DrawerHeader>

          <div className="space-y-4 px-4 pb-2">
            {/* One tinted card per person: the switch, the seasons and the
                score are all answers about that person, and floating in a
                shared column they read as three unrelated widgets. */}
            {PEOPLE.map((person) => {
              const watched = entry[`${person}_watched`]
              const style = PERSON_STYLES[person]
              return (
                <div key={person} className={cn('space-y-3 rounded-xl border p-3', style.card)}>
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={`${person}-watched`}
                      className="flex items-center gap-2 text-base"
                    >
                      <span className={cn('size-2 rounded-full', style.dot)} />
                      {PERSON_LABELS[person]}
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {watched ? 'Watched' : 'Not watched'}
                      </span>
                      <Switch
                        id={`${person}-watched`}
                        checked={watched}
                        onCheckedChange={(checked) => setWatched(person, checked)}
                        className={style.switch}
                      />
                    </div>
                  </div>

                  {isSeries && (
                    <SeasonPicker
                      person={person}
                      seasons={seasonOptions(
                        seasonsQuery.data,
                        entry[`${person}_seasons`],
                      )}
                      loading={seasonsQuery.isPending}
                      selected={entry[`${person}_seasons`]}
                      onChange={(seasons) => setSeasons(person, seasons)}
                      fillClass={style.fill}
                    />
                  )}

                  <RatingPicker
                    label={`${PERSON_LABELS[person]} rating`}
                    value={entry[`${person}_rating`]}
                    onChange={(value) => setRating(person, value)}
                    fillClass={style.fill}
                  />
                </div>
              )
            })}

            {watchedByAnyone && (
              <div className="space-y-2">
                <Label htmlFor="date-watched">Date watched</Label>
                <Input
                  id="date-watched"
                  type="date"
                  value={entry.date_watched}
                  onChange={(event) => patch({ date_watched: event.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                value={entry.notes}
                placeholder="Optional"
                onChange={(event) => patch({ notes: event.target.value })}
              />
            </div>

            {!watchedByAnyone && (
              <p className="text-sm text-muted-foreground">
                Neither of you has watched this yet, so it goes on the watchlist.
                {isSeries
                  ? ' Tap a season or a score to mark it watched.'
                  : ' Tap a score to mark it watched.'}
              </p>
            )}
          </div>

          {/* pb-8 keeps the last button clear of the home indicator on a phone. */}
          <DrawerFooter>
            <Button
              onClick={() =>
                onSave({
                  ...entry,
                  // A watchlist item has no watched date to record.
                  date_watched: watchedByAnyone ? entry.date_watched : '',
                })
              }
            >
              {isNew ? 'Add' : 'Save'}
            </Button>

            {!isNew && (
              <Button variant="ghost" onClick={() => onDelete(entry.id)}>
                Remove
              </Button>
            )}

            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

interface SeasonPickerProps {
  person: Person
  seasons: Season[]
  loading: boolean
  selected: number[]
  onChange: (seasons: number[]) => void
  fillClass: string
}

/**
 * Numbers rather than season names, so a ten-season show still fits one row on
 * a phone; the full name and episode count live in the title attribute.
 *
 * Plain buttons rather than ToggleGroup: the base toggle marks "on" with a
 * whisper of bg-muted, and out-shouting it per person means fighting variant
 * specificity. A tick plus the person's colour makes selection unmissable, and
 * makes this row read as "pick a set" against the rating scale's "pick a
 * level" below it.
 */
function SeasonPicker({ person, seasons, loading, selected, onChange, fillClass }: SeasonPickerProps) {
  if (seasons.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {loading ? 'Loading seasons…' : 'No season list available for this one.'}
      </p>
    )
  }

  const everySeason = seasons.map((season) => season.season_number)
  const allSelected = selected.length === everySeason.length
  const chosen = new Set(selected)

  const toggle = (season: number) =>
    onChange(
      chosen.has(season)
        ? selected.filter((value) => value !== season)
        : [...selected, season],
    )

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span
          id={`${person}-seasons`}
          className="text-xs font-medium text-muted-foreground"
        >
          Seasons {selected.length > 0 && `· ${formatSeasons(selected)}`}
        </span>
        {/* Bingeing the whole thing is the common case; ticking eight chips
            one at a time to say so is not. */}
        <button
          type="button"
          onClick={() => onChange(allSelected ? [] : everySeason)}
          className="rounded-md px-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {allSelected ? 'Clear' : 'All'}
        </button>
      </div>

      <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
        <div
          role="group"
          aria-labelledby={`${person}-seasons`}
          className="flex w-max select-none gap-1"
        >
          {seasons.map((season) => {
            const isOn = chosen.has(season.season_number)
            return (
              <button
                key={season.season_number}
                type="button"
                aria-pressed={isOn}
                onClick={() => toggle(season.season_number)}
                title={
                  season.episode_count
                    ? `${season.name} · ${season.episode_count} episodes`
                    : season.name
                }
                className={cn(
                  'flex h-8 min-w-9 items-center justify-center gap-1 rounded-md border px-2 text-sm font-medium transition-colors',
                  'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                  isOn
                    ? fillClass
                    : 'border-input bg-background text-muted-foreground hover:bg-accent',
                )}
              >
                {isOn && <CheckIcon className="size-3" />}
                {season.season_number}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function formatRating(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
