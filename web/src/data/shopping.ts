import type { ShoppingHistory, ShoppingItem, ShoppingSection } from '../lib/database.types'
import { nameKey } from '../lib/shopping'
import { supabase, unwrap } from '../lib/supabase'

// Newest first within a section is decided by the screen; the list is small.
export async function fetchShoppingItems(): Promise<ShoppingItem[]> {
  return unwrap(await supabase.from('shopping_items').select('*').order('created_at').order('id'))
}

export async function fetchShoppingHistory(): Promise<ShoppingHistory[]> {
  return unwrap(await supabase.from('shopping_history').select('*'))
}

export type NewShoppingItem = {
  name: string
  emoji: string
  section: ShoppingSection
  quantity: number
}

export async function addShoppingItem(input: NewShoppingItem): Promise<void> {
  unwrap(
    await supabase
      .from('shopping_items')
      .insert({ ...input, name: input.name.trim(), name_key: nameKey(input.name) })
      .select('id')
      .single(),
  )
}

export type ShoppingPatch = Partial<Pick<ShoppingItem, 'name' | 'emoji' | 'section' | 'quantity' | 'note'>>

export async function updateShoppingItem(input: { id: string; patch: ShoppingPatch }): Promise<void> {
  const patch: ShoppingPatch & { name_key?: string } = { ...input.patch }
  if (patch.name !== undefined) {
    patch.name = patch.name.trim()
    patch.name_key = nameKey(patch.name)
  }
  unwrap(await supabase.from('shopping_items').update(patch).eq('id', input.id).select('id').single())
}

export async function setShoppingChecked(input: {
  id: string
  userId: string
  checked: boolean
}): Promise<void> {
  unwrap(
    await supabase
      .from('shopping_items')
      .update(
        input.checked
          ? { checked_at: new Date().toISOString(), checked_by: input.userId }
          : { checked_at: null, checked_by: null },
      )
      .eq('id', input.id)
      .select('id')
      .single(),
  )
}

export async function deleteShoppingItem(id: string): Promise<void> {
  unwrap(await supabase.from('shopping_items').delete().eq('id', id).select('id'))
}

// Removes every ticked item. The caller keeps the rows so "Anular" can put
// them back (see `restoreShoppingItems`).
export async function clearShoppingCart(): Promise<void> {
  unwrap(await supabase.rpc('clear_shopping_cart'))
}

// Puts back rows removed by "Limpar carrinho" or "Apagar tudo".
export async function restoreShoppingItems(items: ShoppingItem[]): Promise<void> {
  if (items.length === 0) return
  unwrap(await supabase.from('shopping_items').upsert(items).select('id'))
}

export async function deleteAllShoppingItems(): Promise<void> {
  unwrap(await supabase.from('shopping_items').delete().not('id', 'is', null).select('id'))
}
