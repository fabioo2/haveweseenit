import { posterUrl, type PosterSize } from '@/lib/tmdb'
import { cn } from '@/lib/utils'

interface Props {
  path: string
  title: string
  size?: PosterSize
  className?: string
}

export function Poster({ path, title, size = 'w185', className }: Props) {
  const src = posterUrl(path, size)

  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-md bg-muted text-muted-foreground',
          className,
        )}
        aria-hidden
      >
        <span className="text-lg font-semibold">{title.slice(0, 1) || '?'}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={`${title} poster`}
      loading="lazy"
      className={cn('rounded-md object-cover', className)}
    />
  )
}
