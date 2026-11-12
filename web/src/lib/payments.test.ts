import { describe, expect, it } from 'vitest'
import {
  cleanMerchant,
  merchantKey,
  parseAmountCents,
  parseCardLast4,
} from '../../../supabase/functions/kangaroosplit-payments/parse'

describe('parseAmountCents', () => {
  it('reads what Shortcuts sends in different locales', () => {
    expect(parseAmountCents('23,40 €')).toBe(2340)
    expect(parseAmountCents('€23.40')).toBe(2340)
    expect(parseAmountCents('23.40 EUR')).toBe(2340)
    expect(parseAmountCents('1.234,56 €')).toBe(123456)
    expect(parseAmountCents('$1,234.56')).toBe(123456)
    expect(parseAmountCents('5')).toBe(500)
    expect(parseAmountCents('4,5')).toBe(450)
    expect(parseAmountCents(12.3)).toBe(1230)
  })

  it('treats a lone separator with three digits as thousands', () => {
    expect(parseAmountCents('1.234')).toBe(123400)
    expect(parseAmountCents('1,234')).toBe(123400)
  })

  it('rejects what is not a positive amount', () => {
    expect(parseAmountCents('')).toBeNull()
    expect(parseAmountCents('abc')).toBeNull()
    expect(parseAmountCents('0,00 €')).toBeNull()
    expect(parseAmountCents(-5)).toBeNull()
    expect(parseAmountCents(null)).toBeNull()
    expect(parseAmountCents('1,2345')).toBeNull()
  })
})

describe('cleanMerchant', () => {
  it('title-cases upper case names and drops store numbers', () => {
    expect(cleanMerchant('PINGO DOCE 0123')).toBe('Pingo Doce')
    expect(cleanMerchant('CONTINENTE  MODELO')).toBe('Continente Modelo')
    expect(cleanMerchant('UBER *EATS')).toBe('Uber Eats')
  })

  it('leaves mixed case names alone', () => {
    expect(cleanMerchant('Amazon.es')).toBe('Amazon.es')
    expect(cleanMerchant('  Café  Brasileira ')).toBe('Café Brasileira')
  })
})

describe('merchantKey', () => {
  it('ignores case, accents and punctuation', () => {
    expect(merchantKey('Café Brasileira')).toBe('cafe brasileira')
    expect(merchantKey('Pingo Doce')).toBe(merchantKey('PINGO  DOCE'))
    expect(merchantKey('Amazon.es')).toBe('amazon es')
  })
})

describe('parseCardLast4', () => {
  it('takes the last four digits', () => {
    expect(parseCardLast4('Visa ···· 4242')).toBe('4242')
    expect(parseCardLast4('4242')).toBe('4242')
    expect(parseCardLast4('Visa')).toBeNull()
    expect(parseCardLast4(undefined)).toBeNull()
  })
})
