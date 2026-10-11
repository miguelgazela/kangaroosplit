import { describe, expect, it } from 'vitest'
import { addDays, addMonths, monthKey, occurrenceDate, shiftMonth, todayISO } from './dates'

describe('dates', () => {
  it('formats today from local date parts', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-29', 7)).toBe('2027-01-05')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('clamps to the end of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-10-31', 3)).toBe('2027-01-31')
    expect(addMonths('2026-03-15', -3)).toBe('2025-12-15')
  })

  it('shifts month keys', () => {
    expect(monthKey('2026-10-11')).toBe('2026-10')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-11', 2)).toBe('2027-01')
  })
})

describe('occurrenceDate', () => {
  it('steps weekly', () => {
    expect(occurrenceDate('2026-10-05', 'weekly', 4)).toBe('2026-11-02')
  })

  it('does not drift after a short month', () => {
    expect(occurrenceDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28')
    expect(occurrenceDate('2026-01-31', 'monthly', 2)).toBe('2026-03-31')
  })

  it('handles leap-day yearly rules', () => {
    expect(occurrenceDate('2028-02-29', 'yearly', 1)).toBe('2029-02-28')
    expect(occurrenceDate('2028-02-29', 'yearly', 4)).toBe('2032-02-29')
  })
})
