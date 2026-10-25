const LOCALE = 'pt-PT'

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  // pt-PT omits the thousands separator on 4-digit numbers by default.
  useGrouping: 'always',
})

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

// Formats as "1.234,56 €". Intl's pt-PT output groups thousands with a space;
// we use a dot instead.
export function formatMoney(cents: number): string {
  return moneyFormatter
    .formatToParts(cents / 100)
    .map((part) => (part.type === 'group' ? '.' : part.value))
    .join('')
}

export function formatDate(date: Date): string {
  return dateFormatter.format(date)
}

// Parses user input such as "12,5", "1.234,56" or "12.50" into integer cents.
// Returns null when input is not a valid non-negative amount.
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/[\s€]/g, '')
  if (cleaned === '') return null

  const lastSeparator = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'))
  const decimals = lastSeparator === -1 ? '' : cleaned.slice(lastSeparator + 1)
  const hasDecimalPart = lastSeparator !== -1 && decimals.length <= 2

  const whole = (hasDecimalPart ? cleaned.slice(0, lastSeparator) : cleaned).replace(/[.,]/g, '')
  const fraction = hasDecimalPart ? decimals.padEnd(2, '0') : '00'

  if (!/^\d*$/.test(whole) || !/^\d{2}$/.test(fraction) || whole + decimals === '') return null
  return Number(whole || '0') * 100 + Number(fraction)
}

const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

// '2026-10-08' -> '08 out'
export function formatDayMonth(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${day} ${MONTHS[Number(month) - 1].slice(0, 3)}`
}

// '2026-10-08' -> '8 out' (in a sentence, no leading zero)
export function formatDayMonthShort(iso: string): string {
  const [, month, day] = iso.split('-')
  return `${Number(day)} ${MONTHS[Number(month) - 1].slice(0, 3)}`
}

// '2026-10' -> 'Outubro 2026'
export function formatMonthYear(month: string): string {
  const [year, monthNumber] = month.split('-')
  const name = MONTHS[Number(monthNumber) - 1]
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`
}

// '2026-10-08' -> '08/10/2026'
export function formatISODate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

// '02/08 – 12/08/2026'; the first year is dropped when both match.
export function formatDateRange(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  if (!from || !to) return formatISODate((from ?? to)!)
  const start = from.slice(0, 4) === to.slice(0, 4) ? formatISODate(from).slice(0, 5) : formatISODate(from)
  return `${start} – ${formatISODate(to)}`
}

// "33,5" or "33.5" -> 33.5. Null when not a non-negative number.
export function parseDecimal(input: string): number | null {
  const cleaned = input.trim().replace(',', '.')
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return null
  return Number(cleaned)
}

// 33.5 -> "33,5"; at most two decimals, no trailing zeros.
export function formatDecimal(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',')
}

// 2400 -> "24,00" (an amount for a text field, without the euro sign).
export function formatAmountInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

// '2026-10' -> 'out'
export function formatMonthShort(month: string): string {
  return MONTHS[Number(month.split('-')[1]) - 1].slice(0, 3)
}

// '2026-09' -> 'setembro'
export function formatMonthName(month: string): string {
  return MONTHS[Number(month.split('-')[1]) - 1]
}

// '2026-10-06' -> 'Terça, 06 out'
export function formatWeekday(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return `${WEEKDAYS[new Date(year, month - 1, day).getDay()]}, ${formatDayMonth(iso)}`
}

const LONG_WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

// '2026-10-06' -> 'terça-feira, 6 de outubro' (lower case, for inside a sentence)
export function formatLongDay(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return `${LONG_WEEKDAYS[new Date(year, month - 1, day).getDay()]}, ${day} de ${MONTHS[month - 1]}`
}

// Local time of an instant, as 'HH:mm'.
export function formatTime(instant: string): string {
  const date = new Date(instant)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 0.792 -> '79,2 %'
export function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1).replace('.', ',')} %`
}

// Whole euros for tight spots such as calendar cells: "1.150 €". A narrow
// no-break space keeps the sign close to the number.
export function formatWholeEuros(cents: number): string {
  const euros = String(Math.round(cents / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${euros} €`
}
