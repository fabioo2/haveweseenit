import { cn } from '@/lib/utils'

const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

interface Props {
  value: number | null
  onChange: (value: number | null) => void
  label: string
  /** Classes for the filled part of the scale — the person's colour. */
  fillClass: string
}

/**
 * Ten discrete tap targets rather than a slider — sliders are miserable for
 * picking an exact integer on a phone. Tapping 7 fills 1–7, so the row reads
 * as "how much" at a glance instead of a set of chips to pick from (which is
 * exactly what the season picker above it is, and looked identical to).
 * Tapping the current score clears it; so does the Clear button.
 */
export function RatingPicker({ value, onChange, label, fillClass }: Props) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Rating{value !== null && ` · ${value}`}
        </span>
        {value !== null && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="rounded-md px-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-1" role="group" aria-label={label}>
        {SCORES.map((score) => {
          const selected = value === score
          const filled = value !== null && score <= value
          return (
            <button
              key={score}
              type="button"
              aria-label={`${label}: ${score}`}
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : score)}
              className={cn(
                'h-9 flex-1 rounded-md border text-sm font-medium transition-colors',
                'focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
                filled
                  ? fillClass
                  : 'border-input bg-background text-muted-foreground hover:bg-accent',
                selected && 'font-semibold',
              )}
            >
              {score}
            </button>
          )
        })}
      </div>
    </div>
  )
}
