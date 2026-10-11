import type { List, ListDefaultShare } from '../lib/database.types'
import { supabase, unwrap } from '../lib/supabase'

export type ListInput = Pick<List, 'name' | 'icon' | 'starts_on' | 'ends_on'>
export type Weight = { userId: string; weight: number }

// Default list first, then newest.
export async function fetchLists(): Promise<List[]> {
  return unwrap(
    await supabase
      .from('lists')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false }),
  )
}

export async function fetchDefaultShares(): Promise<ListDefaultShare[]> {
  return unwrap(await supabase.from('list_default_shares').select('*'))
}

export async function setDefaultShares(listId: string, weights: Weight[]): Promise<void> {
  unwrap(
    await supabase
      .from('list_default_shares')
      .upsert(weights.map(({ userId, weight }) => ({ list_id: listId, user_id: userId, weight })))
      .select('list_id'),
  )
}

// Without `weights`, the database copies the default list's ratio.
export async function createList(input: ListInput, weights?: Weight[]): Promise<List> {
  const list = unwrap(await supabase.from('lists').insert(input).select('*').single())
  if (weights) await setDefaultShares(list.id, weights)
  return list
}

export async function updateList(id: string, patch: Partial<ListInput>): Promise<void> {
  unwrap(await supabase.from('lists').update(patch).eq('id', id).select('id').single())
}

export async function setListArchived(id: string, archived: boolean): Promise<void> {
  unwrap(
    await supabase
      .from('lists')
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id')
      .single(),
  )
}

// Permanently removes the list with all its expenses and settlements.
export async function deleteList(id: string): Promise<void> {
  unwrap(await supabase.from('lists').delete().eq('id', id).select('id').single())
}
