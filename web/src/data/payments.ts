import type {
  ListDefaultShare,
  Member,
  MerchantRule,
  PaymentTokenStatus,
  PendingPayment,
} from '../lib/database.types'
import { todayISO } from '../lib/dates'
import { computeShares, defaultSplit } from '../lib/split'
import { supabase, unwrap } from '../lib/supabase'
import { saveExpense } from './expenses'

// Only the signed-in person's drafts come back (row level security).
export async function fetchPendingPayments(): Promise<PendingPayment[]> {
  return unwrap(
    await supabase
      .from('pending_payments')
      .select('*')
      .eq('status', 'pending')
      .order('paid_at', { ascending: false })
      .order('id'),
  )
}

export async function fetchMerchantRules(): Promise<MerchantRule[]> {
  return unwrap(await supabase.from('merchant_rules').select('*'))
}

export async function fetchPaymentTokenStatus(): Promise<PaymentTokenStatus | null> {
  const { data, error } = await supabase.rpc('payment_token_status')
  if (error) throw new Error(error.message)
  return data
}

// Returns the new key. It is shown once; only its hash is stored.
export async function createPaymentToken(): Promise<string> {
  return unwrap(await supabase.rpc('create_payment_token'))
}

export type AddPaymentInput = {
  payment: PendingPayment
  listId: string
  categoryId: string
  note: string
  members: Member[]
  // The chosen list's default split.
  defaults: ListDefaultShare[]
  remember: boolean
}

// Turns a draft into a normal expense: paid by the person whose phone sent it,
// split like the list's default, dated on the day of the payment.
export async function addPaymentAsExpense(input: AddPaymentInput): Promise<string> {
  const { payment } = input
  const { mode, entries } = defaultSplit(
    input.members.map((member) => member.user_id),
    input.defaults,
  )
  const split = computeShares(mode, payment.amount_cents, entries)
  if (!split.ok) throw new Error('split')

  const expenseId = await saveExpense({
    listId: input.listId,
    description: payment.merchant,
    amountCents: payment.amount_cents,
    spentOn: todayISO(new Date(payment.paid_at)),
    paidBy: payment.user_id,
    categoryId: input.categoryId,
    note: input.note,
    splitMode: mode,
    shares: split.shares,
  })

  await setPaymentStatus(payment.id, 'added', expenseId)

  // The expense is saved; a failed rule must not look like a failed payment.
  if (input.remember) {
    await supabase
      .from('merchant_rules')
      .upsert(
        {
          merchant_key: payment.merchant_key,
          merchant: payment.merchant,
          category_id: input.categoryId,
          list_id: input.listId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,merchant_key' },
      )
      .then(({ error }) => {
        if (error) console.warn('Merchant rule not saved', error.message)
      })
  }
  return expenseId
}

// 'pending' puts a draft back (Anular); 'added' is set by `addPaymentAsExpense`.
export async function setPaymentStatus(
  id: string,
  status: 'pending' | 'added' | 'ignored',
  expenseId?: string | null,
): Promise<void> {
  unwrap(
    await supabase
      .from('pending_payments')
      .update({
        status,
        expense_id: status === 'pending' ? null : (expenseId ?? null),
        resolved_at: status === 'pending' ? null : new Date().toISOString(),
      })
      .eq('id', id)
      .select('id')
      .single(),
  )
}
