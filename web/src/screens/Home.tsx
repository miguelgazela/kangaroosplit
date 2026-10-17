import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '../components/Avatar'
import { BalanceAmount } from '../components/Balance'
import { Icon } from '../components/Icon'
import { PullIndicator } from '../components/PullIndicator'
import { WhatsNewSheet } from '../components/WhatsNewSheet'
import { t } from '../i18n/pt'
import type { List, Member } from '../lib/database.types'
import { formatDateRange, formatDayMonth, formatMoney } from '../lib/format'
import { useOnline } from '../lib/online'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { nameForms, ratio } from '../lib/people'
import { todayISO } from '../lib/dates'
import { isScheduled, listBalance, overallBalance, scheduledImpact } from '../lib/stats'
import { unseenCount, useActivitySeenAt } from '../lib/activitySeen'
import { useSheets } from '../sheets/SheetContext'
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

// The direction pill and the amount in the header, all in solid white.
function HeaderBalance({ cents, me, partner }: { cents: number; me: Member; partner: Member }) {
  const names = nameForms(partner)
  const [from, to] = cents >= 0 ? [partner, me] : [me, partner]

  return (
    <>
      <span className="flex h-[30px] items-center gap-1.5 rounded-full bg-white/16 pr-3 pl-1 text-sm font-semibold">
        {cents === 0 ? (
          <Icon name="check" size={18} strokeWidth={2.6} className="ml-1" />
        ) : (
          <span className="flex items-center">
            <Avatar member={from} size={22} className="border-[1.5px] border-white/90" />
            <Icon name="arrowRight" size={16} strokeWidth={2.4} />
            <Avatar member={to} size={22} className="border-[1.5px] border-white/90" />
          </span>
        )}
        {cents > 0 ? t.balance.owesYou(names.subject) : cents < 0 ? t.balance.youOwe(names.to) : t.balance.settled}
      </span>
      <div className="text-[52px] leading-[60px] font-bold tracking-[-1.2px] tabular-nums">
        {formatMoney(Math.abs(cents))}
      </div>
    </>
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

  const scroller = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLDivElement>(null)
  const topRow = useRef<HTMLDivElement>(null)
  const balanceBlock = useRef<HTMLElement>(null)
  const band = useRef<HTMLDivElement>(null)
  const { pull, refreshing } = usePullToRefresh(scroller, online)

  // Parallax: the header moves at about half the speed of the sheet and its
  // content fades and shrinks as it goes. Only transform and opacity change,
  // once per frame. With reduced motion the header just scrolls with the page.
  useEffect(() => {
    const element = scroller.current
    if (!element) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    const update = () => {
      frame = 0
      const y = Math.max(element.scrollTop, 0)
      const clamp = (value: number) => Math.min(Math.max(value, 0), 1)
      if (header.current) header.current.style.transform = `translateY(${-y * (reduced ? 1 : 0.45)}px)`
      if (!reduced) {
        const fade = String(clamp(1 - y / 220))
        if (topRow.current) topRow.current.style.opacity = fade
        if (balanceBlock.current) {
          balanceBlock.current.style.opacity = fade
          balanceBlock.current.style.transform = `translateY(${y * 0.12}px) scale(${1 - Math.min(y, 240) / 1200})`
        }
      }
      if (band.current) band.current.style.opacity = String(clamp((y - 150) / 60))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    element.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      element.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const safe = 'env(safe-area-inset-top)'
  // The note about future-dated expenses needs a little more room.
  const extra = upcoming ? 40 : 0
  const headerHeight = `calc(${336 + extra}px + ${safe})`
  const gradient = online
    ? 'linear-gradient(165deg, var(--ks-hero-from) 0%, var(--ks-hero-mid) 52%, var(--ks-hero-to) 100%)'
    : 'linear-gradient(165deg, var(--ks-hero-off-from) 0%, var(--ks-hero-off-to) 100%)'

  return (
    <div className="relative h-full overflow-hidden">
      <PullIndicator pull={pull} refreshing={refreshing} light />
      <div ref={scroller} className="h-full overflow-x-hidden overflow-y-auto overscroll-y-contain [scrollbar-width:none]">
        {/* Keeps the clock readable once the sheet scrolls under the status bar. */}
        <div
          ref={band}
          aria-hidden="true"
          className="pointer-events-none sticky top-0 z-30 bg-bg/70 opacity-0 backdrop-blur-xl"
          style={{ height: safe, marginBottom: `calc(-1 * ${safe})` }}
        />

        {/* Inside the scroll area, so a swipe that starts on the purple scrolls the page. */}
        <div
          ref={header}
          className="sticky top-0 z-0 overflow-hidden text-white will-change-transform"
          style={{
            height: headerHeight,
            marginBottom: `calc(-1 * ${headerHeight})`,
            background: gradient,
            // Fills the gap above the header while the page bounces at the top.
            boxShadow: `0 -300px 0 0 ${online ? 'var(--ks-hero-from)' : 'var(--ks-hero-off-from)'}`,
          }}
        >
          <svg width="320" height="320" viewBox="0 0 320 320" aria-hidden="true" className="absolute -top-[70px] -right-[110px] opacity-[0.16]">
            <circle cx="160" cy="160" r="158" fill="none" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx="160" cy="160" r="110" fill="none" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx="160" cy="160" r="62" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          </svg>
          <div
            aria-hidden="true"
            className="absolute -left-20 bottom-[30px] size-[220px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(255,255,255,0) 70%)' }}
          />

          <div
            ref={topRow}
            className="absolute inset-x-4 flex h-11 items-center justify-between"
            style={{ top: `calc(${safe} + 10px)` }}
          >
            {me && partner ? (
              <div className="flex items-center" aria-label={`${me.display_name} e ${partner.display_name}`}>
                <Avatar member={me} size={38} className="border-2 border-white/85" />
                <Avatar member={partner} size={38} className="-ml-2.5 border-2 border-white/85" />
              </div>
            ) : (
              <span />
            )}
            <Link
              to="/atividade"
              aria-label={news > 0 ? t.activity.bellNews(news) : t.tabs.activity}
              className="relative flex size-11 items-center justify-center"
            >
              <span className="flex size-[38px] items-center justify-center rounded-full bg-white/18">
                <Icon name="bell" size={20} />
              </span>
              {news > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-px right-px flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 bg-danger px-1 text-[11px] leading-none font-bold text-white"
                  style={{ borderColor: 'var(--ks-hero-mid)' }}
                >
                  {news}
                </span>
              )}
            </Link>
          </div>

          <section
            ref={balanceBlock}
            aria-label={t.balance.total}
            className="absolute inset-x-4 flex origin-top flex-col items-center gap-2 text-center"
            style={{ top: `calc(${safe} + 74px)` }}
          >
            <span className="text-[15px] font-medium text-white/85">
              {t.balance.total}
              {ready && ` · ${t.balance.activeLists(active.length)}`}
            </span>
            {ready ? (
              <>
                <HeaderBalance cents={total} me={me} partner={partner} />
                {upcoming && (
                  <p className="max-w-[320px] text-footnote text-white/85">
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
              <div className="flex flex-col items-center gap-3 pt-1 pb-1.5">
                <div className="h-[26px] w-[150px] rounded-full bg-white/22" />
                <div className="h-12 w-[210px] rounded-[14px] bg-white/22" />
              </div>
            )}
            {(!ready || total !== 0) && (
              <button
                type="button"
                disabled={!online || !ready}
                onClick={onSettleAll}
                className={`mt-1.5 flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[15px] font-semibold ${online ? 'text-hero-button-text shadow-[0_4px_14px_rgba(40,20,120,0.25)]' : 'text-disabled'}`}
              >
                <Icon name="settle" size={18} strokeWidth={2.2} />
                {t.balance.settleAll}
              </button>
            )}
          </section>
        </div>

        {/* The spacer lets touches through to the header; the sheet takes them back. */}
        <div
          className="pointer-events-none relative z-10"
          style={{
            transform: pull ? `translateY(${pull}px)` : undefined,
            transition: pull === 0 || refreshing ? 'transform 0.2s ease-out' : undefined,
          }}
        >
          <div aria-hidden="true" style={{ height: `calc(${268 + extra}px + ${safe})` }} />
          <div
            className="pointer-events-auto flex min-h-[760px] flex-col gap-3.5 rounded-t-[28px] bg-bg px-4 pt-[18px] pb-[calc(env(safe-area-inset-bottom)+49px+38px)] [&>*]:shrink-0"
            style={{ boxShadow: 'var(--ks-sheet-shadow)' }}
          >
            <div aria-hidden="true" className="mx-auto -mt-2 h-[5px] w-9 rounded-sm" style={{ background: 'var(--ks-handle)' }} />

      <div className="mt-0.5 flex items-center justify-between">
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
          </div>
        </div>
      </div>
      <WhatsNewSheet />
    </div>
  )
}
