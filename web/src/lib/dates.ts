import type { Frequency } from './database.types'

// Calendar days travel as 'YYYY-MM-DD' strings and months as 'YYYY-MM', so
// nothing here depends on the device time zone except `todayISO`.

const pad = (value: number) => String(value).padStart(2, '0')

export function toISODate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function parseISODate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split('-').map(Number)
  return { year, month, day }
}

// Local-time Date for display formatting.
export function isoToDate(iso: string): Date {
  const { year, month, day } = parseISODate(iso)
  return new Date(year, month - 1, day)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function addDays(iso: string, days: number): string {
  const { year, month, day } = parseISODate(iso)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

// Clamps to the last day of shorter months, matching Postgres `date + interval`.
export function addMonths(iso: string, months: number): string {
  const { year, month, day } = parseISODate(iso)
  const index = year * 12 + (month - 1) + months
  const targetYear = Math.floor(index / 12)
  const targetMonth = (index % 12) + 1
  return toISODate(targetYear, targetMonth, Math.min(day, daysInMonth(targetYear, targetMonth)))
}

// nth occurrence of a recurring rule. Always offset from the start date, so a
// rule starting on the 31st does not drift after passing through February.
export function occurrenceDate(startOn: string, frequency: Frequency, n: number): string {
  switch (frequency) {
    case 'weekly':
      return addDays(startOn, n * 7)
    case 'monthly':
      return addMonths(startOn, n)
    case 'yearly':
      return addMonths(startOn, n * 12)
  }
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function shiftMonth(month: string, delta: number): string {
  return monthKey(addMonths(`${month}-01`, delta))
}
