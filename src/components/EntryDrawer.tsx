import { useEffect, useState } from 'react'
import { StarIcon } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { Poster } from '@/components/Poster'
import { RatingPicker } from '@/components/RatingPicker'
import {
  combinedRating,
  PEOPLE,
  PERSON_LABELS,
  today,
  type Entry,
  type Person,
} from '@/lib/types'

interface Props {
  draft: Entry | null
  isNew: boolean
  onClose: () => void
  onSave: (entry: Entry) => void
  onDelete: (id: string) => void
}

export function EntryDrawer({ draft, isNew, onClose, onSave, onDelete }: Props) {
  const [entry, setEntry] = useState<Entry | null>(draft)

  useEffect(() => {
    setEntry(draft)
  }, [draft])

  if (!entry) return null

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
        // Clearing "watched" should not leave a stray rating behind.
        ...(watched ? withDate(current) : { [`${person}_rating`]: null }),
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
              <DrawerTitle className="truncate">{entry.title}</DrawerTitle>
              <DrawerDescription className="flex items-center gap-2 text-left">
                <span>{entry.year ?? 'Year unknown'}</span>
                {combined !== null && (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <StarIcon className="size-3.5 fill-amber-400 text-amber-500" />
                    {formatRating(combined)}
                  </span>
                )}
              </DrawerDescription>
            </div>
          </DrawerHeader>

          <div className="space-y-5 px-4 pb-2">
            {PEOPLE.map((person) => {
              const watched = entry[`${person}_watched`]
              return (
                <div key={person} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${person}-watched`} className="text-base">
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
                      />
                    </div>
                  </div>

                  <RatingPicker
                    label={`${PERSON_LABELS[person]} rating`}
                    value={entry[`${person}_rating`]}
                    onChange={(value) => setRating(person, value)}
                  />
                </div>
              )
            })}

            <Separator />

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
                Tap a score to mark it watched.
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

function formatRating(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
