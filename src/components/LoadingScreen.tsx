import { Loader2Icon } from 'lucide-react'

/**
 * Shown while a stored passphrase is being checked. Deliberately mirrors the
 * gate's layout so an accepted passphrase doesn't visibly jump.
 */
export function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Have We Seen It?</h1>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>Unlocking…</span>
        </div>
      </div>
    </div>
  )
}
