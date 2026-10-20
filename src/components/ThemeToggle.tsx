import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The icon is switched in CSS via the `dark` class, because next-themes resolves
 * the system theme after the first render.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      size="sm"
      variant="ghost"
      className="shrink-0 px-2"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <MoonIcon className="text-muted-foreground dark:hidden" />
      <SunIcon className="hidden text-muted-foreground dark:block" />
    </Button>
  )
}
