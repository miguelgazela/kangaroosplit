import { describe, expect, it } from 'vitest'
import type { RecurringExpense } from '../lib/database.types'
import { nextOccurrence } from './recurring'

function rule(overrides: Partial<RecurringExpense>): RecurringExpense {
  return {
    id: 'rule',
    list_id: 'home',
    description: 'Renda',
    amount_cents: 115000,
    paid_by: 'user-a',
    category_id: 'rent',
    note: null,
    split_mode: 'equal',
    split_input: [],
    frequency: 'monthly',
    start_on: '2026-01-01',
    end_on: null,
    paused_at: null,
    last_generated_on: null,
    created_by: null,
    created_at: '',
    updated_at: '',
    deleted_at: null,
    ...overrides,
  }
}

describe('nextOccurrence', () => {
  it('returns today when due and not yet generated', () => {
    expect(nextOccurrence(rule({}), '2026-10-01')).toBe('2026-10-01')
  })

  it('skips to the following one once today was generated', () => {
    expect(nextOccurrence(rule({ last_generated_on: '2026-10-01' }), '2026-10-01')).toBe('2026-11-01')
  })

  it('returns the first date for a rule starting in the future', () => {
    expect(nextOccurrence(rule({ start_on: '2027-03-15' }), '2026-10-11')).toBe('2027-03-15')
  })

  it('returns null when paused or past its end date', () => {
    expect(nextOccurrence(rule({ paused_at: '2026-10-01T00:00:00Z' }), '2026-10-11')).toBeNull()
    expect(nextOccurrence(rule({ end_on: '2026-10-31' }), '2026-10-11')).toBeNull()
  })

  it('follows weekly rules', () => {
    expect(nextOccurrence(rule({ frequency: 'weekly', start_on: '2026-10-05' }), '2026-10-11')).toBe('2026-10-12')
  })
})
