import { monthKey, shiftMonth, todayISO } from './dates'
import { formatMonthName, formatMonthYear } from './format'

// What the statistics screens look at: a month ('2026-10') or a year ('2026').
export type Period = string

export const isYear = (period: Period) => period.length === 4
export const currentMonth = () => monthKey(todayISO())

export function shiftPeriod(period: Period, delta: number): Period {
  return isYear(period) ? String(Number(period) + delta) : shiftMonth(period, delta)
}

export function isFuture(period: Period): boolean {
  return period > currentMonth().slice(0, period.length)
}

// 'Outubro 2026' or '2026'.
export function formatPeriod(period: Period): string {
  return isYear(period) ? period : formatMonthYear(period)
}

// As it reads mid-sentence: 'setembro' or '2025'.
export function formatPeriodInline(period: Period): string {
  return isYear(period) ? period : formatMonthName(period)
}

// The months to chart: the twelve of a year, or the six ending at a month.
export function trendWindow(period: Period): { endMonth: string; months: number } {
  return isYear(period) ? { endMonth: `${period}-12`, months: 12 } : { endMonth: period, months: 6 }
}

// Months of the period that have happened so far, for averages: a past year
// counts 12, the current one only up to this month.
export function elapsedMonths(period: Period): number {
  if (!isYear(period)) return 1
  const now = currentMonth()
  if (period < now.slice(0, 4)) return 12
  return period === now.slice(0, 4) ? Number(now.slice(5)) : 0
}

// Reads the list scope and period that both statistics screens keep in the URL,
// so going into a category and back does not lose them.
export function readStatsParams(params: URLSearchParams): { scope: string | null; period: Period } {
  const period = params.get('periodo')
  return {
    scope: params.get('lista'),
    period: period && /^\d{4}(-\d{2})?$/.test(period) ? period : currentMonth(),
  }
}

export function statsQuery(scope: string | null, period: Period): string {
  const params = new URLSearchParams({ periodo: period })
  if (scope) params.set('lista', scope)
  return params.toString()
}
