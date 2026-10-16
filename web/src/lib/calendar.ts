import type { ExpenseWithShares, RecurringExpense, Settlement } from './database.types'
import { monthKey, occurrenceDate, parseISODate, toISODate } from './dates'

// An occurrence of a recurring rule that has not been created yet.
export type PlannedExpense = { rule: RecurringExpense; date: string }

export type CalendarDay = {
  date: string
  day: number
  expenses: ExpenseWithShares[]
  // Dated after today: not counted yet, shown as planned.
  scheduled: ExpenseWithShares[]
  settlements: Settlement[]
  planned: PlannedExpense[]
  // Expenses up to today only: settlements and planned ones do not count.
  totalCents: number
}

// Tint steps from the design: none, < 50 €, < 100 €, < 500 €, 500 € or more.
export function tintLevel(cents: number): 0 | 1 | 2 | 3 | 4 {
  if (cents <= 0) return 0
  if (cents < 5_000) return 1
  if (cents < 10_000) return 2
  if (cents < 50_000) return 3
  return 4
}

// Empty cells before day 1 when the week starts on Monday.
export function leadingBlanks(month: string): number {
  const { year, month: m } = parseISODate(`${month}-01`)
  return (new Date(year, m - 1, 1).getDay() + 6) % 7
}

export function daysInMonth(month: string): number {
  const { year, month: m } = parseISODate(`${month}-01`)
  return new Date(Date.UTC(year, m, 0)).getUTCDate()
}

// Occurrences of the rule that fall in `month` and are still to be created.
export function plannedInMonth(rule: RecurringExpense, month: string, today: string): PlannedExpense[] {
  if (rule.paused_at || rule.deleted_at) return []
  const last = `${month}-${String(daysInMonth(month)).padStart(2, '0')}`
  const planned: PlannedExpense[] = []
  for (let n = 0; ; n++) {
    const date = occurrenceDate(rule.start_on, rule.frequency, n)
    if (date > last || (rule.end_on && date > rule.end_on)) break
    const generated = rule.last_generated_on !== null && date <= rule.last_generated_on
    if (monthKey(date) === month && date >= today && !generated) planned.push({ rule, date })
  }
  return planned
}

export function buildCalendar(
  month: string,
  expenses: ExpenseWithShares[],
  settlements: Settlement[],
  rules: RecurringExpense[],
  today: string,
): CalendarDay[] {
  const days: CalendarDay[] = Array.from({ length: daysInMonth(month) }, (_, index) => ({
    date: toISODate(...(month.split('-').map(Number) as [number, number]), index + 1),
    day: index + 1,
    expenses: [],
    scheduled: [],
    settlements: [],
    planned: [],
    totalCents: 0,
  }))
  const at = (iso: string) => (monthKey(iso) === month ? days[parseISODate(iso).day - 1] : undefined)

  for (const expense of expenses) {
    const day = at(expense.spent_on)
    if (!day) continue
    if (expense.spent_on > today) {
      day.scheduled.push(expense)
      continue
    }
    day.expenses.push(expense)
    day.totalCents += expense.amount_cents
  }
  for (const settlement of settlements) at(settlement.settled_on)?.settlements.push(settlement)
  for (const rule of rules) {
    for (const planned of plannedInMonth(rule, month, today)) at(planned.date)?.planned.push(planned)
  }
  return days
}
