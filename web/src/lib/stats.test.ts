import { describe, expect, it } from 'vitest'
import type { ExpenseWithShares, List, ListBalance } from './database.types'
import {
  expensePosition,
  expensesInMonth,
  expensesInPeriod,
  filterExpenses,
  isScheduled,
  listBalance,
  monthlyTrend,
  overallBalance,
  scheduledImpact,
  sharesByUser,
  totalCents,
  totalsByCategory,
} from './stats'

const A = 'user-a'
const B = 'user-b'

function expense(
  id: string,
  spentOn: string,
  amount: number,
  paidBy: string,
  shareA: number,
  overrides: Partial<ExpenseWithShares> = {},
): ExpenseWithShares {
  return {
    id,
    list_id: 'home',
    description: id,
    amount_cents: amount,
    spent_on: spentOn,
    paid_by: paidBy,
    category_id: 'food',
    note: null,
    split_mode: 'exact',
    recurring_id: null,
    occurrence_date: null,
    created_by: paidBy,
    created_at: '',
    updated_by: null,
    updated_at: '',
    deleted_by: null,
    deleted_at: null,
    expense_shares: [
      { expense_id: id, user_id: A, share_cents: shareA, input_value: null },
      { expense_id: id, user_id: B, share_cents: amount - shareA, input_value: null },
    ],
    ...overrides,
  }
}

const expenses = [
  expense('Continente', '2026-10-10', 8000, A, 4800),
  expense('Farmácia', '2026-10-03', 2000, B, 1000, { category_id: 'health' }),
  expense('Renda', '2026-09-01', 100000, A, 60000, { category_id: 'rent' }),
  expense('Voos', '2026-08-02', 30000, B, 15000, { list_id: 'trip', category_id: 'travel' }),
]

describe('filterExpenses', () => {
  it('filters by list, category, payer and date range', () => {
    expect(filterExpenses(expenses, { listId: 'trip' }).map((e) => e.id)).toEqual(['Voos'])
    expect(filterExpenses(expenses, { categoryId: 'health' }).map((e) => e.id)).toEqual(['Farmácia'])
    expect(filterExpenses(expenses, { paidBy: A }).map((e) => e.id)).toEqual(['Continente', 'Renda'])
    expect(filterExpenses(expenses, { from: '2026-09-01', to: '2026-10-03' }).map((e) => e.id)).toEqual([
      'Farmácia',
      'Renda',
    ])
  })

  it('searches ignoring case and accents', () => {
    expect(filterExpenses(expenses, { search: 'farmacia' }).map((e) => e.id)).toEqual(['Farmácia'])
    expect(filterExpenses(expenses, { search: '  CONTI ' }).map((e) => e.id)).toEqual(['Continente'])
  })
})

describe('monthly stats', () => {
  const october = expensesInMonth(expenses, '2026-10')

  it('totals a month', () => {
    expect(totalCents(october)).toBe(10000)
  })

  it('sums each person\'s share regardless of who paid', () => {
    expect(sharesByUser(october)).toEqual({ [A]: 5800, [B]: 4200 })
  })

  it('ranks categories with their fraction of the total', () => {
    expect(totalsByCategory(october)).toEqual([
      { categoryId: 'food', totalCents: 8000, fraction: 0.8 },
      { categoryId: 'health', totalCents: 2000, fraction: 0.2 },
    ])
    expect(totalsByCategory([])).toEqual([])
  })

  it('builds a trend including empty months, oldest first', () => {
    expect(monthlyTrend(expenses, '2026-10', 4)).toEqual([
      { month: '2026-07', totalCents: 0 },
      { month: '2026-08', totalCents: 30000 },
      { month: '2026-09', totalCents: 100000 },
      { month: '2026-10', totalCents: 10000 },
    ])
  })
})

describe('expensesInPeriod', () => {
  it('takes a month or a whole year', () => {
    expect(expensesInPeriod(expenses, '2026-10').map((e) => e.id)).toEqual(['Continente', 'Farmácia'])
    expect(expensesInPeriod(expenses, '2026')).toHaveLength(4)
    expect(expensesInPeriod(expenses, '2025')).toEqual([])
  })
})

describe('positions and balances', () => {
  it('shows what the viewer lent or owes on an expense', () => {
    expect(expensePosition(expenses[0], A)).toBe(3200)
    expect(expensePosition(expenses[0], B)).toBe(-3200)
  })

  it('nets active lists only for the overall balance', () => {
    const list = (id: string, archived = false): List => ({
      id,
      name: id,
      icon: '',
      is_default: id === 'home',
      starts_on: null,
      ends_on: null,
      archived_at: archived ? '2026-01-01T00:00:00Z' : null,
      created_by: null,
      created_at: '',
    })
    const balances: ListBalance[] = [
      { list_id: 'home', user_id: A, balance_cents: 8490 },
      { list_id: 'home', user_id: B, balance_cents: -8490 },
      { list_id: 'trip', user_id: A, balance_cents: -2000 },
      { list_id: 'trip', user_id: B, balance_cents: 2000 },
      { list_id: 'old', user_id: A, balance_cents: 99999 },
    ]
    const lists = [list('home'), list('trip'), list('old', true)]

    expect(listBalance(balances, 'trip', A)).toBe(-2000)
    expect(listBalance(balances, 'missing', A)).toBe(0)
    expect(overallBalance(balances, lists, A)).toBe(6490)
    expect(overallBalance(balances, lists, B)).toBe(-6490)
  })
})

describe('scheduled expenses', () => {
  const upcoming = [
    expense('Concerto', '2026-10-27', 6000, A, 3000),
    expense('Jantar', '2026-10-20', 4000, B, 2500),
    expense('Hoje', '2026-10-13', 1000, A, 500),
  ]

  it('treats only dates after today as scheduled', () => {
    expect(upcoming.map((e) => isScheduled(e, '2026-10-13'))).toEqual([true, true, false])
  })

  it('sums the viewer net effect and finds the last date', () => {
    // A lends 3000 on Concerto and owes 2500 on Jantar.
    expect(scheduledImpact(upcoming, A, '2026-10-13')).toEqual({ count: 2, cents: 500, until: '2026-10-27' })
    expect(scheduledImpact(upcoming, B, '2026-10-13')).toEqual({ count: 2, cents: -500, until: '2026-10-27' })
  })

  it('is null when nothing is scheduled', () => {
    expect(scheduledImpact(upcoming, A, '2026-10-27')).toBeNull()
  })
})
