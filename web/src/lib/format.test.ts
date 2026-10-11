import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney, parseMoney } from './format'

describe('formatMoney', () => {
  it('uses dot for thousands, comma for decimals, euro sign after', () => {
    // Intl separates the currency symbol with a non-breaking space.
    const format = (cents: number) => formatMoney(cents).replace(/ /g, ' ')
    expect(format(123456)).toBe('1.234,56 €')
    expect(format(123456789)).toBe('1.234.567,89 €')
    expect(format(5)).toBe('0,05 €')
    expect(format(-250050)).toBe('-2.500,50 €')
  })
})

describe('formatDate', () => {
  it('formats as dd/MM/yyyy', () => {
    expect(formatDate(new Date(2026, 9, 1))).toBe('01/10/2026')
  })
})

describe('parseMoney', () => {
  it('parses comma and dot decimals', () => {
    expect(parseMoney('12,5')).toBe(1250)
    expect(parseMoney('12.50')).toBe(1250)
    expect(parseMoney('7')).toBe(700)
    expect(parseMoney(',5')).toBe(50)
    expect(parseMoney('40,00 €')).toBe(4000)
  })

  it('treats separators before three digits as thousands', () => {
    expect(parseMoney('1.234,56')).toBe(123456)
    expect(parseMoney('1.234')).toBe(123400)
  })

  it('rejects anything that is not an amount', () => {
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('-5')).toBeNull()
    expect(parseMoney(',')).toBeNull()
  })
})
