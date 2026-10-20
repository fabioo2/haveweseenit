import { toast } from 'sonner'

export function errorToast(title: string, error: unknown) {
  toast.error(title, {
    description: error instanceof Error ? error.message : 'Please try again.',
  })
}
