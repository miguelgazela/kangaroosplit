import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import type { ReactNode } from 'react'
import { AuthProvider } from './auth/AuthProvider'
import { persistOptions, queryClient } from './query/client'
import { useFlushShoppingQueue } from './query/hooks'
import { useRealtimeSync, useRecurringGeneration } from './query/sync'

function BackgroundSync() {
  useRealtimeSync()
  useRecurringGeneration()
  useFlushShoppingQueue()
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
