import { useQuery } from '@tanstack/react-query'
import { StarIcon, UserRoundIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Poster } from '@/components/Poster'
import { fetchPublicSnapshot } from '@/lib/sheets'
import {
  languageLabel,
  PEOPLE,
  PERSON_LABELS,
  PERSON_STYLES,
  type PublicEntry,
} from '@/lib/types'

interface Props {
  /** `preview` is one of them looking at their own shared page, and can go back. */
  mode: 'anonymous' | 'preview'
  onEnter: () => void
  onExit: () => void
}

/**
 * What the world sees without the passphrase: the titles either of them scored
 * 9 or higher, and nothing else. The payload it renders is built server-side —
 * notes and watch dates are not withheld here, they never arrive.
 */
export function PublicPage({ mode, onEnter, onExit }: Props) {
  const snapshot = useQuery({
    queryKey: ['public-snapshot'],
    queryFn: fetchPublicSnapshot,
  })

  const entries = snapshot.data?.entries ?? []

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-16">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              Have We Seen It?
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              Everything Fabio or Haemin rated 9 or higher.
            </p>
          </div>

          {mode === 'preview' ? (
            <Button size="sm" variant="outline" className="shrink-0" onClick={onExit}>
              Exit preview
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="shrink-0" onClick={onEnter}>
              Log in
            </Button>
          )}
        </div>
      </header>

      <main className="space-y-2 p-4">
        {snapshot.isPending ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nothing here yet — no favourites have been picked out.
          </p>
        ) : (
          entries.map((entry) => <PublicCard key={entry.id} entry={entry} />)
        )}
      </main>
    </div>
  )
}

function PublicCard({ entry }: { entry: PublicEntry }) {
  // The headline is the best of the two, not their average: this page is "one
  // of us rated it 9+", so averaging a 9 with a 6 would print 7.5 under a
  // heading promising 9 or higher. Both scores are on the badges either way,
  // so the disagreement is still visible rather than averaged away.
  const best = bestRating(entry)

  const meta = [
    entry.year ? String(entry.year) : 'Year unknown',
    entry.media_type === 'tv' ? 'TV' : 'Movie',
    // English is the unmarked case, exactly as on the private card.
    entry.original_language && entry.original_language !== 'en'
      ? languageLabel(entry.original_language)
      : null,
    entry.genres.length > 0 ? entry.genres.join(', ') : null,
  ].filter(Boolean)

  return (
    <div className="flex w-full items-center gap-3 rounded-lg border bg-card p-3">
      <Poster path={entry.poster_path} title={entry.title} className="h-20 w-14 shrink-0" />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="min-w-0">
          <p className="truncate font-medium leading-tight">{entry.title}</p>
          <p className="truncate text-xs text-muted-foreground">{meta.join(' · ')}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PEOPLE.map((person) => {
            const rating = entry[`${person}_rating`]
            if (rating === null) return null
            const style = PERSON_STYLES[person]
            return (
              <Badge key={person} variant="outline" className={style.badge}>
                <UserRoundIcon className={style.icon} />
                {PERSON_LABELS[person]} {rating}
              </Badge>
            )
          })}
        </div>
      </div>

      {best !== null && (
        <div className="shrink-0 pr-1 text-right">
          <p className="flex items-center gap-1 text-xl font-semibold leading-none">
            <StarIcon className="size-4 fill-amber-400 text-amber-500" />
            {best}
          </p>
        </div>
      )}
    </div>
  )
}

function bestRating(entry: PublicEntry): number | null {
  const given = [entry.fabio_rating, entry.haemin_rating].filter(
    (rating): rating is number => rating !== null,
  )
  return given.length > 0 ? Math.max(...given) : null
}
