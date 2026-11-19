import { describe, expect, it } from 'vitest'
import { firstEmoji, searchEmoji, suggestEmoji } from './emoji'

describe('firstEmoji', () => {
  it('takes the first emoji typed anywhere in the text', () => {
    expect(firstEmoji('café ☕')).toBe('☕')
    expect(firstEmoji('🧀')).toBe('🧀')
    expect(firstEmoji('👩‍🍳 chef')).toBe('👩‍🍳')
  })
  it('is null for plain text and digits', () => {
    expect(firstEmoji('queijo')).toBeNull()
    expect(firstEmoji('123')).toBeNull()
  })
})

describe('searchEmoji', () => {
  it('finds by Portuguese word, without accents or case', () => {
    expect(searchEmoji('Queij').map((entry) => entry.emoji)).toContain('🧀')
    expect(searchEmoji('maçã').map((entry) => entry.emoji)).toContain('🍎')
  })
  it('is empty for an empty search', () => {
    expect(searchEmoji('  ')).toEqual([])
  })
})

describe('suggestEmoji', () => {
  it('starts with the dictionary emoji of the name', () => {
    expect(suggestEmoji('Queijo')[0]).toBe('🧀')
  })
  it('matches a word of a longer name', () => {
    expect(suggestEmoji('Queijo fresco do talho')).toContain('🧀')
  })
  it('has nothing for an empty name', () => {
    expect(suggestEmoji('')).toEqual([])
  })
})
