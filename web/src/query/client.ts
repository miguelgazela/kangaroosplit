import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { QueryClient } from '@tanstack/react-query'

const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      // Must outlive the persisted cache, or restored data is dropped at once.
      gcTime: CACHE_MAX_AGE,
      retry: 1,
    },
    mutations: {
      // Never pause and replay later: offline writes are refused up front.
      networkMode: 'always',
      retry: false,
    },
  },
})

// Last synced data survives restarts, so the app opens read-only when offline.
export const persistOptions = {
  persister: createSyncStoragePersister({
    storage: window.localStorage,
    key: 'kangaroosplit-cache',
  }),
  maxAge: CACHE_MAX_AGE,
  // Bump when cached shapes change, to discard old caches.
  buster: '1',
}

// On sign-out: nothing from the previous session stays on the device.
export function clearCache(): void {
  queryClient.clear()
  persistOptions.persister.removeClient()
}
