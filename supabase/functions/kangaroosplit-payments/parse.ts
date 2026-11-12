// Pure helpers for the payments endpoint. No Deno or network code here, so the
// web tests can import this file (web/src/lib/payments.test.ts).

// What the Shortcuts "Transação" trigger sends comes from the phone's locale:
// "23,40 €", "€23.40", "1.234,56", "$1,234.56", "23.40 EUR". Returns cents, or
// null when it is not a positive amount.
export function parseAmountCents(input: unknown): number | null {
  if (typeof input === 'number') {
    if (!Number.isFinite(input) || input <= 0) return null
    return Math.round(input * 100)
  }
  if (typeof input !== 'string') return null

  const digits = input.replace(/[^\d.,]/g, '')
  if (!/\d/.test(digits)) return null

  const lastComma = digits.lastIndexOf(',')
  const lastDot = digits.lastIndexOf('.')
  const decimalAt = Math.max(lastComma, lastDot)
  let whole: string
  let fraction = ''

  if (decimalAt === -1) {
    whole = digits
  } else {
    const after = digits.slice(decimalAt + 1)
    // A single separator followed by exactly three digits is a thousands
    // separator ("1.234"), unless the other separator proves otherwise.
    const otherSeparator = lastComma !== -1 && lastDot !== -1
    const looksLikeThousands = after.length === 3 && !otherSeparator
    if (looksLikeThousands) {
      whole = digits
    } else {
      whole = digits.slice(0, decimalAt)
      fraction = after
    }
  }

  whole = whole.replace(/[.,]/g, '')
  if (fraction.length > 2) return null
  const cents = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0') || '0')
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null
}

// "PINGO DOCE 0123" -> "Pingo Doce". Wallet sends the merchant as the card
// network does: often upper case, sometimes with a store number.
export function cleanMerchant(raw: string): string {
  let name = raw.replace(/\s+/g, ' ').trim()
  // Trailing store or terminal codes: "CONTINENTE 0123", "UBER *EATS HELP".
  name = name.replace(/\s*[*#]\s*/g, ' ').replace(/\s+\d{2,}$/g, '').trim()
  if (name === name.toUpperCase() && /[A-Z]/.test(name)) {
    name = name
      .toLowerCase()
      .replace(/(^|[\s\-'/])(\p{L})/gu, (_match, before: string, letter: string) => before + letter.toUpperCase())
  }
  return name.slice(0, 80) || raw.trim().slice(0, 80)
}

// Name without case, accents and extra spaces. Rules match on it.
export function merchantKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 80)
}

// "Visa ···· 4242" or "4242" -> "4242".
export function parseCardLast4(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const match = /(\d{4})\D*$/.exec(input.trim())
  return match ? match[1] : null
}
