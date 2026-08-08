import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { addEntry, deleteEntry, listEntries, updateEntry } from '@/lib/sheets'
import type { Entry, NewEntry } from '@/lib/types'

export const ENTRIES_KEY = ['entries'] as const

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
 *
 * On success we patch the cache with the row the server actually returned
 * rather than refetching the whole list: that would double the round trips per
 * save, and the response is already canonical.
 */
function useOptimisticMutation<TVars, TResult>(
  mutationFn: (vars: TVars) => Promise<TResult>,
  apply: (entries: Entry[], vars: TVars) => Entry[],
  reconcile: (entries: Entry[], result: TResult, vars: TVars) => Entry[],
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
    onSuccess: (result, vars) => {
      queryClient.setQueryData<Entry[]>(ENTRIES_KEY, (current) =>
        reconcile(current ?? [], result, vars),
      )
    },
    onError: (_error, _vars, context) => {
      if (context) queryClient.setQueryData(ENTRIES_KEY, context.previous)
      // Only refetch on failure, and only once everything in flight has
      // settled — otherwise a rollback can clobber a later mutation's
      // optimistic write.
      if (queryClient.isMutating() <= 1) {
        queryClient.invalidateQueries({ queryKey: ENTRIES_KEY })
      }
    },
  })
}

function replace(entries: Entry[], entry: Entry): Entry[] {
  const index = entries.findIndex((candidate) => candidate.id === entry.id)
  if (index === -1) return [entry, ...entries]

  const next = entries.slice()
  next[index] = entry
  return next
}

export function useAddEntry(token: string) {
  return useOptimisticMutation(
    (entry: NewEntry) => addEntry(token, entry),
    (entries, entry) => [{ ...entry, added_at: new Date().toISOString() }, ...entries],
    (entries, saved) => replace(entries, saved),
  )
}

export function useUpdateEntry(token: string) {
  return useOptimisticMutation(
    ({ id, patch }: { id: string; patch: Partial<Entry> }) => updateEntry(token, id, patch),
    (entries, { id, patch }) =>
      entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    (entries, saved) => replace(entries, saved),
  )
}

export function useDeleteEntry(token: string) {
  return useOptimisticMutation(
    (id: string) => deleteEntry(token, id),
    (entries, id) => entries.filter((entry) => entry.id !== id),
    (entries, _result, id) => entries.filter((entry) => entry.id !== id),
  )
}
