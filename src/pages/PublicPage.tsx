import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { StarIcon, UserRoundIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MediaTabs } from '@/components/MediaTabs'
import { PERSON_STYLES } from '@/components/personStyles'
import { Poster } from '@/components/Poster'
import { ThemeToggle } from '@/components/ThemeToggle'
import { bestRating } from '@/lib/entries'
import { titleMeta } from '@/lib/format'
import { fetchPublicSnapshot } from '@/lib/sheets'
import { PEOPLE, PERSON_LABELS, type MediaType, type PublicEntry } from '@/lib/types'

interface Props {
  /** Shown to visitors without a passphrase. */
  onLogin?: () => void
  /** Shown when a signed-in user is previewing the page. */
  onExitPreview?: () => void
}

const EMPTY_TAB: Record<MediaType, string> = {
  movie: 'No films up here yet.',
  tv: 'No shows up here yet.',
}

/** Read-only page of the titles either person rated 9 or higher. */
export function PublicPage({ onLogin, onExitPreview }: Props) {
  const [tab, setTab] = useState<MediaType>('movie')

  const snapshot = useQuery({
    queryKey: ['public-snapshot'],
    queryFn: fetchPublicSnapshot,
  })

  const entries = snapshot.data?.entries ?? []
  const visible = entries.filter((entry) => entry.media_type === tab)

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-16">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 flex-1 text-lg font-semibold tracking-tight">
              Have We Seen It?
            </h1>

            <ThemeToggle />

            {onExitPreview && (
              <Button size="sm" variant="outline" className="shrink-0" onClick={onExitPreview}>
                Exit preview
              </Button>
            )}
            {onLogin && (
              <Button size="sm" variant="outline" className="shrink-0" onClick={onLogin}>
                Log in
              </Button>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Everything {PERSON_LABELS.person1} or {PERSON_LABELS.person2} rated 9 or higher.
          </p>
        </div>

        <div className="px-4 pb-3">
          <MediaTabs value={tab} onChange={setTab} />
        </div>
      </header>

      <main className="space-y-2 p-4">
        {snapshot.isPending ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {entries.length === 0
              ? 'Nothing here yet — no favourites have been picked out.'
              : EMPTY_TAB[tab]}
          </p>
        ) : (
          visible.map((entry) => <PublicCard key={entry.id} entry={entry} />)
        )}
      </main>
    </div>
  )
}

function PublicCard({ entry }: { entry: PublicEntry }) {
  // The page promises 9+, so the headline is the higher rating, not the average.
  const best = bestRating(entry)
  const meta = [...titleMeta(entry), ...(entry.genres.length > 0 ? [entry.genres.join(', ')] : [])]

  return (
    <div className="flex w-full items-center gap-3 rounded-lg border bg-card p-3">
      <Poster path={entry.poster_path} title={entry.title} className="h-20 w-14 shrink-0" />

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="min-w-0">
          <p className="font-medium leading-tight">{entry.title}</p>
          <p className="text-xs text-muted-foreground">{meta.join(' · ')}</p>
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
