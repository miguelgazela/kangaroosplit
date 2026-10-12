import { monthKey, shiftMonth } from './dates'
import type { ExpenseWithShares, List, ListBalance } from './database.types'

// All functions here expect expenses that are not soft-deleted.

export type ExpenseFilter = {
  listId?: string
  categoryId?: string
  paidBy?: string
  from?: string
  to?: string
  search?: string
}

// Case- and accent-insensitive, so "farmacia" finds "Farmácia".
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function filterExpenses(expenses: ExpenseWithShares[], filter: ExpenseFilter): ExpenseWithShares[] {
  const search = filter.search ? normalize(filter.search.trim()) : ''
  return expenses.filter(
    (expense) =>
      (!filter.listId || expense.list_id === filter.listId) &&
      (!filter.categoryId || expense.category_id === filter.categoryId) &&
      (!filter.paidBy || expense.paid_by === filter.paidBy) &&
      (!filter.from || expense.spent_on >= filter.from) &&
      (!filter.to || expense.spent_on <= filter.to) &&
      (!search || normalize(`${expense.description} ${expense.note ?? ''}`).includes(search)),
  )
}

export function expensesInMonth(expenses: ExpenseWithShares[], month: string): ExpenseWithShares[] {
  return expenses.filter((expense) => monthKey(expense.spent_on) === month)
}

export function totalCents(expenses: ExpenseWithShares[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount_cents, 0)
}

// How much of the spending each person is responsible for (their shares,
// regardless of who paid).
export function sharesByUser(expenses: ExpenseWithShares[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const expense of expenses) {
    for (const share of expense.expense_shares) {
      totals[share.user_id] = (totals[share.user_id] ?? 0) + share.share_cents
    }
  }
  return totals
}

export type CategoryTotal = {
  categoryId: string
  totalCents: number
  // 0..1 of the grand total.
  fraction: number
}

export function totalsByCategory(expenses: ExpenseWithShares[]): CategoryTotal[] {
  const grandTotal = totalCents(expenses)
  const totals = new Map<string, number>()
  for (const expense of expenses) {
    totals.set(expense.category_id, (totals.get(expense.category_id) ?? 0) + expense.amount_cents)
  }
  return [...totals]
    .map(([categoryId, total]) => ({
      categoryId,
      totalCents: total,
      fraction: grandTotal === 0 ? 0 : total / grandTotal,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)
}

// Totals for the `months` months ending at `endMonth`, oldest first.
// Months without expenses are included as zero.
export function monthlyTrend(
  expenses: ExpenseWithShares[],
  endMonth: string,
  months = 6,
): { month: string; totalCents: number }[] {
  return Array.from({ length: months }, (_, index) => {
    const month = shiftMonth(endMonth, index - (months - 1))
    return { month, totalCents: totalCents(expensesInMonth(expenses, month)) }
  })
}

// The viewer's net position on one expense.
// Positive: lent that much. Negative: owes that much.
export function expensePosition(expense: ExpenseWithShares, userId: string): number {
  const paid = expense.paid_by === userId ? expense.amount_cents : 0
  const owed = expense.expense_shares.find((share) => share.user_id === userId)?.share_cents ?? 0
  return paid - owed
}

// One user's balance in one list. Positive: is owed money.
export function listBalance(balances: ListBalance[], listId: string, userId: string): number {
  return (
    balances.find((balance) => balance.list_id === listId && balance.user_id === userId)
      ?.balance_cents ?? 0
  )
}

// Net across all active (non-archived) lists. Positive: is owed money.
export function overallBalance(balances: ListBalance[], lists: List[], userId: string): number {
  const active = new Set(lists.filter((list) => !list.archived_at).map((list) => list.id))
  return balances
    .filter((balance) => balance.user_id === userId && active.has(balance.list_id))
    .reduce((sum, balance) => sum + balance.balance_cents, 0)
}
