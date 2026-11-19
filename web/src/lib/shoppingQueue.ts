import type { ShoppingItem } from './database.types'

// Ticks and unticks made without a connection, kept until they can be sent.
// Shops often have no signal, and "Na loja" must keep working: the tick shows
// at once and goes to the server when the connection is back. Only the latest
// change per item is kept, so tick-untick pairs cancel out. Last write wins.

export type PendingCheck = { id: string; userId: string; checked: boolean; at: string }

const KEY = 'ks.shoppingQueue'

function read(): PendingCheck[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as PendingCheck[]) : []
  } catch {
    return []
  }
}

let queue: PendingCheck[] = read()
const listeners = new Set<() => void>()

function commit(next: PendingCheck[]) {
  queue = next
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage full or blocked: the queue still works until the app closes.
  }
  listeners.forEach((listener) => listener())
}

export const pendingChecks = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  // A stable reference until the next change, as useSyncExternalStore needs.
  snapshot: (): PendingCheck[] => queue,
  add(check: Omit<PendingCheck, 'at'>) {
    commit([...queue.filter((entry) => entry.id !== check.id), { ...check, at: new Date().toISOString() }])
  },
  // Only removes the entry if nothing newer replaced it while it was sending.
  remove(check: PendingCheck) {
    commit(queue.filter((entry) => !(entry.id === check.id && entry.at === check.at)))
  },
}

// The server data with the queued changes on top, so a refetch cannot undo a
// tick that has not been sent yet.
export function withPending(items: ShoppingItem[], pending: PendingCheck[]): ShoppingItem[] {
  if (pending.length === 0) return items
  const byId = new Map(pending.map((entry) => [entry.id, entry]))
  return items.map((item) => {
    const change = byId.get(item.id)
    if (!change) return item
    return change.checked
      ? { ...item, checked_at: change.at, checked_by: change.userId }
      : { ...item, checked_at: null, checked_by: null }
  })
}
