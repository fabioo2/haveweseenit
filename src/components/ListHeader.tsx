import { ArrowUpDownIcon, SearchIcon, Share2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select'
import { FilterBar } from '@/components/FilterBar'
import { MediaTabs } from '@/components/MediaTabs'
import { ThemeToggle } from '@/components/ThemeToggle'
import { SORT_LABELS, SORTS, type Sort } from '@/lib/listing'
import { useListView } from '@/store/listView'

interface Props {
  languages: string[]
  genres: string[]
  onShowPublicPage: () => void
}

export function ListHeader({ languages, genres, onShowPublicPage }: Props) {
  const tab = useListView((state) => state.tab)
  const setTab = useListView((state) => state.setTab)
  const sort = useListView((state) => state.sort)
  const setSort = useListView((state) => state.setSort)
  const setSearchOpen = useListView((state) => state.setSearchOpen)

  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
      {/* Four controls plus a title is more than a phone header holds. The
          title is allowed to wrap rather than truncate, and everything but
          Add is icon-only, so at 375 it still lands on one line. */}
      <div className="flex items-center gap-1.5 px-4 py-3">
        <h1 className="min-w-0 flex-1 text-base font-semibold tracking-tight sm:text-lg">
          Have We Seen It?
        </h1>

        <ThemeToggle />

        {/* Icon-only, so the filter chips below get the full width. */}
        <Select items={SORT_LABELS} value={sort} onValueChange={(value) => setSort(value as Sort)}>
          {/* The trailing chevron is dropped: next to ⇅ it says nothing the
              icon doesn't, and its ~20px is the difference between the
              title fitting on one line and wrapping on an Android phone. */}
          <SelectTrigger
            size="sm"
            className="shrink-0 px-2 [&>svg:last-child]:hidden"
            aria-label="Sort by"
          >
            <ArrowUpDownIcon className="text-muted-foreground" />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          className="shrink-0 px-2"
          aria-label="See the shared page"
          title="See the shared page"
          onClick={onShowPublicPage}
        >
          <Share2Icon className="text-muted-foreground" />
        </Button>

        <Button size="sm" className="shrink-0" onClick={() => setSearchOpen(true)}>
          <SearchIcon />
          Add
        </Button>
      </div>

      <div className="px-4 pb-2">
        <MediaTabs value={tab} onChange={setTab} />
      </div>

      <FilterBar languages={languages} genres={genres} />
    </header>
  )
}
