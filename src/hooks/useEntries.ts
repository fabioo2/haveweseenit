import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addEntry, deleteEntry, listEntries, updateEntry } from '@/lib/sheets'
import type { Entry, NewEntry } from '@/lib/types'

const ENTRIES_KEY = ['entries'] as const

export function useEntries(token: string) {
  return useQuery({
    queryKey: ENTRIES_KEY,
    queryFn: () => listEntries(token),
    enabled: Boolean(token),
  })
}

/**
 * Apps Script takes roughly a second per call, so every mutation writes to the
 * cache first and rolls back on failure. Without this the app feels broken.
 */
function useOptimisticMutation<TVars>(
  mutationFn: (vars: TVars) => Promise<unknown>,
  apply: (entries: Entry[], vars: TVars) => Entry[],
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onMutate: async (vars: TVars) => {
      await queryClient.cancelQueries({ queryKey: ENTRIES_KEY })
      const previous = queryClient.getQueryData<Entry[]>(ENTRIES_KEY) ?? []
      queryClient.setQueryData<Entry[]>(ENTRIES_KEY, apply(previous, vars))
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context) queryClient.setQueryData(ENTRIES_KEY, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ENTRIES_KEY })
    },
  })
}

export function useAddEntry(token: string) {
  return useOptimisticMutation(
    (entry: NewEntry) => addEntry(token, entry),
    (entries, entry) => [{ ...entry, added_at: new Date().toISOString() }, ...entries],
  )
}

export function useUpdateEntry(token: string) {
  return useOptimisticMutation(
    ({ id, patch }: { id: string; patch: Partial<Entry> }) => updateEntry(token, id, patch),
    (entries, { id, patch }) =>
      entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
  )
}

export function useDeleteEntry(token: string) {
  return useOptimisticMutation(
    (id: string) => deleteEntry(token, id),
    (entries, id) => entries.filter((entry) => entry.id !== id),
  )
}
