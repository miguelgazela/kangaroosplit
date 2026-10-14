import type { ExpenseComment, ExpenseRead, ExpenseReaction } from '../lib/database.types'
import { supabase, unwrap } from '../lib/supabase'

const PAGE_SIZE = 1000

// Volume for two people stays small; everything is cached, like expenses.
async function fetchAll<Row>(
  page: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: { message: string } | null }>,
): Promise<Row[]> {
  const all: Row[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const rows = unwrap(await page(from, from + PAGE_SIZE - 1))
    all.push(...rows)
    if (rows.length < PAGE_SIZE) return all
  }
}

export function fetchReactions(): Promise<ExpenseReaction[]> {
  return fetchAll<ExpenseReaction>((from, to) =>
    supabase.from('expense_reactions').select('*').order('expense_id').order('user_id').range(from, to),
  )
}

// Oldest first; deleted comments are left out.
export function fetchComments(): Promise<ExpenseComment[]> {
  return fetchAll<ExpenseComment>((from, to) =>
    supabase
      .from('expense_comments')
      .select('*')
      .is('deleted_at', null)
      .order('created_at')
      .order('id')
      .range(from, to),
  )
}

// Row-level security returns only the signed-in person's own rows.
export function fetchReads(): Promise<ExpenseRead[]> {
  return fetchAll<ExpenseRead>((from, to) =>
    supabase.from('expense_reads').select('*').order('expense_id').range(from, to),
  )
}

// A null emoji removes the reaction.
export async function setReaction(input: { expenseId: string; userId: string; emoji: string | null }): Promise<void> {
  if (input.emoji === null) {
    unwrap(
      await supabase
        .from('expense_reactions')
        .delete()
        .eq('expense_id', input.expenseId)
        .eq('user_id', input.userId)
        .select(),
    )
    return
  }
  unwrap(
    await supabase
      .from('expense_reactions')
      .upsert(
        { expense_id: input.expenseId, user_id: input.userId, emoji: input.emoji },
        { onConflict: 'expense_id,user_id' },
      )
      .select(),
  )
}

export async function addComment(input: { expenseId: string; body: string }): Promise<void> {
  unwrap(
    await supabase
      .from('expense_comments')
      .insert({ expense_id: input.expenseId, body: input.body.trim() })
      .select('id')
      .single(),
  )
}

export async function editComment(input: { id: string; body: string }): Promise<void> {
  unwrap(
    await supabase
      .from('expense_comments')
      .update({ body: input.body.trim() })
      .eq('id', input.id)
      .select('id')
      .single(),
  )
}

// Soft delete, so it can be undone.
export async function setCommentDeleted(input: { id: string; deleted: boolean }): Promise<void> {
  unwrap(
    await supabase
      .from('expense_comments')
      .update({ deleted_at: input.deleted ? new Date().toISOString() : null })
      .eq('id', input.id)
      .select('id')
      .single(),
  )
}

export async function markRead(input: { expenseId: string; userId: string }): Promise<void> {
  unwrap(
    await supabase
      .from('expense_reads')
      .upsert(
        { expense_id: input.expenseId, user_id: input.userId, last_read_at: new Date().toISOString() },
        { onConflict: 'expense_id,user_id' },
      )
      .select(),
  )
}
