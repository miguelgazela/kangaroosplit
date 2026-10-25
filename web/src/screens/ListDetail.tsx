import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FilterSheet, type ListFilter } from '../sheets/FilterSheet'
import { ActionSheet } from '../components/ActionSheet'
import { BackLink } from '../components/BackLink'
import { BalanceAmount } from '../components/Balance'
import { MenuList, PressMenu } from '../components/PressMenu'
import { ReactionBar } from '../components/ReactionBar'
import { Guru } from '../components/Guru'
import { Icon } from '../components/Icon'
import { Screen } from '../components/Screen'
import { Skeleton } from '../components/Skeleton'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { Category, ExpenseWithShares, List, Member, Settlement } from '../lib/database.types'
import { monthKey, todayISO } from '../lib/dates'
import { formatDateRange, formatDayMonth, formatMoney, formatMonthYear } from '../lib/format'
import { OfflineError, useOnline } from '../lib/online'
import { nameForms, ratio } from '../lib/people'
import { expensePosition, filterExpenses, listBalance, scheduledImpact, totalCents } from '../lib/stats'
import { nextReaction, rowReactions, socialFor, type Social } from '../lib/social'
import { useFirstLoad } from '../lib/useFirstLoad'
import { useIncremental } from '../lib/useIncremental'
import { useLongPress } from '../lib/useLongPress'
import {
  useBalances,
  useCategories,
  useComments,
  useCurrentMember,
  useDefaultShares,
  useExpenses,
  useLists,
  useMembers,
  useReactions,
  useReads,
  useRecurring,
  useSetExpenseDeleted,
  useSetListArchived,
  useSetReaction,
  useSetSettlementDeleted,
  useSettlements,
} from '../query/hooks'

type Row =
  | { kind: 'expense'; date: string; createdAt: string; expense: ExpenseWithShares }
  | { kind: 'settlement'; date: string; createdAt: string; settlement: Settlement }

function ExpenseRow({
  expense,
  category,
  me,
  partner,
  social,
  onOpen,
  onMenu,
}: {
  expense: ExpenseWithShares
  category: Category | undefined
  me: Member
  partner: Member
  social: Social
  onOpen: () => void
  // Press and hold: gets the pressed row, to place the menu next to it.
  onMenu: (element: HTMLElement) => void
}) {
  const mine = expense.paid_by === me.user_id
  const position = expensePosition(expense, me.user_id)
  const press = useLongPress({ onTap: onOpen, onLongPress: onMenu })
  const emojis = rowReactions(social)
  const count = social.comments.length

  return (
    <button
      type="button"
      {...press}
      aria-label={`${expense.description}, ${formatMoney(expense.amount_cents)}${count > 0 ? `, ${t.detail.commentCount(count, social.unread)}` : ''}`}
      className="flex min-h-16 w-full items-center gap-3 px-3.5 py-2.5 text-left select-none [-webkit-touch-callout:none]"
    >
      <span className="relative flex size-[42px] flex-none items-center justify-center rounded-xl bg-fill text-[21px]">
        {category?.icon ?? '📦'}
        {emojis.length > 0 && (
          <span aria-hidden="true" className="absolute -right-2 -bottom-1.5 flex">
            {emojis.map((emoji, index) => (
              <span
                key={emoji + index}
                className={`flex size-5 items-center justify-center rounded-full bg-surface text-[11px] shadow-[0_1px_3px_rgba(0,0,0,0.18)] ${index > 0 ? '-ml-1.5' : ''}`}
              >
                {emoji}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-base font-semibold">
          <span className="truncate">{expense.description}</span>
          {expense.receipt_path && (
            <span role="img" aria-label={t.expense.hasReceipt} className="flex-none text-text-2">
              <Icon name="paperclip" size={13} strokeWidth={2.4} />
            </span>
          )}
          {expense.recurring_id && (
            <span className="inline-flex flex-none items-center gap-[3px] rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-link">
              <Icon name="repeat" size={11} strokeWidth={3} />
              {t.expense.recurring}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 text-footnote text-text-2">
          <span className="truncate">
            {formatDayMonth(expense.spent_on)} · {mine ? t.expense.paidByYou : t.expense.paidBy(nameForms(partner).by)}
          </span>
          {count > 0 && (
            <span
              aria-hidden="true"
              className={`inline-flex flex-none items-center gap-[3px] ${social.unread ? 'font-bold text-link' : 'font-medium'}`}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill={social.unread ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z" />
              </svg>
              {count}
            </span>
          )}
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
    </button>
  )
}

function SettlementRow({
  settlement,
  me,
  partner,
  onOpen,
}: {
  settlement: Settlement
  me: Member
  partner: Member
  onOpen: () => void
}) {
  const names = nameForms(partner)
  return (
    <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 bg-settle px-3.5 py-2.5 text-left">
      <span className="flex size-[42px] flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-accent text-link">
        <Icon name="settle" size={20} strokeWidth={2.2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-base font-semibold text-link">
          {settlement.to_user === me.user_id ? t.settlement.paidYou(names.subject) : t.settlement.youPaid(names.to)}
        </span>
        <span className="truncate text-footnote text-text-2">
          {formatDayMonth(settlement.settled_on)} · {t.settlement.label}
        </span>
      </span>
      <span className="flex-none text-base font-semibold text-link tabular-nums">
        {formatMoney(settlement.amount_cents)}
      </span>
    </button>
  )
}

// Line-height boxes keep each bar where the real text sits, so nothing moves
// when the data arrives.
function Bar({ line, className, width }: { line: string; className: string; width?: string }) {
  return (
    <div className={`flex items-center ${line}`}>
      <Skeleton className={`rounded-full ${className}`} style={width ? { width } : undefined} />
    </div>
  )
}

function BalanceSkeleton() {
  return (
    <section
      aria-label={t.system.loadingBalance}
      aria-busy="true"
      className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card"
    >
      <div className="flex items-center gap-3">
        <div className="flex flex-1 flex-col gap-0.5">
          <Bar line="h-5" className="h-3.5 w-[110px]" />
          <div className="flex h-9 items-center">
            <Skeleton className="h-[30px] w-[150px] rounded-[10px]" />
          </div>
        </div>
        <Skeleton className="h-11 w-32 rounded-button" />
      </div>
      <div className="border-t-[0.5px] border-separator pt-2.5">
        <div className="flex h-[18px] items-center gap-2">
          <Skeleton className="h-1.5 w-12 rounded-full" />
          <Skeleton className="h-3 w-[190px] max-w-full rounded-full" />
        </div>
      </div>
      <div className="-mx-4 -mt-1.5 flex h-12 items-center gap-2.5 border-t-[0.5px] border-separator px-4">
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-3.5 w-40 rounded-full" />
      </div>
    </section>
  )
}

const SKELETON_ROWS = [
  ['62%', '38%'],
  ['48%', '44%'],
  ['70%', '34%'],
  ['54%', '40%'],
]

function ExpensesSkeleton() {
  return (
    <div aria-label={t.system.loadingExpenses} aria-busy="true" className="flex flex-col gap-3.5">
      {[
        { width: 'w-[110px]', rows: 4 },
        { width: 'w-24', rows: 2 },
      ].map(({ width, rows }) => (
        <section key={width} className="flex flex-col gap-2">
          <div className="flex justify-between px-1 pt-1">
            <Bar line="h-[18px]" className={`h-3 ${width}`} />
            <Bar line="h-[18px]" className="h-3 w-16" />
          </div>
          <div className="overflow-hidden rounded-card bg-surface shadow-card">
            {SKELETON_ROWS.slice(0, rows).map(([left, sub], index) => (
              <div
                key={left}
                className={`flex min-h-16 items-center gap-3 px-3.5 py-2.5 ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}
              >
                <Skeleton className="size-[42px] rounded-xl" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Bar line="h-6" className="h-3.5" width={left} />
                  <Bar line="h-[18px]" className="h-[11px]" width={sub} />
                </div>
                <div className="flex flex-none flex-col items-end gap-0.5">
                  <Bar line="h-6" className="h-3.5 w-[62px]" />
                  <Bar line="h-[18px]" className="h-[11px] w-[84px]" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function EmptyList({ onAdd, disabled }: { onAdd: () => void; disabled: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-10 text-center">
      <Guru pose="vazio" size={150} />
      <p className="text-headline font-semibold">{t.lists.empty}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        className="flex h-12 items-center gap-2 rounded-button bg-accent px-5 text-headline font-semibold text-white disabled:bg-disabled"
      >
        <Icon name="plus" size={20} strokeWidth={2.4} />
        {t.lists.addFirst}
      </button>
    </div>
  )
}

export function ListDetail({
  onAddExpense,
  onEditExpense,
  onOpenExpense,
  onSettle,
  onOptions,
}: {
  onAddExpense: (listId: string) => void
  onEditExpense: (expense: ExpenseWithShares) => void
  onOpenExpense: (expenseId: string, options?: { focusComment?: boolean }) => void
  onSettle: (listId: string) => void
  onOptions: (list: List) => void
}) {
  const { id } = useParams()
  const online = useOnline()
  const { me, partner } = useCurrentMember()
  const { data: members } = useMembers()
  const { data: lists } = useLists()
  const { data: balances } = useBalances()
  const { data: defaultShares } = useDefaultShares()
  const { data: expenses } = useExpenses()
  const { data: settlements } = useSettlements()
  const { data: categories } = useCategories()
  const { data: rules } = useRecurring()
  const { data: reactions } = useReactions()
  const { data: comments } = useComments()
  const { data: reads } = useReads()
  const setReaction = useSetReaction()
  const setExpenseDeleted = useSetExpenseDeleted()
  const [menu, setMenu] = useState<{ expense: ExpenseWithShares; top: number } | null>(null)
  const [deleting, setDeleting] = useState<ExpenseWithShares | null>(null)
  const setArchived = useSetListArchived()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ListFilter>({})
  const [filtering, setFiltering] = useState(false)
  const [removing, setRemoving] = useState<Settlement | null>(null)
  const toast = useToast()
  const setSettlementDeleted = useSetSettlementDeleted()

  const list = lists?.find((candidate) => candidate.id === id)
  const filterCount = Object.values(filter).filter(Boolean).length
  // Settlements are hidden while narrowing down expenses.
  const searching = search.trim() !== '' || filterCount > 0

  const groups = useMemo(() => {
    if (!id || !expenses || !settlements) return { scheduled: [] as Row[], monthGroups: [] }
    const rows: Row[] = filterExpenses(expenses, { ...filter, listId: id, search }).map((expense) => ({
      kind: 'expense',
      date: expense.spent_on,
      createdAt: expense.created_at,
      expense,
    }))
    if (!searching) {
      for (const settlement of settlements) {
        if (settlement.list_id !== id) continue
        rows.push({ kind: 'settlement', date: settlement.settled_on, createdAt: settlement.created_at, settlement })
      }
    }
    rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

    // Future-dated expenses are listed apart, so the months start at today.
    const today = todayISO()
    const scheduled = rows.filter((row) => row.date > today)
    const grouped = new Map<string, Row[]>()
    for (const row of rows.filter((row) => row.date <= today)) {
      const month = monthKey(row.date)
      grouped.set(month, [...(grouped.get(month) ?? []), row])
    }
    const monthGroups = [...grouped].map(([month, monthRows]) => ({
      month,
      rows: monthRows,
      total: totalCents(monthRows.flatMap((row) => (row.kind === 'expense' ? [row.expense] : []))),
    }))
    return { scheduled, monthGroups }
  }, [id, expenses, settlements, search, filter, searching])
  const { scheduled, monthGroups: months } = groups

  // Only the newest rows are drawn at first; older months appear on scrolling.
  // Month totals always cover the whole month, drawn or not.
  const rowCount = months.reduce((sum, month) => sum + month.rows.length, 0)
  const { count, hasMore, sentinel } = useIncremental(rowCount, `${id}|${search}|${JSON.stringify(filter)}`)
  const loading = useFirstLoad(
    Boolean(me && partner && members && lists && balances && defaultShares && expenses && settlements),
  )
  let budget = count
  const visibleMonths = months.flatMap((month) => {
    if (budget <= 0) return []
    const rows = month.rows.slice(0, budget)
    budget -= rows.length
    return [{ ...month, rows }]
  })

  const topBar = (list: List | undefined) => (
    <div className="-mx-2 flex h-11 items-center justify-between">
      <BackLink to="/" label={t.tabs.home} />
      <button
        type="button"
        aria-label={t.lists.options}
        disabled={!online || !list}
        onClick={() => list && onOptions(list)}
        className="flex size-11 items-center justify-center"
      >
        <span className={`flex size-[34px] items-center justify-center rounded-full bg-surface ${online && list ? 'text-link' : 'text-disabled'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </span>
      </button>
    </div>
  )
  const titleBlock = (list: List) => (
    <div className="flex items-center gap-3">
      <span className="flex size-12 flex-none items-center justify-center rounded-button bg-accent-soft text-[26px]">
        {list.icon}
      </span>
      <div className="flex min-w-0 flex-col gap-px">
        <h1 className="truncate text-[30px] leading-9 font-bold tracking-[0.2px]">{list.name}</h1>
        <span className="text-footnote text-text-2">
          {list.is_default ? t.lists.mainList : formatDateRange(list.starts_on, list.ends_on)}
        </span>
      </div>
    </div>
  )
  const searchRow = (
    <div className="flex gap-2">
      <label className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-fill px-3 text-text-2">
        <Icon name="search" size={18} strokeWidth={2.2} />
        <input
          type="search"
          placeholder={t.lists.search}
          aria-label={t.lists.searchLabel}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-w-0 flex-1 appearance-none bg-transparent text-base text-text outline-none placeholder:text-text-2"
        />
      </label>
      <button
        type="button"
        aria-label={filterCount > 0 ? `${t.lists.filter} (${t.filter.active})` : t.lists.filter}
        onClick={() => !loading && setFiltering(true)}
        className={`relative flex h-10 w-11 items-center justify-center rounded-xl ${filterCount > 0 ? 'bg-accent text-white' : 'bg-fill text-link'}`}
      >
        <Icon name="filter" size={20} />
        {filterCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-[18px] items-center justify-center rounded-full border-2 border-bg bg-link text-[10px] font-bold text-white">
            {filterCount}
          </span>
        )}
      </button>
    </div>
  )

  // Skeleton on first load only; cached data shows at once.
  if (loading || !me || !partner || !members || !lists || !balances || !defaultShares || !expenses || !settlements) {
    return (
      <Screen gap={14}>
        {topBar(list)}
        {list ? (
          titleBlock(list)
        ) : (
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-button" />
            <div className="flex flex-col gap-px">
              <Bar line="h-9" className="h-[26px] w-44" />
              <Bar line="h-[18px]" className="h-3 w-24" />
            </div>
          </div>
        )}
        <BalanceSkeleton />
        {searchRow}
        <ExpensesSkeleton />
      </Screen>
    )
  }

  if (!list) {
    return (
      <Screen gap={14}>
        <BackLink to="/" label={t.tabs.home} />
        <p className="py-10 text-center text-body text-text-2">{t.lists.notFound}</p>
      </Screen>
    )
  }

  const archived = list.archived_at !== null
  const readOnly = archived || !online
  const balance = listBalance(balances, list.id, me.user_id)
  const names = nameForms(partner)
  const split = ratio(members, defaultShares, list.id)
  const splitTotal = split.reduce((sum, value) => sum + value, 0)
  const hasRows = expenses.some((expense) => expense.list_id === list.id) || months.length > 0
  const upcoming = scheduledImpact(
    expenses.filter((expense) => expense.list_id === list.id),
    me.user_id,
    todayISO(),
  )

  const recurringCount = (rules ?? []).filter((rule) => rule.list_id === list.id).length

  const socialOf = (expense: ExpenseWithShares) =>
    socialFor(expense.id, me.user_id, reactions ?? [], comments ?? [], reads ?? [])
  const openMenu = (expense: ExpenseWithShares, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    // Room for the reaction bar above the row and the menu (about 140 px) below.
    const top = Math.min(Math.max(rect.top - 62, 60), window.innerHeight - 330)
    setMenu({ expense, top })
  }
  const failToast = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  return (
    <Screen gap={14}>
      {topBar(list)}
      {titleBlock(list)}

      {archived && (
        <div role="status" className="flex items-center gap-2.5 rounded-cta bg-fill py-2 pr-2 pl-3.5">
          <Icon name="archive" size={20} strokeWidth={1.8} className="text-text-2" />
          <span className="flex-1 text-subhead">{t.lists.isArchived}</span>
          <button
            type="button"
            disabled={!online || setArchived.isPending}
            onClick={() => setArchived.mutate({ id: list.id, archived: false })}
            className="h-9 rounded-control bg-surface px-3.5 text-subhead font-semibold text-link disabled:text-disabled"
          >
            {t.lists.unarchive}
          </button>
        </div>
      )}

      <section className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-subhead text-text-2">
              {balance > 0 ? t.balance.owesYou(names.subject) : balance < 0 ? t.balance.youOwe(names.to) : t.balance.settled}
            </span>
            <BalanceAmount cents={balance} iconSize={20} className="gap-1.5 text-[30px] leading-9 !font-bold" />
          </div>
          {balance !== 0 && !archived && (
            <button
              type="button"
              disabled={!online}
              onClick={() => onSettle(list.id)}
              className="h-11 rounded-button bg-accent px-4 text-subhead font-semibold text-white disabled:bg-disabled"
            >
              {t.balance.settleUp}
            </button>
          )}
        </div>
        {upcoming && (
          <p className="border-t-[0.5px] border-separator pt-2.5 text-footnote text-text-2">
            {t.balance.scheduled({
              subject: names.subject,
              to: names.to,
              cents: upcoming.cents,
              count: upcoming.count,
              date: formatDayMonth(upcoming.until),
              money: formatMoney(Math.abs(upcoming.cents)),
            })}
          </p>
        )}
        <div className="flex items-center gap-2 border-t-[0.5px] border-separator pt-2.5 text-footnote text-text-2">
          <span className="flex h-1.5 w-12 flex-none overflow-hidden rounded-full">
            {members.map((member, index) => (
              <span
                key={member.user_id}
                style={{ width: `${(split[index] * 100) / splitTotal}%`, background: member.color }}
              />
            ))}
          </span>
          <span className="truncate">
            {t.lists.defaultSplit(split.join(' / '))} ({members.map((member) => member.display_name).join(' / ')})
          </span>
        </div>
        <Link
          to={`/recorrentes?lista=${list.id}`}
          aria-label={t.recurring.inList(recurringCount)}
          className="-mx-4 -mt-1.5 flex h-12 items-center gap-2.5 border-t-[0.5px] border-separator px-4"
        >
          <span
            aria-hidden="true"
            className="flex size-7 flex-none items-center justify-center rounded-lg bg-accent-soft text-link"
          >
            <Icon name="repeat" size={16} strokeWidth={2.2} />
          </span>
          <span className="flex-1 text-subhead">{t.recurring.title}</span>
          <span className="text-subhead text-text-2">{recurringCount}</span>
          <Icon name="chevronRight" size={14} strokeWidth={2.5} className="flex-none text-text-2" />
        </Link>
      </section>

      {hasRows && searchRow}

      {!hasRows && <EmptyList onAdd={() => onAddExpense(list.id)} disabled={readOnly} />}

      {hasRows && months.length === 0 && scheduled.length === 0 && (
        <p className="py-10 text-center text-body text-text-2">{t.lists.noResults}</p>
      )}

      {scheduled.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex justify-between px-1 pt-1 text-footnote font-semibold text-text-2">
            <span className="tracking-[0.4px] uppercase">{t.lists.scheduled}</span>
            <span>{formatMoney(totalCents(scheduled.flatMap((row) => (row.kind === 'expense' ? [row.expense] : []))))}</span>
          </div>
          <div className="overflow-hidden rounded-card bg-surface shadow-card">
            {scheduled.map((row, index) =>
              row.kind === 'expense' ? (
                <div key={row.expense.id} className={index > 0 ? 'border-t-[0.5px] border-separator' : ''}>
                  <ExpenseRow
                    expense={row.expense}
                    category={categories?.find((category) => category.id === row.expense.category_id)}
                    me={me}
                    partner={partner}
                    social={socialOf(row.expense)}
                    onOpen={() => onOpenExpense(row.expense.id)}
                    onMenu={(element) => openMenu(row.expense, element)}
                  />
                </div>
              ) : null,
            )}
          </div>
        </section>
      )}

      {visibleMonths.map(({ month, rows, total }) => (
        <section key={month} className="flex flex-col gap-2">
          <div className="flex justify-between px-1 pt-1 text-footnote font-semibold text-text-2">
            <span className="tracking-[0.4px] uppercase">{formatMonthYear(month)}</span>
            <span>{formatMoney(total)}</span>
          </div>
          <div className="overflow-hidden rounded-card bg-surface shadow-card">
            {rows.map((row, index) => (
              <div key={row.kind === 'expense' ? row.expense.id : row.settlement.id} className={index > 0 ? 'border-t-[0.5px] border-separator' : ''}>
                {row.kind === 'expense' ? (
                  <ExpenseRow
                    expense={row.expense}
                    category={categories?.find((category) => category.id === row.expense.category_id)}
                    me={me}
                    partner={partner}
                    social={socialOf(row.expense)}
                    onOpen={() => onOpenExpense(row.expense.id)}
                    onMenu={(element) => openMenu(row.expense, element)}
                  />
                ) : (
                  <SettlementRow
                    settlement={row.settlement}
                    me={me}
                    partner={partner}
                    onOpen={() => !readOnly && setRemoving(row.settlement)}
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      {hasMore && <div ref={sentinel} aria-hidden="true" className="h-px" />}

      {menu && (
        <PressMenu label={t.detail.menu} top={menu.top} onClose={() => setMenu(null)}>
          <ReactionBar
            variant="pill"
            mine={socialOf(menu.expense).mine}
            theirs={socialOf(menu.expense).theirs}
            partner={partner}
            disabled={!online}
            onPick={(emoji) => {
              setReaction.mutate(
                {
                  expenseId: menu.expense.id,
                  userId: me.user_id,
                  emoji: nextReaction(socialOf(menu.expense).mine, emoji),
                },
                { onError: failToast },
              )
              setMenu(null)
            }}
          />
          <div className="w-full overflow-hidden rounded-[20px] bg-surface shadow-[0_12px_40px_rgba(17,17,20,0.18)]">
            <ExpenseRow
              expense={menu.expense}
              category={categories?.find((category) => category.id === menu.expense.category_id)}
              me={me}
              partner={partner}
              social={socialOf(menu.expense)}
              onOpen={() => {}}
              onMenu={() => {}}
            />
          </div>
          <MenuList
            label={t.detail.menu}
            items={[
              {
                label: t.detail.comment,
                icon: 'comment',
                onSelect: () => {
                  const { id } = menu.expense
                  setMenu(null)
                  onOpenExpense(id, { focusComment: true })
                },
              },
              ...(readOnly
                ? []
                : [
                    {
                      label: t.detail.edit,
                      icon: 'edit' as const,
                      onSelect: () => {
                        const { expense } = menu
                        setMenu(null)
                        onEditExpense(expense)
                      },
                    },
                    {
                      label: t.expense.delete,
                      icon: 'trash' as const,
                      destructive: true,
                      onSelect: () => {
                        setDeleting(menu.expense)
                        setMenu(null)
                      },
                    },
                  ]),
            ]}
          />
        </PressMenu>
      )}
      {deleting && (
        <ActionSheet
          message={t.expense.deleteConfirm}
          confirmLabel={t.expense.delete}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const { id } = deleting
            setDeleting(null)
            setExpenseDeleted.mutate(
              { id, deleted: true },
              {
                onSuccess: () =>
                  toast({
                    message: t.expense.deleted,
                    action: {
                      label: t.actions.undo,
                      onClick: () => setExpenseDeleted.mutate({ id, deleted: false }, { onError: failToast }),
                    },
                  }),
                onError: failToast,
              },
            )
          }}
        />
      )}
      {removing && (
        <ActionSheet
          message={t.settlement.deleteConfirm(
            `${removing.to_user === me.user_id ? t.settlement.paidYou(names.subject) : t.settlement.youPaid(names.to)} ${formatMoney(removing.amount_cents)}.`,
          )}
          confirmLabel={t.settlement.delete}
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const { id } = removing
            const fail = (error: unknown) =>
              toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })
            setRemoving(null)
            setSettlementDeleted.mutate(
              { id, deleted: true },
              {
                onSuccess: () =>
                  toast({
                    message: t.settlement.deleted,
                    action: {
                      label: t.actions.undo,
                      onClick: () => setSettlementDeleted.mutate({ id, deleted: false }, { onError: fail }),
                    },
                  }),
                onError: fail,
              },
            )
          }}
        />
      )}
      {filtering && (
        <FilterSheet
          filter={filter}
          categories={categories ?? []}
          me={me}
          partner={partner}
          onApply={(next) => {
            setFilter(next)
            setFiltering(false)
          }}
          onClose={() => setFiltering(false)}
        />
      )}
    </Screen>
  )
}
