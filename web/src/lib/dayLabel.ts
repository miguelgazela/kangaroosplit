import { t } from '../i18n/pt'
import { addDays, todayISO } from './dates'
import { formatLongDay } from './format'

// Local calendar day of an instant, as 'YYYY-MM-DD'.
export const localDay = (instant: string) => todayISO(new Date(instant))

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

// "Hoje", "Ontem", then "Terça-feira, 6 de outubro".
export function dayLabel(day: string): string {
  const today = todayISO()
  if (day === today) return t.activity.today
  if (day === addDays(today, -1)) return t.activity.yesterday
  return capitalise(formatLongDay(day))
}

// Always the full date: "Hoje, segunda-feira, 5 de outubro" or
// "Segunda-feira, 5 de outubro".
export function fullDayLabel(day: string): string {
  const long = formatLongDay(day)
  return day === todayISO() ? `${t.activity.today}, ${long}` : capitalise(long)
}
