import { describe, expect, it } from 'vitest'
import { buildCalendar, daysInMonth, leadingBlanks, plannedInMonth, tintLevel } from './calendar'
import type { ExpenseWithShares, RecurringExpense, Settlement } from './database.types'

const rule = (overrides: Partial<RecurringExpense> = {}) =>
  ({
    id: 'r1',
    list_id: 'home',
    description: 'Internet',
    amount_cents: 3999,
    paid_by: 'a',
    category_id: 'bills',
    frequency: 'monthly',
    start_on: '2026-01-15',
    end_on: null,
    paused_at: null,
    last_generated_on: '2026-09-15',
    deleted_at: null,
    ...overrides,
  }) as RecurringExpense

const expense = (spentOn: string, amount: number) =>
  ({ id: spentOn, spent_on: spentOn, amount_cents: amount, expense_shares: [] }) as unknown as ExpenseWithShares

describe('tintLevel', () => {
  it('steps at 50, 100 and 500 euros', () => {
    expect([0, 1, 4999, 5000, 9999, 10000, 49999, 50000].map(tintLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4])
  })
})

describe('month grid', () => {
  it('starts the week on Monday: 1 Oct 2026 is a Thursday', () => {
    expect(leadingBlanks('2026-10')).toBe(3)
    expect(leadingBlanks('2026-06')).toBe(0)
    expect(leadingBlanks('2026-11')).toBe(6)
  })

  it('knows month lengths', () => {
    expect(daysInMonth('2026-10')).toBe(31)
    expect(daysInMonth('2028-02')).toBe(29)
  })
})

describe('plannedInMonth', () => {
  it('plans the occurrence not generated yet', () => {
    expect(plannedInMonth(rule(), '2026-10', '2026-10-11').map((p) => p.date)).toEqual(['2026-10-15'])
  })

  it('skips paused, finished and already generated rules', () => {
    expect(plannedInMonth(rule({ paused_at: 'x' }), '2026-10', '2026-10-11')).toEqual([])
    expect(plannedInMonth(rule({ end_on: '2026-10-01' }), '2026-10', '2026-10-11')).toEqual([])
    expect(plannedInMonth(rule({ last_generated_on: '2026-10-15' }), '2026-10', '2026-10-11')).toEqual([])
  })

  it('plans nothing for past days', () => {
    expect(plannedInMonth(rule(), '2026-10', '2026-10-20')).toEqual([])
  })
})

describe('buildCalendar', () => {
  it('groups by day and keeps settlements and planned out of the total', () => {
    const settlement = { id: 's', settled_on: '2026-10-06', amount_cents: 35465 } as Settlement
    const days = buildCalendar(
      '2026-10',
      [expense('2026-10-05', 6120), expense('2026-10-05', 4000), expense('2026-09-30', 999)],
      [settlement],
      [rule()],
      '2026-10-11',
    )
    expect(days).toHaveLength(31)
    expect(days[4].totalCents).toBe(10120)
    expect(days[4].expenses).toHaveLength(2)
    expect(days[5].settlements).toHaveLength(1)
    expect(days[5].totalCents).toBe(0)
    expect(days[14].planned).toHaveLength(1)
    expect(days[14].totalCents).toBe(0)
  })

  it('treats expenses dated after today as planned, even if not recurring', () => {
    const days = buildCalendar('2026-10', [expense('2026-10-27', 6843), expense('2026-10-11', 100)], [], [], '2026-10-16')
    expect(days[26].scheduled).toHaveLength(1)
    expect(days[26].expenses).toHaveLength(0)
    expect(days[26].totalCents).toBe(0)
    expect(days[10].totalCents).toBe(100)
  })
})
