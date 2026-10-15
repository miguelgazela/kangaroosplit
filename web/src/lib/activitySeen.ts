import { useSyncExternalStore } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { Activity } from './database.types'

// When this person last opened Atividade, kept on the device. It only drives
// the bell badge, so losing it is harmless.
const key = (userId: string) => `ks-activity-seen:${userId}`
const listeners = new Set<() => void>()

function read(userId: string): string {
  try {
    const stored = localStorage.getItem(key(userId))
    if (stored) return stored
    // First run: start counting from now rather than from the beginning of time.
    const now = new Date().toISOString()
    localStorage.setItem(key(userId), now)
    return now
  } catch {
    return new Date(0).toISOString()
  }
}

export function markActivitySeen(userId: string): void {
  try {
    localStorage.setItem(key(userId), new Date().toISOString())
  } catch {
    // Private mode: the badge just stays.
  }
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Entries by the other person since Atividade was last opened.
export function unseenCount(entries: Activity[], userId: string, seenAt: string): number {
  return entries.filter((entry) => entry.actor_id !== userId && entry.created_at > seenAt).length
}

export function useActivitySeenAt(): string | null {
  const userId = useAuth().session?.user.id
  return useSyncExternalStore(
    subscribe,
    () => (userId ? read(userId) : null),
    () => null,
  )
}
