import { useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ANY, FILTERS, type Filter } from '@/lib/listing'
import { languageLabel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useListView } from '@/store/listView'

interface Props {
  languages: string[]
  genres: string[]
}

/**
 * Every way of narrowing the list in one place: the person chips first, then
 * language and genre as compact dropdowns that only appear once there is a
 * real choice to make. The row wraps rather than scrolls — a clipped dropdown
 * reads as a rendering bug, not as "more this way".
 */
export function FilterBar({ languages, genres }: Props) {
  const filter = useListView((state) => state.filter)
  const setFilter = useListView((state) => state.setFilter)
  const language = useListView((state) => state.language)
  const setLanguage = useListView((state) => state.setLanguage)
  const genre = useListView((state) => state.genre)
  const setGenre = useListView((state) => state.setGenre)

  const languageItems = useMemo(
    () => ({
      [ANY]: 'Any language',
      ...Object.fromEntries(languages.map((code) => [code, languageLabel(code)])),
    }),
    [languages],
  )

  const genreItems = useMemo(
    () => ({
      [ANY]: 'Any genre',
      ...Object.fromEntries(genres.map((name) => [name, name])),
    }),
    [genres],
  )

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
      <ToggleGroup
        value={[filter]}
        onValueChange={(value) => {
          const next = value[0]
          if (next) setFilter(next as Filter)
        }}
        variant="outline"
        size="sm"
        spacing={1}
        // Must never be wider than the screen: on a phone, anything that
        // overflows widens the layout viewport, and every fixed overlay
        // (the score drawer included) then stretches with it and pans
        // sideways. Five chips fit on one line from 360px up; narrower
        // phones wrap rather than overflow.
        className="flex-wrap select-none"
      >
        {FILTERS.map(({ value, label }) => (
          <ToggleGroupItem key={value} value={value} className="whitespace-nowrap px-2">
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {languages.length > 1 && (
        <FilterSelect label="Language" items={languageItems} value={language} onChange={setLanguage} />
      )}

      {genres.length > 1 && (
        <FilterSelect label="Genre" items={genreItems} value={genre} onChange={setGenre} />
      )}
    </div>
  )
}

interface FilterSelectProps {
  label: string
  items: Record<string, string>
  value: string
  onChange: (value: string) => void
}

/** Darkens while a filter is active, so it reads as "on" at a glance. */
function FilterSelect({ label, items, value, onChange }: FilterSelectProps) {
  return (
    <Select items={items} value={value} onValueChange={(next) => onChange(next as string)}>
      <SelectTrigger
        size="sm"
        className={cn('shrink-0', value !== ANY && 'border-foreground/30 bg-muted')}
        aria-label={label}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(items).map(([itemValue, itemLabel]) => (
          <SelectItem key={itemValue} value={itemValue}>
            {itemLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
