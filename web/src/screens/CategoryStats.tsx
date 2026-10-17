import { useParams, useSearchParams } from 'react-router-dom'
import { BackLink } from '../components/BackLink'
import { Screen } from '../components/Screen'
import { TrendBars } from '../components/TrendBars'
import { t } from '../i18n/pt'
import { formatDayMonth, formatMoney, formatPercent } from '../lib/format'
import { formatPeriod, isYear, readStatsParams, statsQuery, trendWindow } from '../lib/period'
import { expensesInPeriod, filterExpenses, monthlyTrend, totalCents } from '../lib/stats'
import { useIncremental } from '../lib/useIncremental'
import { useCategories, useCurrentMember, useExpenses, useLists } from '../query/hooks'
import { useSheets } from '../sheets/SheetContext'

// One category over time: how it trends month to month, and what is in it.
export function CategoryStats() {
  const { categoryId } = useParams()
  const [params, setParams] = useSearchParams()
  const { editExpense } = useSheets()
  const { me } = useCurrentMember()
  const { data: lists } = useLists()
  const { data: expenses } = useExpenses()
  const { data: categories } = useCategories()

  const { scope, period } = readStatsParams(params)
  const back = <BackLink to={`/estatisticas?${statsQuery(scope, period)}`} label={t.tabs.stats} />

  const scopeList = lists?.find((list) => list.id === scope)
  const scoped = filterExpenses(expenses ?? [], { listId: scopeList?.id, categoryId })
  const inPeriod = expensesInPeriod(scoped, period)
  const { count, hasMore, sentinel } = useIncremental(inPeriod.length, `${categoryId}|${scope}|${period}`)

  const category = categories?.find((candidate) => candidate.id === categoryId)
  if (!me || !lists || !expenses || !categories || !category) {
    return (
      <Screen gap={12}>
        <div className="-mx-2 flex h-11 items-center">{back}</div>
      </Screen>
    )
  }

  const yearly = isYear(period)
  const total = totalCents(inPeriod)
  const overall = totalCents(expensesInPeriod(filterExpenses(expenses, { listId: scopeList?.id }), period))
  // A month view still charts a year, so the trend has enough to show.
  const window = yearly ? trendWindow(period) : { endMonth: period, months: 12 }
  const trend = monthlyTrend(scoped, window.endMonth, window.months)

  return (
    <Screen gap={12}>
      <div className="-mx-2 flex h-11 items-center">{back}</div>

      <div className="flex items-center gap-3">
        <span
          className="flex size-12 flex-none items-center justify-center rounded-button text-[26px]"
          style={{ background: `${category.color}26` }}
        >
          {category.icon}
        </span>
        <div className="flex min-w-0 flex-col gap-px">
          <h1 className="truncate text-[30px] leading-9 font-bold">{category.name}</h1>
          <span className="truncate text-footnote text-text-2">
            {formatPeriod(period)} · {scopeList ? `${scopeList.icon} ${scopeList.name}` : t.stats.allLists}
          </span>
        </div>
      </div>

      <section className="flex flex-col gap-3.5 rounded-card bg-surface p-4 shadow-card">
        <div className="flex flex-col">
          <span className="text-[32px] leading-10 font-bold tracking-[-0.5px] tabular-nums">
            {formatMoney(total)}
          </span>
          <span className="text-footnote text-text-2">
            {t.stats.expenses(inPeriod.length)}
            {overall > 0 && ` · ${t.stats.ofTotal(formatPercent(total / overall))}`}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-text-2">{t.stats.byMonth}</span>
          {/* Tapping a bar moves this screen to that month. */}
          <TrendBars
            points={trend}
            highlight={yearly ? undefined : period}
            label={t.stats.byMonth}
            onPick={(month) => setParams(statsQuery(scope, month), { replace: true })}
            height={88}
          />
        </div>
      </section>

      {inPeriod.length === 0 ? (
        <p className="py-10 text-center text-body text-text-2">{t.stats.emptyCategory}</p>
      ) : (
        <div className="overflow-hidden rounded-card bg-surface shadow-card">
          {inPeriod.slice(0, count).map((expense, index) => {
            const list = lists.find((candidate) => candidate.id === expense.list_id)
            return (
              <button
                key={expense.id}
                type="button"
                onClick={() => editExpense(expense)}
                className={`flex min-h-14 w-full items-center gap-3 px-3.5 py-2.5 text-left ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-base font-semibold">{expense.description}</span>
                  <span className="truncate text-footnote text-text-2">
                    {formatDayMonth(expense.spent_on)}
                    {!scopeList && list && ` · ${list.icon} ${list.name}`}
                  </span>
                </span>
                <span className="flex-none text-base font-semibold tabular-nums">{formatMoney(expense.amount_cents)}</span>
              </button>
            )
          })}
        </div>
      )}
      {hasMore && <div ref={sentinel} aria-hidden="true" className="h-px" />}
    </Screen>
  )
}
