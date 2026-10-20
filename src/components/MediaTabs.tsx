import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MEDIA_LABELS, MEDIA_TYPES, type MediaType } from '@/lib/types'

interface Props {
  value: MediaType
  onChange: (value: MediaType) => void
}

/** Movies / TV switch. */
export function MediaTabs({ value, onChange }: Props) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(next) => {
        if (next[0]) onChange(next[0] as MediaType)
      }}
      variant="outline"
      size="sm"
      spacing={0}
      className="w-full select-none"
    >
      {MEDIA_TYPES.map((type) => (
        <ToggleGroupItem key={type} value={type} className="flex-1">
          {MEDIA_LABELS[type]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
