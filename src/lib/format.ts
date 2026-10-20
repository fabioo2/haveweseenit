import type { Entry } from './types'

const languageNames =
  typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(undefined, { type: 'language' })
    : null

/** "ko" → "Korean". */
export function languageLabel(code: string): string {
  if (!code) return 'Unknown'
  try {
    return languageNames?.of(code) ?? code.toUpperCase()
  } catch {
    // Intl throws on a malformed tag.
    return code.toUpperCase()
  }
}

/** 9 → "9", 9.5 → "9.5". */
export function formatRating(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/** [1, 2, 3, 5] → "S1–S3, S5". */
export function formatSeasons(seasons: number[]): string {
  if (seasons.length === 0) return ''

  const runs: string[] = []
  let start = seasons[0]
  let previous = seasons[0]

  for (const season of seasons.slice(1).concat(Infinity)) {
    if (season === previous + 1) {
      previous = season
      continue
    }
    runs.push(start === previous ? `S${start}` : `S${start}–S${previous}`)
    start = season
    previous = season
  }
  return runs.join(', ')
}

/** "2026-09-01" → "1 Sept 2026" in the user's locale. */
export function formatDate(value: string): string {
  // Parsed as UTC so the date doesn't shift with the local time zone.
  const parsed = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

/** Year and, unless it's English, the original language. */
export function titleMeta(entry: Pick<Entry, 'year' | 'original_language'>): string[] {
  const parts = [entry.year ? String(entry.year) : 'Year unknown']
  if (entry.original_language && entry.original_language !== 'en') {
    parts.push(languageLabel(entry.original_language))
  }
  return parts
}
