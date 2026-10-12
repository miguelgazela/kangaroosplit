import { describe, expect, it } from 'vitest'
import type { ExpenseWithShares } from './database.types'
import { descriptionHistory, knownCategory, suggestDescriptions } from './suggest'

const expense = (description: string, category_id: string) => ({ description, category_id }) as ExpenseWithShares

// Newest first, as the app holds them.
const history = descriptionHistory([
  expense('Continente', 'groceries'),
  expense('continente', 'groceries'),
  expense('Continente', 'other'),
  expense('Farmácia', 'health'),
  expense('Compras Continente', 'groceries'),
  expense('Café', 'eating-out'),
  expense('Cafés', 'eating-out'),
  expense('Cafés', 'eating-out'),
  expense('  ', 'other'),
])

describe('descriptionHistory', () => {
  it('groups ignoring case, keeps newest spelling and commonest category', () => {
    expect(history.find((entry) => entry.description === 'Continente')).toEqual({
      description: 'Continente',
      categoryId: 'groceries',
      count: 3,
    })
    expect(history).toHaveLength(5)
  })
})

describe('suggestDescriptions', () => {
  it('puts prefix matches before others, most used first', () => {
    expect(suggestDescriptions(history, 'co').map((entry) => entry.description)).toEqual([
      'Continente',
      'Compras Continente',
    ])
    expect(suggestDescriptions(history, 'caf').map((entry) => entry.description)).toEqual(['Cafés', 'Café'])
  })

  it('ignores accents and case', () => {
    expect(suggestDescriptions(history, 'FARMA').map((entry) => entry.description)).toEqual(['Farmácia'])
  })

  it('suggests nothing for empty input, no match, or an already complete entry', () => {
    expect(suggestDescriptions(history, ' ')).toEqual([])
    expect(suggestDescriptions(history, 'xyz')).toEqual([])
    expect(suggestDescriptions(history, 'Farmácia')).toEqual([])
  })

  it('respects the limit', () => {
    expect(suggestDescriptions(history, 'c', 2)).toHaveLength(2)
  })
})

describe('knownCategory', () => {
  it('finds the usual category for an exact description only', () => {
    expect(knownCategory(history, 'farmacia')).toBe('health')
    expect(knownCategory(history, 'farm')).toBeNull()
    expect(knownCategory(history, '')).toBeNull()
  })
})
