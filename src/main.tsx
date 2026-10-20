import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { ENTRIES_KEY } from '@/hooks/useEntries'
import { UnauthorizedError } from '@/lib/sheets'
import { useSession } from '@/store/session'
import { App } from './App'
import './index.css'

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // A rejected passphrase signs out and drops the cached list.
    onError: (error) => {
      if (error instanceof UnauthorizedError) {
        useSession.getState().signOut(error.message)
        queryClient.removeQueries({ queryKey: ENTRIES_KEY })
      }
    },
  }),
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: true,
      staleTime: 30_000,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster position="top-center" />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
