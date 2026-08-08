import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  onSubmit: (passphrase: string) => void
  error?: string
  pending?: boolean
}

export function PassphraseGate({ onSubmit, error, pending }: Props) {
  const [value, setValue] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Have We Seen It?</h1>
          <p className="text-sm text-muted-foreground">
            Enter the passphrase to unlock the list.
          </p>
        </div>

        <Input
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Passphrase"
          autoFocus
          autoComplete="current-password"
          aria-label="Passphrase"
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={!value.trim() || pending}>
          {pending ? 'Checking…' : 'Unlock'}
        </Button>
      </form>
    </div>
  )
}
