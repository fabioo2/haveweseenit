import { cn } from '@/lib/utils'

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

interface Props {
  value: number | null
  onChange: (value: number | null) => void
  label: string
}

/**
 * Ten discrete tap targets rather than a slider — sliders are miserable for
 * picking an exact integer on a phone. Tapping the current score clears it.
 */
export function RatingPicker({ value, onChange, label }: Props) {
  return (
    <div className="flex gap-1" role="group" aria-label={label}>
      {SCORES.map((score) => {
        const selected = value === score
        return (
          <button
            key={score}
            type="button"
            aria-label={`${label}: ${score}`}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : score)}
            className={cn(
              'h-9 flex-1 rounded-md border text-sm font-medium transition-colors',
              'hover:bg-accent focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
              selected
                ? 'border-primary bg-primary text-primary-foreground hover:bg-primary'
                : 'border-input bg-background text-muted-foreground',
            )}
          >
            {score}
          </button>
        )
      })}
    </div>
  )
}
