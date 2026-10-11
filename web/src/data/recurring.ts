import { occurrenceDate } from '../lib/dates'
import type { Frequency, RecurringExpense, ShareInput, SplitMode } from '../lib/database.types'
import { supabase, unwrap } from '../lib/supabase'

export type RecurringInput = {
  listId: string
  description: string
  amountCents: number
  paidBy: string
  categoryId: string
  note: string | null
  splitMode: SplitMode
  shares: ShareInput[]
  frequency: Frequency
  startOn: string
  endOn: string | null
}

function toRow(input: RecurringInput) {
  return {
    list_id: input.listId,
    description: input.description.trim(),
    amount_cents: input.amountCents,
    paid_by: input.paidBy,
    category_id: input.categoryId,
    note: input.note?.trim() || null,
    split_mode: input.splitMode,
    split_input: input.shares,
    frequency: input.frequency,
    start_on: input.startOn,
    end_on: input.endOn,
  }
}

export async function fetchRecurring(): Promise<RecurringExpense[]> {
  return unwrap(
    await supabase.from('recurring_expenses').select('*').is('deleted_at', null).order('created_at'),
  )
}

export async function createRecurring(input: RecurringInput): Promise<RecurringExpense> {
  return unwrap(await supabase.from('recurring_expenses').insert(toRow(input)).select('*').single())
}

// Affects future occurrences only; expenses already generated stay as they are.
export async function updateRecurring(id: string, input: RecurringInput): Promise<void> {
  unwrap(
    await supabase.from('recurring_expenses').update(toRow(input)).eq('id', id).select('id').single(),
  )
}

// Occurrences missed while paused are skipped on resume (handled in the database).
export async function setRecurringPaused(id: string, paused: boolean): Promise<void> {
  unwrap(
    await supabase
      .from('recurring_expenses')
      .update({ paused_at: paused ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id')
      .single(),
  )
}

export async function deleteRecurring(id: string): Promise<void> {
  unwrap(
    await supabase
      .from('recurring_expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .single(),
  )
}

// Creates every occurrence due so far. Safe to call from both phones at once.
// Returns how many expenses were created.
export async function generateRecurring(): Promise<number> {
  return unwrap(await supabase.rpc('generate_recurring', {}))
}

// Next date this rule will produce an expense, or null if paused or finished.
export function nextOccurrence(rule: RecurringExpense, today: string): string | null {
  if (rule.paused_at || rule.deleted_at) return null

  for (let n = 0; ; n++) {
    const date = occurrenceDate(rule.start_on, rule.frequency, n)
    if (rule.end_on && date > rule.end_on) return null
    const alreadyGenerated = rule.last_generated_on !== null && date <= rule.last_generated_on
    if (date >= today && !alreadyGenerated) return date
  }
}
