import { useState } from 'react'
import { Icon } from './Icon'
import { t } from '../i18n/pt'
import { leadingBlanks, tintLevel, type CalendarDay } from '../lib/calendar'
import type { Category, Member } from '../lib/database.types'
import { formatMoney, formatMonthName, formatWeekday, formatWholeEuros } from '../lib/format'
import { nameForms } from '../lib/people'
import { expensePosition } from '../lib/stats'

const TINTS = [
  'transparent',
  'color-mix(in srgb, var(--color-accent) 12%, transparent)',
  'color-mix(in srgb, var(--color-accent) 26%, transparent)',
  'color-mix(in srgb, var(--color-accent) 48%, transparent)',
  'var(--color-accent)',
]
const SELECTED_RING = '0 0 0 2.5px #F59E0B'
const TODAY_RING = 'inset 0 0 0 1.5px var(--color-accent-text)'

function weekdayName(iso: string): string {
  return formatWeekday(iso).split(',')[0]
}

function dayTitle(iso: string, today: string): string {
  const label = formatWeekday(iso).replace(', 0', ', ')
  return iso === today ? `${t.stats.today[0].toUpperCase()}${t.stats.today.slice(1)} · ${label}` : label
}

function ariaFor(day: CalendarDay, month: string, today: string): string {
  const parts = [`${weekdayName(day.date)}, ${day.day} de ${formatMonthName(month)}`]
  if (day.date === today) parts[0] += ` (${t.stats.today})`
  if (day.totalCents > 0) parts.push(formatMoney(day.totalCents))
  if (day.planned.length + day.scheduled.length > 0) parts.push(t.stats.plannedAria)
  if (day.settlements.length > 0) parts.push(t.stats.settledAria)
  return parts.join(', ')
}

export function StatsCalendar({
  month,
  days,
  today,
  me,
  partner,
  categories,
}: {
  month: string
  days: CalendarDay[]
  today: string
  me: Member
  partner: Member
  categories: Category[]
}) {
  // No day is selected on open; tapping the selected day again clears it.
  const [selected, setSelected] = useState<string | null>(null)
  const blanks = leadingBlanks(month)
  const expenseCount = days.reduce((sum, day) => sum + day.expenses.length, 0)
  const picked = days.find((day) => day.date === selected)
  const colorOf = (userId: string) => (userId === me.user_id ? me.color : partner.color)

  return (
    <section
      aria-label={t.stats.calendarLabel(formatMonthName(month))}
      className="rounded-card bg-surface px-1.5 pt-3 pb-2.5 shadow-card"
    >
      <div className="flex items-baseline justify-between px-2.5 pb-2">
        <h2 className="text-headline font-bold">{t.stats.calendar}</h2>
        <span className="text-footnote text-text-2">{t.stats.expenses(expenseCount)}</span>
      </div>

      <div aria-hidden="true" className="grid grid-cols-7 gap-1.5 px-[3px] pt-0.5 pb-1">
        {t.stats.weekdays.map((weekday, index) => (
          <span key={index} className="text-center text-[11px] font-semibold text-text-2">
            {weekday}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 px-[3px]">
        {Array.from({ length: blanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {days.map((day) => {
          const level = tintLevel(day.totalCents)
          const isToday = day.date === today
          const isSelected = day.date === selected
          const plannedCount = day.planned.length + day.scheduled.length
          const empty = day.expenses.length + day.settlements.length + plannedCount === 0
          const plannedOnly = day.totalCents === 0 && plannedCount > 0
          const payers = [...new Set(day.expenses.map((expense) => expense.paid_by))]
          const shadows = [isToday && TODAY_RING, isSelected && SELECTED_RING].filter(Boolean).join(', ')
          return (
            <button
              key={day.date}
              type="button"
              aria-label={ariaFor(day, month, today)}
              aria-pressed={isSelected}
              disabled={empty}
              onClick={() => setSelected(isSelected ? null : day.date)}
              className={`flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-[10px] ${
                level === 4 ? 'text-white' : ''
              } ${plannedOnly ? 'border-[1.5px] border-dashed border-accent' : ''}`}
              style={{ background: TINTS[level], boxShadow: shadows || undefined }}
            >
              <span
                className={`-mb-0.5 text-base leading-[18px] ${isToday || isSelected ? 'font-bold' : 'font-medium'}`}
              >
                {day.day}
              </span>
              <span
                className={`min-h-3 text-[10px] leading-3 font-semibold tracking-[-0.2px] whitespace-nowrap tabular-nums ${
                  plannedOnly ? 'opacity-75' : ''
                }`}
              >
                {day.totalCents > 0
                  ? formatWholeEuros(day.totalCents)
                  : plannedOnly
                    ? formatWholeEuros(
                        day.planned.reduce((sum, p) => sum + p.rule.amount_cents, 0) +
                          day.scheduled.reduce((sum, e) => sum + e.amount_cents, 0),
                      )
                    : ''}
              </span>
              <span aria-hidden="true" className="flex h-[5px] items-center gap-0.5">
                {payers.map((userId) => (
                  <span
                    key={userId}
                    className="size-[5px] rounded-full"
                    style={{ background: colorOf(userId), boxShadow: `0 0 0 1px ${level === 4 ? '#fff' : 'transparent'}` }}
                  />
                ))}
                {day.settlements.length > 0 && <span className="size-[5px] rounded-full bg-pos" />}
              </span>
            </button>
          )
        })}
      </div>

      {picked && (
        <div className="mx-1 mt-3 flex flex-col gap-1 border-t-[0.5px] border-separator pt-2.5">
          <div className="flex items-center justify-between px-1.5">
            <span className="text-footnote font-semibold tracking-[0.4px] text-text-2 uppercase">
              {dayTitle(picked.date, today)}
            </span>
            {picked.totalCents > 0 && (
              <span className="text-footnote text-text-2 tabular-nums">{formatMoney(picked.totalCents)}</span>
            )}
          </div>

          {picked.expenses.map((expense) => {
            const category = categories.find((candidate) => candidate.id === expense.category_id)
            const mine = expense.paid_by === me.user_id
            const position = expensePosition(expense, me.user_id)
            return (
              <div key={expense.id} className="flex min-h-14 items-center gap-3 p-1.5">
                <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-fill text-xl">
                  {category?.icon ?? '📦'}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold">{expense.description}</span>
                  <span className="truncate text-footnote text-text-2">
                    {mine ? t.expense.paidByYou : t.expense.paidBy(nameForms(partner).by)}
                    {expense.recurring_id ? ` · ${t.expense.recurring}` : ''}
                  </span>
                </span>
                <span className="flex flex-none flex-col items-end gap-0.5">
                  <span className="text-base font-semibold tabular-nums">{formatMoney(expense.amount_cents)}</span>
                  {position !== 0 && (
                    <span className={`text-footnote font-medium tabular-nums ${position > 0 ? 'text-pos' : 'text-neg'}`}>
                      {position > 0 ? t.expense.lent(formatMoney(position)) : t.expense.owe(formatMoney(-position))}
                    </span>
                  )}
                </span>
              </div>
            )
          })}

          {picked.settlements.map((settlement) => (
            <div key={settlement.id} className="flex min-h-14 items-center gap-3 rounded-xl bg-settle p-1.5">
              <span className="flex size-10 flex-none items-center justify-center rounded-xl border-[1.5px] border-dashed border-accent bg-fill text-accent-text">
                <Icon name="settle" size={20} strokeWidth={2.2} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-base font-semibold text-accent-text">
                  {settlement.to_user === me.user_id
                    ? t.settlement.paidYou(nameForms(partner).subject)
                    : t.settlement.youPaid(nameForms(partner).to)}
                </span>
                <span className="truncate text-footnote text-text-2">{t.settlement.label}</span>
              </span>
              <span className="flex-none text-base font-semibold text-accent-text tabular-nums">
                {formatMoney(settlement.amount_cents)}
              </span>
            </div>
          ))}

          {picked.scheduled.map((expense) => {
            const category = categories.find((candidate) => candidate.id === expense.category_id)
            return (
              <div key={expense.id} className="flex min-h-14 items-center gap-3 p-1.5">
                <span className="flex size-10 flex-none items-center justify-center rounded-xl border-[1.5px] border-dashed border-accent bg-fill text-xl">
                  {category?.icon ?? '📦'}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold text-text-2">{expense.description}</span>
                  <span className="truncate text-footnote text-text-2">
                    {expense.recurring_id ? t.stats.plannedRecurring : t.stats.planned}
                  </span>
                </span>
                <span className="flex-none text-base font-semibold text-text-2 tabular-nums">
                  {formatMoney(expense.amount_cents)}
                </span>
              </div>
            )
          })}

          {picked.planned.map(({ rule }) => {
            const category = categories.find((candidate) => candidate.id === rule.category_id)
            return (
              <div key={rule.id} className="flex min-h-14 items-center gap-3 p-1.5">
                <span className="flex size-10 flex-none items-center justify-center rounded-xl border-[1.5px] border-dashed border-accent bg-fill text-xl">
                  {category?.icon ?? '📦'}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold text-text-2">{rule.description}</span>
                  <span className="truncate text-footnote text-text-2">{t.stats.plannedRecurring}</span>
                </span>
                <span className="flex-none text-base font-semibold text-text-2 tabular-nums">
                  {formatMoney(rule.amount_cents)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
