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
  // Only sent when there is a photo, so everything else keeps working before
  // the column exists.
  image_path?: string | null
  section: ShoppingSection
  quantity: number
}

export async function addShoppingItem(input: NewShoppingItem): Promise<void> {
  const { image_path, ...rest } = input
  unwrap(
    await supabase
      .from('shopping_items')
      .insert({
        ...rest,
        ...(image_path ? { image_path } : {}),
        name: input.name.trim(),
        name_key: nameKey(input.name),
      })
      .select('id')
      .single(),
  )
}

export type ShoppingPatch = Partial<Pick<ShoppingItem, 'name' | 'emoji' | 'image_path' | 'section' | 'quantity' | 'note'>>

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
  // When it was ticked, for a change that waited for the connection.
  at?: string
}): Promise<void> {
  unwrap(
    await supabase
      .from('shopping_items')
      .update(
        input.checked
          ? { checked_at: input.at ?? new Date().toISOString(), checked_by: input.userId }
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

export type HistoryPatch = Partial<Pick<ShoppingHistory, 'name' | 'emoji' | 'image_path' | 'section'>>

// Edits a "Habitual". The name is part of the key, so renaming moves the row.
export async function updateShoppingHistory(input: { nameKey: string; patch: HistoryPatch }): Promise<void> {
  const patch: HistoryPatch & { name_key?: string } = { ...input.patch }
  if (patch.name !== undefined) {
    patch.name = patch.name.trim()
    patch.name_key = nameKey(patch.name)
  }
  unwrap(await supabase.from('shopping_history').update(patch).eq('name_key', input.nameKey).select('name_key').single())
}

// Takes a name out of "Habituais". Buying it again brings it back.
export async function deleteShoppingHistory(nameKeyValue: string): Promise<void> {
  unwrap(await supabase.from('shopping_history').delete().eq('name_key', nameKeyValue).select('name_key'))
}
