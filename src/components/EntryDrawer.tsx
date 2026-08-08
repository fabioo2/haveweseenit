import { useEffect, useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Poster } from '@/components/Poster'
import { RatingPicker } from '@/components/RatingPicker'
import { combinedRating, PERSON_LABELS, type Entry } from '@/lib/types'
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

  useEffect(() => {
    setEntry(draft)
  }, [draft])

  if (!entry) return null

  const patch = (changes: Partial<Entry>) =>
    setEntry((current) => (current ? { ...current, ...changes } : current))

  const watchedByAnyone = entry.fabio_watched || entry.haemin_watched
  const combined = combinedRating(entry)

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[92dvh]">
        <div className="mx-auto flex w-full max-w-md flex-col overflow-y-auto">
          <DrawerHeader className="flex flex-row items-center gap-3 text-left">
            <Poster
              path={entry.poster_path}
              title={entry.title}
              size="w154"
              className="h-24 w-16 shrink-0"
            />
            <div className="min-w-0">
              <DrawerTitle className="truncate">{entry.title}</DrawerTitle>
              <DrawerDescription>
                {entry.year ?? 'Year unknown'}
                {combined !== null && ` · ${formatRating(combined)} combined`}
              </DrawerDescription>
            </div>
          </DrawerHeader>

          <div className="space-y-5 px-4 pb-2">
            {(['fabio', 'haemin'] as const).map((person) => {
              const watched = entry[`${person}_watched`]
              return (
                <div key={person} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">{PERSON_LABELS[person]}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant={watched ? 'default' : 'outline'}
                      onClick={() =>
                        patch({
                          [`${person}_watched`]: !watched,
                          // Clearing "watched" should not leave a stray rating behind.
                          ...(watched ? { [`${person}_rating`]: null } : {}),
                        } as Partial<Entry>)
                      }
                    >
                      {watched ? 'Watched' : 'Not yet'}
                    </Button>
                  </div>

                  <div className={cn(!watched && 'pointer-events-none opacity-40')}>
                    <RatingPicker
                      label={`${PERSON_LABELS[person]} rating`}
                      value={entry[`${person}_rating`]}
                      onChange={(value) =>
                        patch({ [`${person}_rating`]: value } as Partial<Entry>)
                      }
                    />
                  </div>
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
              </p>
            )}
          </div>

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
