import { t } from '../i18n/pt'
import { addDays, todayISO } from './dates'
import { formatWeekday } from './format'

// Local calendar day of an instant, as 'YYYY-MM-DD'.
export const localDay = (instant: string) => todayISO(new Date(instant))

// "Hoje", "Ontem", then "Quarta, 08 out".
export function dayLabel(day: string): string {
  const today = todayISO()
  if (day === today) return t.activity.today
  if (day === addDays(today, -1)) return t.activity.yesterday
  return formatWeekday(day)
}
