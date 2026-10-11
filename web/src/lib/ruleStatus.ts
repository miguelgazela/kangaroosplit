import { nextOccurrence } from '../data/recurring'
import { t } from '../i18n/pt'
import type { RecurringExpense } from './database.types'
import { todayISO } from './dates'
import { formatISODate } from './format'

// "Próxima: 01/11/2026", "Em pausa" or "Terminada".
export function ruleStatus(rule: RecurringExpense): string {
  if (rule.paused_at) return t.recurring.paused
  const next = nextOccurrence(rule, todayISO())
  return next ? t.recurring.next(formatISODate(next)) : t.recurring.finished
}
