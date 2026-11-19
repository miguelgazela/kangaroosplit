import { useSyncExternalStore } from 'react'

// v1 is read-only offline: writes are refused rather than queued.
export class OfflineError extends Error {
  constructor() {
    super('offline')
    this.name = 'OfflineError'
  }
}

export function isOnline(): boolean {
  return navigator.onLine
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, () => true)
}

// "Na loja" keeps working without a connection (ticks are queued), so while it
// is open the full-screen "Sem ligação" notice steps aside and the screen
// shows its own small warning.
let offlineScreenSuppressed = false
const suppressListeners = new Set<() => void>()

export function suppressOfflineScreen(value: boolean): void {
  offlineScreenSuppressed = value
  suppressListeners.forEach((listener) => listener())
}

export function useOfflineScreenSuppressed(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      suppressListeners.add(onChange)
      return () => suppressListeners.delete(onChange)
    },
    () => offlineScreenSuppressed,
    () => false,
  )
}
