import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Guru } from '../components/Guru'
import { Icon } from '../components/Icon'
import { OptionSheet } from '../components/OptionSheet'
import { Screen } from '../components/Screen'
import { Segmented } from '../components/Segmented'
import { Skeleton } from '../components/Skeleton'
import { StatsCalendar, StatsCalendarSkeleton } from '../components/StatsCalendar'
import { TrendBars } from '../components/TrendBars'
import { t } from '../i18n/pt'
import { CATEGORY_FALLBACK } from '../theme/colors'
import { buildCalendar } from '../lib/calendar'
import { todayISO } from '../lib/dates'
import { formatMoney, formatPercent } from '../lib/format'
import { useFirstLoad } from '../lib/useFirstLoad'
import { reviewToday, useOfferedYear } from '../lib/useYearReview'
import { reviewableYears } from '../lib/yearSummary'
import { nameForms } from '../lib/people'
import {
  currentMonth,
  elapsedMonths,
  formatPeriod,
  formatPeriodInline,
  isFuture,
  isYear,
  readStatsParams,
  shiftPeriod,
  statsQuery,
  trendWindow,
} from '../lib/period'
import { expensesInPeriod, filterExpenses, monthlyTrend, sharesByUser, totalCents, totalsByCategory } from '../lib/stats'
import { useCategories, useCurrentMember, useExpenses, useLists, useMembers, useRecurring, useSettlements } from '../query/hooks'

const ALL = 'all'

// Opens the year in review ("Resumo de 2026 ›").
function YearReviewRow({ year }: { year: number }) {
  return (
    <Link
      to={`/resumo/${year}`}
      className="flex h-[52px] items-center gap-3 rounded-cta bg-surface px-4 shadow-card"
    >
      <span aria-hidden="true" className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-accent-soft text-lg">
        🎉
      </span>
      <span className="flex-1 text-body font-semibold">{t.yearReview.statsRow(year)}</span>
      <Icon name="chevronRight" size={14} strokeWidth={2.5} className="text-text-2" />
    </Link>
  )
}
const FALLBACK_COLOR = CATEGORY_FALLBACK

// Line-height boxes keep each bar where the real text sits, so nothing moves
// when the data arrives.
function Bar({ line, className, width }: { line: string; className: string; width?: string }) {
  return (
    <div className={`flex items-center ${line}`}>
      <Skeleton className={`rounded-full ${className}`} style={width ? { width } : undefined} />
    </div>
  )
}

function TotalSkeleton({ yearly }: { yearly: boolean }) {
  return (
    <section
      aria-label={t.system.loadingTotal}
      aria-busy="true"
      className="flex flex-col gap-3.5 rounded-card bg-surface p-4 shadow-card"
    >
      <div className={yearly ? 'flex flex-col gap-3.5' : 'flex items-end gap-3'}>
        <div className="flex min-w-0 flex-1 flex-col">
          <Bar line="h-5" className="h-3.5 w-24" />
          <div className="flex h-10 items-center">
            <Skeleton className="h-[34px] w-[168px] rounded-[10px]" />
          </div>
          <Bar line="h-[18px]" className="h-3 w-[140px]" />
        </div>
        <div className={`flex flex-col gap-1.5 ${yearly ? '' : 'flex-none items-end'}`}>
          <Bar line="h-4" className="h-2.5 w-20" />
          <div className="flex items-end gap-1" style={{ height: (yearly ? 88 : 64) + 19 }}>
            {['47%', '59%', '41%', '78%', '50%', '56%'].map((height, index) => (
              <div key={index} className="flex h-full w-[18px] flex-col justify-end pb-[19px]">
                <Skeleton className="w-full rounded-t-[4px]" style={{ height }} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <Skeleton className="h-2.5 rounded-full" />
      <div className="flex gap-3">
        {[0, 1].map((index) => (
          <div key={index} className="flex min-w-0 flex-1 items-center gap-2">
            <Skeleton className="size-7 rounded-full" />
            <div className="flex flex-col">
              <Bar line="h-[18px]" className="h-2.5 w-[70px]" />
              <Bar line="h-5" className="h-3.5 w-[82px]" />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CategoriesSkeleton() {
  return (
    <section
      aria-label={t.system.loadingCategories}
      aria-busy="true"
      className="flex flex-col gap-3 rounded-card bg-surface px-4 pt-4 pb-1 shadow-card"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-headline font-bold">{t.stats.byCategory}</h2>
        <Bar line="h-[18px]" className="h-3 w-[76px]" />
      </div>
      <Skeleton className="h-3 rounded-full" />
      <div>
        {['46%', '62%', '38%', '54%'].map((width, index) => (
          <div
            key={width}
            className={`flex h-11 items-center gap-2.5 ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}
          >
            <Skeleton className="size-2.5 rounded-[3px]" />
            <Skeleton className="size-[22px] rounded-[7px]" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-[13px] rounded-full" style={{ width }} />
            </div>
            <Skeleton className="h-[11px] w-10 rounded-full" />
            <Skeleton className="h-[13px] w-[72px] rounded-full" />
            <span className="w-3 flex-none" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function Stats() {
  const { me, partner } = useCurrentMember()
  const { data: members } = useMembers()
  const { data: lists } = useLists()
  const { data: expenses } = useExpenses()
  const { data: categories } = useCategories()
  const { data: settlements } = useSettlements()
  const { data: recurring } = useRecurring()
  const [params, setParams] = useSearchParams()
  const [pickingScope, setPickingScope] = useState(false)

  const { scope, period } = readStatsParams(params)
  const yearly = isYear(period)
  // From 24 December to 31 January the summary sits at the top. Later, a
  // finished year with enough expenses offers it in the year view.
  const offeredYear = useOfferedYear()
  const pastYear =
    yearly &&
    Number(period) < Number(reviewToday().slice(0, 4)) &&
    Number(period) !== offeredYear &&
    expenses !== undefined &&
    reviewableYears(expenses, reviewToday()).includes(Number(period))
      ? Number(period)
      : null
  const show = (nextScope: string | null, nextPeriod: string) =>
    setParams(statsQuery(nextScope, nextPeriod), { replace: true })

  const header = (
    <>
      <div className="mt-1 flex h-[52px] items-center">
        <h1 className="font-rounded text-large-title font-bold tracking-[0.2px]">{t.tabs.stats}</h1>
      </div>
      {offeredYear !== null && <YearReviewRow year={offeredYear} />}
    </>
  )
  const previousPeriod = shiftPeriod(period, -1)
  const scopeList = lists?.find((list) => list.id === scope)
  const controls = (
    <>
      <Segmented
        label={t.stats.period}
        options={[
          { id: 'month', label: t.stats.month },
          { id: 'year', label: t.stats.year },
        ]}
        value={yearly ? 'year' : 'month'}
        onChange={(next) => {
          if (next === 'year' && !yearly) show(scope, period.slice(0, 4))
          // Back to months: this month for the current year, December for a past one.
          if (next === 'month' && yearly) show(scope, period === currentMonth().slice(0, 4) ? currentMonth() : `${period}-12`)
        }}
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => lists && setPickingScope(true)}
          className="flex h-11 min-w-0 items-center gap-1.5 rounded-full bg-surface px-3.5 text-subhead font-medium shadow-card"
        >
          {scope && !lists ? (
            <Skeleton className="h-3.5 w-24 rounded-full" />
          ) : (
            <span className="truncate">{scopeList ? `${scopeList.icon} ${scopeList.name}` : t.stats.allLists}</span>
          )}
          <Icon name="chevronDown" size={14} strokeWidth={2.5} className="flex-none text-text-2" />
        </button>
        <div className="ml-auto flex h-11 flex-none items-center rounded-full bg-surface shadow-card">
          <button
            type="button"
            aria-label={yearly ? t.stats.previousYear : t.stats.previousMonth}
            onClick={() => show(scope, previousPeriod)}
            className="flex h-11 w-9 items-center justify-center text-link"
          >
            <Icon name="chevronLeft" size={18} strokeWidth={2.6} />
          </button>
          <span className={`text-center text-subhead font-semibold ${yearly ? 'min-w-[52px]' : 'min-w-[104px]'}`}>
            {formatPeriod(period)}
          </span>
          <button
            type="button"
            aria-label={yearly ? t.stats.nextYear : t.stats.nextMonth}
            disabled={isFuture(shiftPeriod(period, 1))}
            onClick={() => show(scope, shiftPeriod(period, 1))}
            className="flex h-11 w-9 items-center justify-center text-link disabled:text-disabled"
          >
            <Icon name="chevronRight" size={18} strokeWidth={2.6} />
          </button>
        </div>
      </div>
      {pastYear !== null && <YearReviewRow year={pastYear} />}
    </>
  )

  // Skeleton on first load only; cached data shows at once.
  const loading = useFirstLoad(
    Boolean(me && partner && members && lists && expenses && categories && settlements && recurring),
  )
  if (loading || !me || !partner || !members || !lists || !expenses || !categories || !settlements || !recurring) {
    return (
      <Screen>
        {header}
        {controls}
        <TotalSkeleton yearly={yearly} />
        <CategoriesSkeleton />
        {!yearly && <StatsCalendarSkeleton month={period} />}
      </Screen>
    )
  }

  const scoped = scopeList ? filterExpenses(expenses, { listId: scopeList.id }) : expenses
  const inPeriod = expensesInPeriod(scoped, period)
  const total = totalCents(inPeriod)
  const previous = totalCents(expensesInPeriod(scoped, previousPeriod))
  const window = trendWindow(period)
  const trend = monthlyTrend(scoped, window.endMonth, window.months)
  const shares = sharesByUser(inPeriod)
  const byCategory = totalsByCategory(inPeriod)
  const change = previous > 0 ? (total - previous) / previous : null
  const months = elapsedMonths(period)
  const inScope = <T extends { list_id: string }>(rows: T[]) => (scopeList ? rows.filter((row) => row.list_id === scopeList.id) : rows)
  const today = todayISO()

  return (
    <Screen>
      {header}

      {controls}

      <section className="flex flex-col gap-3.5 rounded-card bg-surface p-4 shadow-card">
        <div className={yearly ? 'flex flex-col gap-3.5' : 'flex items-end gap-3'}>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-subhead text-text-2">{yearly ? t.stats.yearTotal : t.stats.monthTotal}</span>
            <span className="font-rounded text-[36px] leading-[42px] font-bold tabular-nums">
              {formatMoney(total)}
            </span>
            {yearly && total > 0 && months > 0 && (
              <span className="text-footnote text-text-2">
                {t.stats.monthlyAverage(formatMoney(Math.round(total / months)))}
              </span>
            )}
            {change !== null && (
              <span className="text-footnote text-text-2">
                {t.stats.versus(
                  change >= 0,
                  formatPercent(Math.abs(change)),
                  formatPeriodInline(previousPeriod),
                )}
              </span>
            )}
          </div>
          <div className={`flex flex-col gap-1.5 ${yearly ? '' : 'flex-none items-end'}`}>
            <span className="text-xs text-text-2">{yearly ? t.stats.byMonth : t.stats.lastSixMonths}</span>
            {/* In the year view a bar opens that month. */}
            <TrendBars
              points={trend}
              highlight={yearly ? undefined : period}
              label={yearly ? t.stats.byMonth : t.stats.lastSixMonths}
              onPick={yearly ? (month) => show(scope, month) : undefined}
              height={yearly ? 88 : 64}
            />
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
        <div className="flex flex-col items-center gap-2 py-6">
          <Guru pose="dormir" size={130} decorative />
          <p className="text-center text-body text-text-2">{yearly ? t.stats.emptyYear : t.stats.empty}</p>
        </div>
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
                <Link
                  key={entry.categoryId}
                  to={`/estatisticas/categoria/${entry.categoryId}?${statsQuery(scope, period)}`}
                  className={`flex h-11 items-center gap-2.5 ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}
                >
                  <span className="size-2.5 flex-none rounded-[3px]" style={{ background: category?.color ?? FALLBACK_COLOR }} />
                  <span className="flex-none text-lg">{category?.icon ?? '📦'}</span>
                  <span className="min-w-0 flex-1 truncate text-subhead">{category?.name}</span>
                  <span className="flex-none text-footnote text-text-2 tabular-nums">{formatPercent(entry.fraction)}</span>
                  <span className="flex-none text-right text-subhead font-semibold tabular-nums">
                    {formatMoney(entry.totalCents)}
                  </span>
                  <Icon name="chevronRight" size={12} strokeWidth={2.5} className="flex-none text-text-2" />
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {!yearly && (
        <StatsCalendar
          key={`${scope ?? ALL}-${period}`}
          month={period}
          days={buildCalendar(period, inPeriod, inScope(settlements), inScope(recurring), today)}
          today={today}
          me={me}
          partner={partner}
          categories={categories}
          lists={lists}
        />
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
            show(id === ALL ? null : id, period)
            setPickingScope(false)
          }}
          onClose={() => setPickingScope(false)}
        />
      )}
    </Screen>
  )
}
