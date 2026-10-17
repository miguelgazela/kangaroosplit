import { useSyncExternalStore } from 'react'
import { CHANGELOG, VERSION, type ChangelogEntry, type Highlight } from '../data/changelog'

const SEEN_KEY = 'ks.lastSeenVersion'
// The profile colour is cached once someone has signed in on this device.
const BRAND_KEY = 'kangaroosplit-brand'

// 'a' > 'b' as dotted numbers: '1.10.0' is after '1.9.0'.
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return Math.sign(difference)
  }
  return 0
}

export type Pending = { version: string; highlights: Highlight[] }

// What to show for an update, if anything.
// - `seen` is the last version the sheet was dealt with for. Without one,
//   someone who already used the app before this feature existed (`returning`)
//   is treated as having seen nothing, so they get the sheet; a brand-new
//   install gets nothing, since everything is new to them anyway.
// - Several versions may have been skipped: the newest one with highlights wins.
export function pendingHighlights(
  changelog: ChangelogEntry[],
  seen: string | null,
  returning: boolean,
): Pending | null {
  const since = seen ?? (returning ? '0.0.0' : null)
  if (since === null) return null
  const entry = changelog.find(
    (candidate) => compareVersions(candidate.version, since) > 0 && candidate.highlights?.length,
  )
  return entry ? { version: entry.version, highlights: entry.highlights!.slice(0, 3) } : null
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode: the sheet may come back next launch, which is harmless.
  }
}

// Read when the module loads, before sign-in can cache a colour for a new user.
const returning = read(BRAND_KEY) !== null

let seen = read(SEEN_KEY)
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Nothing to show: remember this version right away, so a later update is
// compared against it. With something to show, that waits for dismissal.
const initial = pendingHighlights(CHANGELOG, seen, returning)
if (!initial && seen !== VERSION) {
  seen = VERSION
  write(SEEN_KEY, VERSION)
}

const current = initial
let dismissed = false

export function useWhatsNew(): { pending: Pending | null; dismiss: () => void } {
  const done = useSyncExternalStore(subscribe, () => dismissed)
  return {
    pending: done ? null : current,
    dismiss: () => {
      dismissed = true
      seen = VERSION
      write(SEEN_KEY, VERSION)
      listeners.forEach((listener) => listener())
    },
  }
}
