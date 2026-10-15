import { describe, expect, it } from 'vitest'
import type { ShoppingHistory, ShoppingItem } from './database.types'
import { cartItems, groupOpen, lookup, nameKey, parseDraft, suggest, usual } from './shopping'

const item = (patch: Partial<ShoppingItem>): ShoppingItem => ({
  id: 'i',
  name: 'Leite',
  name_key: 'leite',
  emoji: '🥛',
  section: 'laticinios',
  quantity: 1,
  note: null,
  added_by: 'u',
  created_at: '2026-10-14T10:00:00Z',
  checked_at: null,
  checked_by: null,
  ...patch,
})

const past = (patch: Partial<ShoppingHistory>): ShoppingHistory => ({
  name_key: 'pao',
  name: 'Pão',
  emoji: '🍞',
  section: 'padaria',
  times_bought: 3,
  last_bought_at: '2026-10-10T10:00:00Z',
  ...patch,
})

describe('parseDraft', () => {
  it('reads a leading quantity', () => {
    expect(parseDraft('2 leite')).toEqual({ quantity: 2, term: 'leite' })
    expect(parseDraft('3x ovos')).toEqual({ quantity: 3, term: 'ovos' })
    expect(parseDraft('2x leite de aveia')).toEqual({ quantity: 2, term: 'leite de aveia' })
  })

  it('keeps plain text and numbers inside names', () => {
    expect(parseDraft('leite')).toEqual({ quantity: 1, term: 'leite' })
    expect(parseDraft('7up')).toEqual({ quantity: 1, term: '7up' })
  })
})

describe('lookup and suggest', () => {
  it('ignores case and accents', () => {
    expect(nameKey('  PÃO  ')).toBe('pao')
    expect(lookup('pao', [])?.section).toBe('padaria')
  })

  it('prefers what was remembered over the dictionary', () => {
    const remembered = [past({ name_key: 'leite', name: 'Leite', emoji: '🥛', section: 'mercearia' })]
    expect(lookup('leite', remembered)?.section).toBe('mercearia')
  })

  it('flags items already on the list and offers the literal text', () => {
    const result = suggest('leite', [item({ quantity: 3 })], [])
    expect(result[0].known.name).toBe('Leite')
    expect(result[0].onList).toBe(3)
    const unknown = suggest('chouriço de Vinhais', [], [])
    expect(unknown.at(-1)?.literal).toBe(true)
    expect(unknown.at(-1)?.known.section).toBe('outros')
  })

  it('does not offer the literal text when it equals a match', () => {
    expect(suggest('Leite', [], []).some((entry) => entry.literal)).toBe(false)
  })
})

describe('usual', () => {
  it('lists most bought names that are not on the list', () => {
    const history = [past({}), past({ name_key: 'ovos', name: 'Ovos', times_bought: 9 }), past({ name_key: 'x', times_bought: 0 })]
    const onList = [item({ name_key: 'pao' })]
    expect(usual([], history).map((entry) => entry.name_key)).toEqual(['ovos', 'pao'])
    expect(usual(onList, history).map((entry) => entry.name_key)).toEqual(['ovos'])
  })
})

describe('grouping', () => {
  it('orders sections by store route and puts ticked items in the cart', () => {
    const items = [
      item({ id: '1', section: 'limpeza', name_key: 'a' }),
      item({ id: '2', section: 'frutas', name_key: 'b' }),
      item({ id: '3', section: 'padaria', name_key: 'c', checked_at: '2026-10-14T11:00:00Z' }),
    ]
    expect(groupOpen(items).map((group) => group.section)).toEqual(['frutas', 'limpeza'])
    expect(cartItems(items).map((entry) => entry.id)).toEqual(['3'])
  })
})
