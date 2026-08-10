import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Which icon shows is decided in CSS off the `dark` class rather than in
 * React state: next-themes only resolves "system" in an effect, so anything
 * driven by that value renders the wrong icon for a frame first.
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
