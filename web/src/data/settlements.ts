import type { ListBalance, Settlement } from '../lib/database.types'
import { supabase, unwrap } from '../lib/supabase'

export type SettlementInput = {
  listId: string
  fromUser: string
  toUser: string
  amountCents: number
  settledOn: string
  note: string | null
}

export async function fetchBalances(): Promise<ListBalance[]> {
  return unwrap(await supabase.from('list_balances').select('*'))
}

export async function fetchSettlements(): Promise<Settlement[]> {
  return unwrap(
    await supabase
      .from('settlements')
      .select('*')
      .is('deleted_at', null)
      .order('settled_on', { ascending: false })
      .order('created_at', { ascending: false }),
  )
}

export async function createSettlement(input: SettlementInput): Promise<Settlement> {
  return unwrap(
    await supabase
      .from('settlements')
      .insert({
        list_id: input.listId,
        from_user: input.fromUser,
        to_user: input.toUser,
        amount_cents: input.amountCents,
        settled_on: input.settledOn,
        note: input.note?.trim() || null,
      })
      .select('*')
      .single(),
  )
}

export async function setSettlementDeleted(id: string, deleted: boolean): Promise<void> {
  unwrap(
    await supabase
      .from('settlements')
      .update({ deleted_at: deleted ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id')
      .single(),
  )
}

// Zeroes every list in one go. Returns the batch id shared by the created
// settlements, or null when there was nothing to settle.
export async function settleAll(): Promise<string | null> {
  const { data, error } = await supabase.rpc('settle_all')
  if (error) throw new Error(error.message)
  return data
}
