import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { OptionSheet } from '../components/OptionSheet'
import { Screen } from '../components/Screen'
import { t } from '../i18n/pt'
import { monthKey, shiftMonth, todayISO } from '../lib/dates'
import {
  formatMoney,
  formatMonthName,
  formatMonthShort,
  formatMonthYear,
  formatPercent,
  splitMoney,
} from '../lib/format'
import { nameForms } from '../lib/people'
import { expensesInMonth, filterExpenses, monthlyTrend, sharesByUser, totalCents, totalsByCategory } from '../lib/stats'
import { useCategories, useCurrentMember, useExpenses, useLists, useMembers } from '../query/hooks'

const ALL = 'all'
const FALLBACK_COLOR = '#64748b'

export function Stats() {
  const { me, partner } = useCurrentMember()
  const { data: members } = useMembers()
  const { data: lists } = useLists()
  const { data: expenses } = useExpenses()
  const { data: categories } = useCategories()
  const currentMonth = monthKey(todayISO())
  const [scope, setScope] = useState(ALL)
  const [month, setMonth] = useState(currentMonth)
  const [pickingScope, setPickingScope] = useState(false)

  const header = (
    <div className="mt-1 flex h-[52px] items-center">
      <h1 className="text-large-title font-bold tracking-[0.4px]">{t.tabs.stats}</h1>
    </div>
  )
  if (!me || !partner || !members || !lists || !expenses || !categories) return <Screen>{header}</Screen>

  const scopeList = lists.find((list) => list.id === scope)
  const scoped = scopeList ? filterExpenses(expenses, { listId: scopeList.id }) : expenses
  const inMonth = expensesInMonth(scoped, month)
  const total = totalCents(inMonth)
  const previous = totalCents(expensesInMonth(scoped, shiftMonth(month, -1)))
  const trend = monthlyTrend(scoped, month)
  const peak = Math.max(...trend.map((point) => point.totalCents), 1)
  const shares = sharesByUser(inMonth)
  const byCategory = totalsByCategory(inMonth)
  const { whole, rest } = splitMoney(total)
  const change = previous > 0 ? (total - previous) / previous : null

  return (
    <Screen>
      {header}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setPickingScope(true)}
          className="flex h-11 min-w-0 items-center gap-1.5 rounded-full bg-surface px-3.5 text-subhead font-medium shadow-card"
        >
          <span className="truncate">{scopeList ? `${scopeList.icon} ${scopeList.name}` : t.stats.allLists}</span>
          <Icon name="chevronDown" size={14} strokeWidth={2.5} className="flex-none text-text-2" />
        </button>
        <div className="ml-auto flex h-11 flex-none items-center rounded-full bg-surface shadow-card">
          <button
            type="button"
            aria-label={t.stats.previousMonth}
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="flex h-11 w-9 items-center justify-center text-accent-text"
          >
            <Icon name="chevronLeft" size={18} strokeWidth={2.6} />
          </button>
          <span className="min-w-[104px] text-center text-subhead font-semibold">{formatMonthYear(month)}</span>
          <button
            type="button"
            aria-label={t.stats.nextMonth}
            disabled={month >= currentMonth}
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="flex h-11 w-9 items-center justify-center text-accent-text disabled:text-disabled"
          >
            <Icon name="chevronRight" size={18} strokeWidth={2.6} />
          </button>
        </div>
      </div>

      <section className="flex flex-col gap-3.5 rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-subhead text-text-2">{t.stats.monthTotal}</span>
            <span className="text-[32px] leading-10 font-bold tracking-[-0.5px] tabular-nums">
              {whole}
              <span className="text-text-2">{rest}</span>
            </span>
            {change !== null && (
              <span className="text-footnote text-text-2">
                {t.stats.versus(
                  `${change >= 0 ? '+' : '−'}${formatPercent(Math.abs(change))}`,
                  formatMonthName(shiftMonth(month, -1)),
                )}
              </span>
            )}
          </div>
          <div className="flex flex-none flex-col items-end gap-1.5">
            <span className="text-xs text-text-2">{t.stats.lastSixMonths}</span>
            <div className="flex h-16 items-end gap-1" role="img" aria-label={t.stats.lastSixMonths}>
              {trend.map((point) => (
                <div key={point.month} className="flex h-full w-[18px] flex-col items-center justify-end gap-1">
                  <div
                    className={`w-full rounded-[4px] ${point.month === month ? 'bg-accent' : 'bg-accent/25'}`}
                    style={{ height: `${Math.max((point.totalCents / peak) * 100, 4)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              {trend.map((point) => (
                <span
                  key={point.month}
                  className={`w-[18px] text-center text-[10px] ${point.month === month ? 'font-bold' : 'text-text-2'}`}
                >
                  {formatMonthShort(point.month)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {total > 0 && (
          <>
            <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
              {members.map((member) => (
                <span
                  key={member.user_id}
                  style={{ width: `${((shares[member.user_id] ?? 0) * 100) / total}%`, background: member.color }}
                />
              ))}
            </div>
            <div className="flex gap-3">
              {members.map((member) => (
                <div key={member.user_id} className="flex min-w-0 flex-1 items-center gap-2">
                  <Avatar member={member} size={28} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-footnote text-text-2">
                      {member.user_id === me.user_id ? t.stats.yourShare : t.stats.shareOf(nameForms(member).of)}
                    </span>
                    <span className="text-subhead font-semibold tabular-nums">
                      {formatMoney(shares[member.user_id] ?? 0)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {total === 0 ? (
        <p className="py-10 text-center text-body text-text-2">{t.stats.empty}</p>
      ) : (
        <section className="flex flex-col gap-3 rounded-card bg-surface px-4 pt-4 pb-1 shadow-card">
          <div className="flex items-baseline justify-between">
            <h2 className="text-headline font-bold">{t.stats.byCategory}</h2>
            <span className="text-footnote text-text-2">{t.stats.categories(byCategory.length)}</span>
          </div>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {byCategory.map((entry) => (
              <span
                key={entry.categoryId}
                style={{
                  width: `${entry.fraction * 100}%`,
                  background: categories.find((category) => category.id === entry.categoryId)?.color ?? FALLBACK_COLOR,
                }}
              />
            ))}
          </div>
          <div>
            {byCategory.map((entry, index) => {
              const category = categories.find((candidate) => candidate.id === entry.categoryId)
              return (
                <div
                  key={entry.categoryId}
                  className={`flex h-[42px] items-center gap-2.5 ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}
                >
                  <span className="size-2.5 flex-none rounded-[3px]" style={{ background: category?.color ?? FALLBACK_COLOR }} />
                  <span className="flex-none text-lg">{category?.icon ?? '📦'}</span>
                  <span className="min-w-0 flex-1 truncate text-subhead">{category?.name}</span>
                  <span className="flex-none text-footnote text-text-2 tabular-nums">{formatPercent(entry.fraction)}</span>
                  <span className="min-w-[84px] flex-none text-right text-subhead font-semibold tabular-nums">
                    {formatMoney(entry.totalCents)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {pickingScope && (
        <OptionSheet
          title={t.stats.scope}
          options={[
            { id: ALL, icon: '🗂️', label: t.stats.allLists },
            ...lists.map((list) => ({ id: list.id, icon: list.icon, label: list.name })),
          ]}
          selected={scopeList ? scopeList.id : ALL}
          onPick={(id) => {
            setScope(id)
            setPickingScope(false)
          }}
          onClose={() => setPickingScope(false)}
        />
      )}
    </Screen>
  )
}
