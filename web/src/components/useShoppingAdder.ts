import { useCallback, useEffect, useState } from 'react'
import { t } from '../i18n/pt'
import type { ShoppingHistory, ShoppingItem } from '../lib/database.types'
import { OfflineError } from '../lib/online'
import { MAX_QUANTITY, nameKey, type Known } from '../lib/shopping'
import { useAddShoppingItem, useUpdateShoppingItem } from '../query/hooks'
import { useToast } from './ToastContext'

// How long a "Habituais" tile keeps its tick after being tapped.
const TICK_MS = 1200

// Adding to the list: a known name (suggestion, tile) or free text. Adding
// something already on the list raises its quantity instead.
export function useShoppingAdder(items: ShoppingItem[], onNotice?: (message: string) => void) {
  const toast = useToast()
  const add = useAddShoppingItem()
  const update = useUpdateShoppingItem()
  // Names added from a tile a moment ago: the tile keeps showing a tick.
  const [just, setJust] = useState<ReadonlySet<string>>(new Set())
  const [hold, setHold] = useState(false)

  // The ticks fade out unless the panel is still open.
  useEffect(() => {
    if (hold || just.size === 0) return
    const timer = window.setTimeout(() => setJust(new Set()), TICK_MS)
    return () => window.clearTimeout(timer)
  }, [hold, just])

  const failed = useCallback(
    (error: unknown) =>
      toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error }),
    [toast],
  )

  const addKnown = (known: Known, quantity: number) => {
    const existing = items.find((item) => item.checked_at === null && item.name_key === nameKey(known.name))
    if (existing) {
      const next = Math.min(existing.quantity + quantity, MAX_QUANTITY)
      onNotice?.(t.shopping.alreadyThere(known.name, next))
      update.mutate({ id: existing.id, patch: { quantity: next } }, { onError: failed })
      return
    }
    onNotice?.('')
    add.mutate({ ...known, quantity }, { onError: failed })
  }

  const addUsual = (entry: ShoppingHistory) => {
    setJust((current) => new Set(current).add(entry.name_key))
    addKnown(
      { name: entry.name, emoji: entry.emoji, section: entry.section, image_path: entry.image_path ?? null },
      1,
    )
  }

  return { addKnown, addUsual, just, setHold }
}


export type ShoppingAdder = ReturnType<typeof useShoppingAdder>
