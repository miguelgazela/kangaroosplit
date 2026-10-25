import { describe, expect, it } from 'vitest'
import type {
  Category,
  ExpenseComment,
  ExpenseReaction,
  ExpenseWithShares,
  List,
  Member,
  Settlement,
} from './database.types'
import {
  daysElapsed,
  isLeapYear,
  reviewableYears,
  reviewYearFor,
  yearSummary,
  type YearSummaryInput,
} from './yearSummary'

const A = 'miguel'
const B = 'mara'

const members: Member[] = [
  { user_id: A, display_name: 'Miguel', color: '#2563EB', gender: 'm', created_at: '2026-01-01T00:00:00Z' },
  { user_id: B, display_name: 'Mara', color: '#C0367A', gender: 'f', created_at: '2026-01-01T00:00:00Z' },
]

function list(id: string, overrides: Partial<List> = {}): List {
  return {
    id,
    name: id,
    icon: '🏠',
    is_default: false,
    starts_on: null,
    ends_on: null,
    archived_at: null,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const lists = [
  list('casa', { name: 'Casa', is_default: true }),
  list('acores', { name: 'Açores', icon: '🏝️', archived_at: '2026-09-01T00:00:00Z' }),
  list('natal', { name: 'Natal', icon: '🎄' }),
]

function category(id: string, name: string): Category {
  return { id, name, icon: '🛒', color: '#E07020', is_preset: true, archived_at: null, created_at: '2026-01-01T00:00:00Z' }
}

const categories = [category('super', 'Supermercado'), category('rest', 'Restaurantes'), category('viag', 'Viagens')]

let seq = 0
function expense(
  spentOn: string,
  amount: number,
  paidBy: string,
  overrides: Partial<ExpenseWithShares> = {},
): ExpenseWithShares {
  const id = overrides.id ?? `e${++seq}`
  const half = Math.round(amount / 2)
  return {
    id,
    list_id: 'casa',
    description: id,
    amount_cents: amount,
    spent_on: spentOn,
    paid_by: paidBy,
    category_id: 'super',
    note: null,
    split_mode: 'equal',
    recurring_id: null,
    occurrence_date: null,
    created_by: paidBy,
    created_at: `${spentOn}T12:00:00Z`,
    updated_by: null,
    updated_at: `${spentOn}T12:00:00Z`,
    deleted_by: null,
    deleted_at: null,
    expense_shares: [
      { expense_id: id, user_id: A, share_cents: half, input_value: null },
      { expense_id: id, user_id: B, share_cents: amount - half, input_value: null },
    ],
    ...overrides,
  }
}

function settlement(settledOn: string, amount: number, from: string, overrides: Partial<Settlement> = {}): Settlement {
  return {
    id: `s${++seq}`,
    list_id: 'casa',
    from_user: from,
    to_user: from === A ? B : A,
    amount_cents: amount,
    settled_on: settledOn,
    batch_id: null,
    note: null,
    created_by: from,
    created_at: `${settledOn}T12:00:00Z`,
    deleted_by: null,
    deleted_at: null,
    ...overrides,
  }
}

function input(overrides: Partial<YearSummaryInput>): YearSummaryInput {
  return {
    year: 2026,
    today: '2026-12-28',
    members,
    lists,
    categories,
    expenses: [],
    settlements: [],
    reactions: [],
    comments: [],
    ...overrides,
  }
}

describe('dates', () => {
  it('knows leap years', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2026)).toBe(false)
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
  })

  it('counts the days elapsed, the whole year once it is over', () => {
    expect(daysElapsed(2026, '2026-01-01')).toBe(1)
    expect(daysElapsed(2026, '2026-12-31')).toBe(365)
    expect(daysElapsed(2024, '2024-12-31')).toBe(366)
    expect(daysElapsed(2024, '2025-01-10')).toBe(366)
    expect(daysElapsed(2025, '2026-01-10')).toBe(365)
    expect(daysElapsed(2028, '2028-03-01')).toBe(61)
  })

  it('offers the summary from 24 December to 31 January', () => {
    expect(reviewYearFor('2026-12-23')).toBeNull()
    expect(reviewYearFor('2026-12-24')).toBe(2026)
    expect(reviewYearFor('2026-12-31')).toBe(2026)
    expect(reviewYearFor('2027-01-01')).toBe(2026)
    expect(reviewYearFor('2027-01-31')).toBe(2026)
    expect(reviewYearFor('2027-02-01')).toBeNull()
    expect(reviewYearFor('2026-10-24')).toBeNull()
  })
})

describe('yearSummary', () => {
  it('totals the year, leaving out other years, future and deleted expenses', () => {
    const summary = yearSummary(
      input({
        expenses: [
          expense('2026-01-05', 10_000, A),
          expense('2026-06-05', 5_000, B),
          expense('2025-12-31', 99_900, A),
          expense('2026-12-30', 7_000, A),
          expense('2026-03-01', 4_000, A, { deleted_at: '2026-03-02T00:00:00Z' }),
        ],
      }),
    )
    expect(summary.expenseCount).toBe(2)
    expect(summary.totalCents).toBe(15_000)
    // 28 December 2026 is day 362.
    expect(summary.days).toBe(362)
    expect(summary.perDayCents).toBe(Math.round(15_000 / 362))
  })

  it('uses 366 days for a past leap year', () => {
    const summary = yearSummary(input({ year: 2024, today: '2025-01-15', expenses: [expense('2024-02-29', 36_600, A)] }))
    expect(summary.days).toBe(366)
    expect(summary.perDayCents).toBe(100)
    expect(summary.months[1]).toBe(36_600)
  })

  it('counts archived lists and orders lists by spend', () => {
    const summary = yearSummary(
      input({
        expenses: [
          expense('2026-08-02', 120_000, A, { list_id: 'acores' }),
          expense('2026-08-03', 20_000, B),
          expense('2026-02-03', 10_000, B),
        ],
      }),
    )
    expect(summary.lists.map((entry) => entry.id)).toEqual(['acores', 'casa'])
  })

  it('groups by category, biggest first', () => {
    const summary = yearSummary(
      input({
        expenses: [
          expense('2026-01-02', 1_000, A, { category_id: 'rest' }),
          expense('2026-01-03', 3_000, A),
          expense('2026-01-04', 2_000, A),
        ],
      }),
    )
    expect(summary.categories).toEqual([
      { categoryId: 'super', totalCents: 5_000, count: 2 },
      { categoryId: 'rest', totalCents: 1_000, count: 1 },
    ])
  })

  it('splits who paid, in member order, including someone who paid nothing', () => {
    const summary = yearSummary(input({ expenses: [expense('2026-01-02', 1_000, B), expense('2026-01-03', 2_000, B)] }))
    expect(summary.payers).toEqual([
      { userId: A, totalCents: 0, count: 0 },
      { userId: B, totalCents: 3_000, count: 2 },
    ])
  })

  it('finds the top month and names its list only when it is not the main one', () => {
    const trip = yearSummary(
      input({
        expenses: [
          expense('2026-08-02', 120_000, A, { list_id: 'acores' }),
          expense('2026-08-03', 20_000, B),
          expense('2026-03-03', 10_000, B),
        ],
      }),
    )
    expect(trip.topMonth).toEqual({ month: 8, totalCents: 140_000, listId: 'acores', categoryId: 'super' })

    const home = yearSummary(input({ expenses: [expense('2026-03-03', 10_000, B)] }))
    expect(home.topMonth).toEqual({ month: 3, totalCents: 10_000, listId: null, categoryId: 'super' })
  })

  it('picks the biggest and smallest expense and the favourite restaurant', () => {
    const summary = yearSummary(
      input({
        expenses: [
          expense('2026-08-02', 124_000, A, { description: 'Casa nos Açores', category_id: 'viag' }),
          expense('2026-03-02', 80, B, { description: 'Café na estação' }),
          expense('2026-02-02', 6_000, A, { description: 'Jantar no Ramiro', category_id: 'rest' }),
          expense('2026-04-02', 7_000, B, { description: 'jantar  no ramiro', category_id: 'rest' }),
          expense('2026-05-02', 9_000, B, { description: 'Sushi', category_id: 'rest' }),
        ],
      }),
    )
    expect(summary.biggest?.description).toBe('Casa nos Açores')
    expect(summary.smallest).toMatchObject({ description: 'Café na estação', amountCents: 80 })
    expect(summary.restaurant).toEqual({ description: 'jantar  no ramiro', count: 2, totalCents: 13_000 })
  })

  it('has no favourite restaurant after a single visit', () => {
    const summary = yearSummary(input({ expenses: [expense('2026-02-02', 6_000, A, { category_id: 'rest' })] }))
    expect(summary.restaurant).toBeNull()
  })

  it('counts reactions and comments on the year’s expenses only', () => {
    const jantar = expense('2026-02-02', 6_000, A, { id: 'jantar', description: 'Jantar no Ramiro' })
    const old = expense('2025-02-02', 6_000, A, { id: 'old' })
    const reactions: ExpenseReaction[] = [
      { expense_id: 'jantar', user_id: A, emoji: '❤️', created_at: '' },
      { expense_id: 'jantar', user_id: B, emoji: '❤️', created_at: '' },
      { expense_id: 'old', user_id: B, emoji: '😂', created_at: '' },
    ]
    const comment = (id: string, expenseId: string, deleted = false): ExpenseComment => ({
      id,
      expense_id: expenseId,
      user_id: A,
      body: 'olá',
      created_at: '',
      edited_at: null,
      deleted_at: deleted ? '2026-02-03T00:00:00Z' : null,
    })
    const summary = yearSummary(
      input({
        expenses: [jantar, old],
        reactions,
        comments: [comment('c1', 'jantar'), comment('c2', 'jantar'), comment('c3', 'jantar', true), comment('c4', 'old')],
      }),
    )
    expect(summary.reactionCount).toBe(2)
    expect(summary.commentCount).toBe(2)
    expect(summary.topEmojis).toEqual([{ emoji: '❤️', count: 2 }])
    expect(summary.mostCommented).toEqual({ description: 'Jantar no Ramiro', count: 2 })
  })

  it('counts a settle-all batch once and adds up its rows', () => {
    const summary = yearSummary(
      input({
        settlements: [
          settlement('2026-03-01', 1_000, B),
          settlement('2026-12-23', 10_000, B, { batch_id: 'b1' }),
          settlement('2026-12-23', 2_740, B, { batch_id: 'b1', list_id: 'natal' }),
          settlement('2025-12-01', 5_000, B),
          settlement('2026-05-01', 5_000, B, { deleted_at: '2026-05-02T00:00:00Z' }),
        ],
      }),
    )
    expect(summary.settlementCount).toBe(2)
    expect(summary.lastSettlement).toEqual({ settledOn: '2026-12-23', amountCents: 12_740 })
  })

  it('is quites when the expenses and settlements cancel out', () => {
    const settled = yearSummary(
      input({
        expenses: [expense('2026-02-02', 10_000, A)],
        settlements: [settlement('2026-03-01', 5_000, B)],
      }),
    )
    expect(settled.outstandingCents).toBe(0)

    const open = yearSummary(input({ expenses: [expense('2026-02-02', 10_000, A)] }))
    expect(open.outstandingCents).toBe(5_000)
  })

  it('counts the balance up to the end of a past year only', () => {
    const summary = yearSummary(
      input({
        year: 2025,
        today: '2026-01-20',
        expenses: [expense('2025-11-02', 10_000, A)],
        settlements: [settlement('2026-01-05', 5_000, B)],
      }),
    )
    expect(summary.outstandingCents).toBe(5_000)
  })
})

describe('reviewableYears', () => {
  it('lists the years with at least 20 expenses', () => {
    const many = Array.from({ length: 20 }, (_, index) => expense(`2025-03-${String(index + 1).padStart(2, '0')}`, 100, A))
    const few = Array.from({ length: 19 }, (_, index) => expense(`2026-03-${String(index + 1).padStart(2, '0')}`, 100, A))
    expect(reviewableYears([...many, ...few], '2026-12-28')).toEqual([2025])
  })
})
