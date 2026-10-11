import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import type { ReactNode } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import { persistOptions, queryClient } from './query/client'
import { useRealtimeSync, useRecurringGeneration } from './query/sync'

function BackgroundSync() {
  useRealtimeSync()
  useRecurringGeneration()
  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <AuthProvider>
        <BackgroundSync />
        {children}
      </AuthProvider>
    </PersistQueryClientProvider>
  )
}
