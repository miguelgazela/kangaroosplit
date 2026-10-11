import type { ExpenseWithShares, ShareInput, SplitMode } from '../lib/database.types'
import { supabase, unwrap } from '../lib/supabase'

export type ExpenseInput = {
  // Omit to create a new expense.
  id?: string
  listId: string
  description: string
  amountCents: number
  spentOn: string
  paidBy: string
  categoryId: string
  note: string | null
  splitMode: SplitMode
  shares: ShareInput[]
}

// Supabase caps a single response (1000 rows by default), so page through.
const PAGE_SIZE = 1000

// Every non-deleted expense across all lists, newest first. Volume for two
// people stays small, and having it all cached keeps stats and offline simple.
export async function fetchExpenses(): Promise<ExpenseWithShares[]> {
  const all: ExpenseWithShares[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = unwrap(
      await supabase
        .from('expenses')
        .select('*, expense_shares(*)')
        .is('deleted_at', null)
        .order('spent_on', { ascending: false })
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, from + PAGE_SIZE - 1),
    )
    all.push(...page)
    if (page.length < PAGE_SIZE) return all
  }
}

// Returns the expense id.
export async function saveExpense(input: ExpenseInput): Promise<string> {
  return unwrap(
    await supabase.rpc('save_expense', {
      p_id: input.id ?? null,
      p_list_id: input.listId,
      p_description: input.description.trim(),
      p_amount_cents: input.amountCents,
      p_spent_on: input.spentOn,
      p_paid_by: input.paidBy,
      p_category_id: input.categoryId,
      p_note: input.note?.trim() || null,
      p_split_mode: input.splitMode,
      p_shares: input.shares,
    }),
  )
}

// Soft delete: the row stays and can be restored.
export async function setExpenseDeleted(id: string, deleted: boolean): Promise<void> {
  unwrap(
    await supabase
      .from('expenses')
      .update({ deleted_at: deleted ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id')
      .single(),
  )
}

export async function moveExpense(id: string, listId: string): Promise<void> {
  unwrap(await supabase.from('expenses').update({ list_id: listId }).eq('id', id).select('id').single())
}
