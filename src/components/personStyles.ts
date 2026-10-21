import type { Person } from '@/lib/types'

interface PersonStyle {
  badge: string
  icon: string
  dot: string
  fill: string
  card: string
  switch: string
}

/**
 * Per-person colour classes, written out in full so Tailwind can find them.
 * `switch` uses `!` to beat the Switch component's own data-checked background.
 */
export const PERSON_STYLES: Record<Person, PersonStyle> = {
  person1: {
    badge: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    icon: 'text-sky-600 dark:text-sky-400',
    dot: 'bg-sky-500',
    fill: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:bg-sky-500/25 dark:text-sky-300',
    card: 'border-sky-500/25 bg-sky-500/5',
    switch: 'data-checked:bg-sky-600! dark:data-checked:bg-sky-500!',
  },
  person2: {
    badge: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    icon: 'text-violet-600 dark:text-violet-400',
    dot: 'bg-violet-500',
    fill: 'border-violet-500/40 bg-violet-500/15 text-violet-700 dark:bg-violet-500/25 dark:text-violet-300',
    card: 'border-violet-500/25 bg-violet-500/5',
    switch: 'data-checked:bg-violet-600! dark:data-checked:bg-violet-500!',
  },
}
