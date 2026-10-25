import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { Guru } from '../components/Guru'
import { BalanceAmount } from '../components/Balance'
import { Icon } from '../components/Icon'
import { Screen } from '../components/Screen'
import { WhatsNewSheet } from '../components/WhatsNewSheet'
import { t } from '../i18n/pt'
import type { List, Member } from '../lib/database.types'
import { formatDateRange, formatDayMonth, formatMoney } from '../lib/format'
import { useOnline } from '../lib/online'
import { nameForms, ratio } from '../lib/people'
import { todayISO } from '../lib/dates'
import { isScheduled, listBalance, overallBalance, scheduledImpact } from '../lib/stats'
import { unseenCount, useActivitySeenAt } from '../lib/activitySeen'
import { useSheets } from '../sheets/SheetContext'
import { useCardDismissed, useOfferedYear, useYearSummary } from '../lib/useYearReview'
import {
  useActivity,
  useBalances,
  useCategories,
  useCurrentMember,
  useDefaultShares,
  useExpenses,
  useLists,
  useMembers,
} from '../query/hooks'

function HeroBalance({ cents, me, partner }: { cents: number; me: Member; partner: Member }) {
  const names = nameForms(partner)
  const [from, to] = cents >= 0 ? [partner, me] : [me, partner]

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2 text-headline font-semibold">
        {cents === 0 ? (
          <Icon name="check" size={22} strokeWidth={2.6} />
        ) : (
          <span className="flex items-center">
            <Avatar member={from} size={26} className="border-2 border-white/90" />
            <Icon name="arrowRight" size={22} />
            <Avatar member={to} size={26} className="border-2 border-white/90" />
          </span>
        )}
        <span>
          {cents > 0 ? t.balance.owesYou(names.subject) : cents < 0 ? t.balance.youOwe(names.to) : t.balance.settled}
        </span>
      </div>
      <div className="text-hero font-bold tracking-[-1px] tabular-nums">
        {formatMoney(Math.abs(cents))}
      </div>
    </div>
  )
}

function ListRow({ list, subtitle, balance }: { list: List; subtitle: string; balance: number }) {
  return (
    <>
      <span className="flex size-12 flex-none items-center justify-center rounded-button bg-accent-soft text-2xl">
        {list.icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="flex items-center gap-2">
          <span className="truncate text-headline font-semibold">{list.name}</span>
          {list.is_default && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-text">
              {t.lists.main}
            </span>
          )}
        </span>
        <span className="truncate text-footnote text-text-2">{subtitle}</span>
      </span>
      <span className="flex flex-none flex-col items-end gap-0.5">
        <BalanceAmount cents={balance} className="text-headline" />
        <span className="text-footnote text-text-2">
          {balance > 0 ? t.balance.owesYouShort : balance < 0 ? t.balance.youOweShort : t.balance.settledShort}
        </span>
      </span>
    </>
  )
}

// From 24 December to 31 January: "O vosso {ano}", which opens the year in
// review. The × hides it until next year's summary.
function YearReviewCard() {
  const year = useOfferedYear()
  const summary = useYearSummary(year ?? 0)
  const [dismissed, dismiss] = useCardDismissed(year)
  if (year === null || dismissed || !summary) return null

  return (
    <div className="relative flex items-center rounded-card bg-surface shadow-card">
      <Link to={`/resumo/${year}`} className="flex min-w-0 flex-1 items-center gap-3 py-2 pr-11 pl-3">
        <Guru pose="sucesso" size={64} decorative className="flex-none" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-headline font-bold">{t.yearReview.title(year)}</span>
          <span className="text-footnote text-text-2">
            {t.yearReview.cardSubtitle(summary.expenseCount, summary.settlementCount)}
          </span>
        </span>
        <Icon name="chevronRight" size={14} strokeWidth={2.5} className="flex-none text-text-2" />
      </Link>
      <button
        type="button"
        aria-label={t.yearReview.hideCard}
        onClick={dismiss}
        className="absolute top-0 right-0 flex size-11 items-center justify-center text-text-2"
      >
        <Icon name="close" size={14} strokeWidth={2.5} />
      </button>
    </div>
  )
}

function Skeletons() {
  return (
    <div className="flex flex-col gap-3">
      {['55%', '70%', '45%'].map((width) => (
        <div key={width} className="flex h-[76px] items-center gap-3.5 rounded-card bg-surface px-4">
          <div className="size-12 rounded-button bg-skeleton" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3.5 rounded-full bg-skeleton" style={{ width }} />
            <div className="h-3 w-2/5 rounded-full bg-skeleton" />
          </div>
          <div className="h-4 w-16 rounded-full bg-skeleton" />
        </div>
      ))}
    </div>
  )
}

export function Home({ onSettleAll, onNewList }: { onSettleAll: () => void; onNewList: () => void }) {
  const online = useOnline()
  const { me, partner } = useCurrentMember()
  const { data: members } = useMembers()
  const { data: lists } = useLists()
  const { data: balances } = useBalances()
  const { data: defaultShares } = useDefaultShares()
  const { data: expenses } = useExpenses()
  const { data: activity } = useActivity()
  const { data: categories } = useCategories()
  const { openExpense } = useSheets()
  const seenAt = useActivitySeenAt()
  const news = me && activity && seenAt ? unseenCount(activity, me.user_id, seenAt) : 0
  const [showArchived, setShowArchived] = useState(false)

  const ready = me && partner && members && lists && balances && defaultShares
  const active = lists?.filter((list) => !list.archived_at) ?? []
  const archived = lists?.filter((list) => list.archived_at) ?? []
  const main = active.find((list) => list.is_default)
  const others = active.filter((list) => !list.is_default)
  const total = ready ? overallBalance(balances, lists, me.user_id) : 0
  const activeIds = new Set(active.map((list) => list.id))
  const upcoming =
    ready && expenses
      ? scheduledImpact(expenses.filter((expense) => activeIds.has(expense.list_id)), me.user_id, todayISO())
      : null

  // The last three expenses of the main list, newest first. Ones dated after
  // today have not happened yet, so they stay out.
  const today = todayISO()
  const recent = main
    ? (expenses ?? [])
        .filter((expense) => expense.list_id === main.id && !isScheduled(expense, today))
        .sort((a, b) => b.spent_on.localeCompare(a.spent_on) || b.created_at.localeCompare(a.created_at))
        .slice(0, 3)
    : []

  const subtitle = (list: List) =>
    formatDateRange(list.starts_on, list.ends_on) ??
    t.lists.defaultSplitShort(ratio(members ?? [], defaultShares ?? [], list.id).join(' / '))
  const balanceOf = (list: List) => listBalance(balances ?? [], list.id, me?.user_id ?? '')

  return (
    <Screen>
      <div className="mt-1 flex h-[52px] items-center justify-between">
        <h1 className="text-large-title font-bold tracking-[0.4px]">{t.tabs.home}</h1>
        <div className="flex items-center gap-1">
          <Link
            to="/atividade"
            aria-label={news > 0 ? t.activity.bellNews(news) : t.tabs.activity}
            className="relative flex size-11 items-center justify-center"
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-surface text-accent-text">
              <Icon name="bell" size={20} />
            </span>
            {news > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0.5 right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-bg bg-danger px-1 text-[11px] leading-none font-bold text-white"
              >
                {news}
              </span>
            )}
          </Link>
          {me && partner && (
            <div className="flex items-center" aria-label={`${me.display_name} e ${partner.display_name}`}>
              <Avatar member={me} size={40} className="border-2 border-bg" />
              <Avatar member={partner} size={40} className="-ml-2.5 border-2 border-bg" />
            </div>
          )}
        </div>
      </div>

      <section
        aria-label={t.balance.total}
        className={`relative flex flex-col gap-3.5 overflow-hidden rounded-hero p-5 text-white ${online ? 'bg-hero-bg' : 'bg-disabled'}`}
      >
        <svg width="170" height="170" viewBox="0 0 170 170" aria-hidden="true" className="absolute -top-[46px] -right-10 opacity-[0.14]">
          <circle cx="85" cy="85" r="84" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          <circle cx="85" cy="85" r="58" fill="none" stroke="#FFFFFF" strokeWidth="2" />
        </svg>
        <div className="flex items-center justify-between">
          <span className="text-subhead font-medium text-white/85">{t.balance.total}</span>
          {ready && (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-footnote font-medium">
              {t.balance.activeLists(active.length)}
            </span>
          )}
        </div>
        {ready ? (
          <>
            <HeroBalance cents={total} me={me} partner={partner} />
            {upcoming && (
              <p className="text-footnote text-white/85">
                {t.balance.scheduled({
                  subject: nameForms(partner).subject,
                  to: nameForms(partner).to,
                  cents: upcoming.cents,
                  count: upcoming.count,
                  date: formatDayMonth(upcoming.until),
                  money: formatMoney(Math.abs(upcoming.cents)),
                })}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2.5 pt-1 pb-1.5">
            <div className="h-4 w-[150px] rounded-full bg-white/20" />
            <div className="h-10 w-[200px] rounded-xl bg-white/20" />
          </div>
        )}
        {(!ready || total !== 0) && (
          <button
            type="button"
            disabled={!online || !ready}
            onClick={onSettleAll}
            className={`flex h-12 items-center justify-center gap-2 rounded-button bg-white text-headline font-semibold ${online ? 'text-hero-button-text' : 'text-disabled'}`}
          >
            <Icon name="settle" size={20} strokeWidth={2.2} />
            {t.balance.settleAll}
          </button>
        )}
      </section>

      <YearReviewCard />

      <div className="mt-1.5 flex items-center justify-between">
        <h2 className="text-title2 font-bold">{t.lists.title}</h2>
        <button
          type="button"
          disabled={!online}
          onClick={onNewList}
          className="flex h-11 items-center gap-1 pr-1 pl-3 text-headline font-medium text-accent-text disabled:text-disabled"
        >
          <Icon name="plus" size={20} strokeWidth={2.2} />
          {t.lists.create}
        </button>
      </div>

      {!ready ? (
        <Skeletons />
      ) : (
        <div className="flex flex-col gap-3">
          {main && (
            <div className="overflow-hidden rounded-card bg-surface shadow-card outline-[1.5px] outline-main-ring">
              <Link to={`/lista/${main.id}`} className="flex items-center gap-3.5 px-4 py-3.5">
                <ListRow list={main} subtitle={subtitle(main)} balance={balanceOf(main)} />
              </Link>
              {recent.length > 0 && (
                <>
                  <h3 className="mx-4 border-t-[0.5px] border-separator pt-2 pb-0.5 text-xs font-semibold tracking-[0.4px] text-text-2 uppercase">
                    {t.lists.recentExpenses}
                  </h3>
                  {recent.map((expense) => (
                    <button
                      key={expense.id}
                      type="button"
                      onClick={() => openExpense(expense.id)}
                      className="flex min-h-11 w-full items-center gap-2.5 px-4 py-1 text-left"
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-fill text-base"
                      >
                        {categories?.find((category) => category.id === expense.category_id)?.icon ?? '📦'}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-subhead font-medium">{expense.description}</span>
                        <span className="text-xs text-text-2">
                          {formatDayMonth(expense.spent_on)} ·{' '}
                          {expense.paid_by === me.user_id ? t.expense.paidByYou : t.expense.paidBy(nameForms(partner).by)}
                        </span>
                      </span>
                      <span className="flex-none text-subhead font-semibold tabular-nums">
                        {formatMoney(expense.amount_cents)}
                      </span>
                    </button>
                  ))}
                  <Link
                    to={`/lista/${main.id}`}
                    className="mx-4 mt-0.5 flex h-11 items-center justify-between border-t-[0.5px] border-separator text-subhead font-medium text-accent-text"
                  >
                    {t.lists.seeAll}
                    <Icon name="chevronRight" size={14} strokeWidth={2.5} />
                  </Link>
                </>
              )}
            </div>
          )}

          {others.length > 0 && (
            <div className="overflow-hidden rounded-card bg-surface shadow-card">
              {others.map((list, index) => (
                <Link
                  key={list.id}
                  to={`/lista/${list.id}`}
                  className={`flex items-center gap-3.5 px-4 py-3.5 ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}
                >
                  <ListRow list={list} subtitle={subtitle(list)} balance={balanceOf(list)} />
                </Link>
              ))}
            </div>
          )}

          {archived.length > 0 && (
            <div className="overflow-hidden rounded-cta bg-surface shadow-card">
              <button
                type="button"
                aria-expanded={showArchived}
                onClick={() => setShowArchived((shown) => !shown)}
                className="flex h-[52px] w-full items-center gap-3 px-4 text-left"
              >
                <Icon name="archive" size={22} strokeWidth={1.8} className="text-text-2" />
                <span className="flex-1 text-body">{t.lists.archived}</span>
                <span className="text-body text-text-2">{archived.length}</span>
                <Icon
                  name={showArchived ? 'chevronDown' : 'chevronRight'}
                  size={14}
                  strokeWidth={2.5}
                  className="text-text-2"
                />
              </button>
              {showArchived &&
                archived.map((list) => (
                  <Link
                    key={list.id}
                    to={`/lista/${list.id}`}
                    className="flex items-center gap-3.5 border-t-[0.5px] border-separator px-4 py-3.5"
                  >
                    <ListRow list={list} subtitle={subtitle(list)} balance={balanceOf(list)} />
                  </Link>
                ))}
            </div>
          )}
        </div>
      )}
      <WhatsNewSheet />
    </Screen>
  )
}
