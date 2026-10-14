import { Avatar } from '../components/Avatar'
import { Icon, type IconName } from '../components/Icon'
import { Screen } from '../components/Screen'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { Activity as ActivityEntry, ActivityAction, Member } from '../lib/database.types'
import { dayLabel, localDay } from '../lib/dayLabel'
import { formatMoney, formatTime } from '../lib/format'
import { OfflineError, useOnline } from '../lib/online'
import { nameForms } from '../lib/people'
import { useIncremental } from '../lib/useIncremental'
import { useSheets } from '../sheets/SheetContext'
import {
  useActivity,
  useCurrentMember,
  useExpenses,
  useLists,
  useSetExpenseDeleted,
  useSetSettlementDeleted,
  useSettlements,
} from '../query/hooks'

const BADGES: Record<ActivityAction, { icon: IconName; tone: string }> = {
  expense_created: { icon: 'plus', tone: 'bg-pos' },
  expense_updated: { icon: 'edit', tone: 'bg-accent' },
  expense_deleted: { icon: 'close', tone: 'bg-danger' },
  expense_restored: { icon: 'restore', tone: 'bg-pos' },
  settlement_created: { icon: 'settle', tone: 'bg-accent' },
  settlement_deleted: { icon: 'close', tone: 'bg-danger' },
  list_created: { icon: 'list', tone: 'bg-text-2' },
  list_archived: { icon: 'archive', tone: 'bg-text-2' },
  expense_commented: { icon: 'comment', tone: 'bg-accent' },
  expense_reacted: { icon: 'heart', tone: 'bg-[#C0367A]' },
}

const quote = (text: string | undefined) => `“${text ?? ''}”`

function sentence(entry: ActivityEntry, me: Member, partner: Member): string {
  const mine = entry.actor_id === me.user_id
  const { subject, to } = nameForms(partner)
  const { snapshot } = entry
  const amount = formatMoney(snapshot.amount_cents ?? 0)
  const expense = quote(snapshot.description)
  const priced = `${expense} · ${amount}`
  const list = quote(snapshot.name)

  switch (entry.action) {
    case 'expense_created':
      if (snapshot.recurring) return t.activity.recurringAdded(priced)
      return mine ? t.activity.youAdded(priced) : t.activity.added(subject, priced)
    case 'expense_updated':
      return mine ? t.activity.youEdited(expense) : t.activity.edited(subject, expense)
    case 'expense_deleted':
      return mine ? t.activity.youDeleted(priced) : t.activity.deleted(subject, priced)
    case 'expense_restored':
      return mine ? t.activity.youRestored(expense) : t.activity.restoredBy(subject, expense)
    case 'settlement_created':
      return snapshot.to_user === me.user_id ? t.activity.paidYou(subject, amount) : t.activity.youPaid(to, amount)
    case 'settlement_deleted':
      return mine ? t.activity.youDeletedSettlement(amount) : t.activity.deletedSettlement(subject, amount)
    case 'list_created':
      return mine ? t.activity.youCreatedList(list) : t.activity.createdList(subject, list)
    case 'list_archived':
      return mine ? t.activity.youArchivedList(list) : t.activity.archivedList(subject, list)
    case 'expense_commented':
      return mine
        ? t.activity.youCommented(expense, snapshot.body ?? '')
        : t.activity.commented(subject, expense, snapshot.body ?? '')
    case 'expense_reacted':
      return mine
        ? t.activity.youReacted(snapshot.emoji ?? '', expense)
        : t.activity.reacted(subject, snapshot.emoji ?? '', expense)
  }
}

export function Activity() {
  const online = useOnline()
  const toast = useToast()
  const { me, partner } = useCurrentMember()
  const { data: entries } = useActivity()
  const { data: lists } = useLists()
  const setDeleted = useSetExpenseDeleted()
  const setSettlementDeleted = useSetSettlementDeleted()
  const { data: settlements } = useSettlements()
  const { data: expenses } = useExpenses()
  const { openExpense } = useSheets()

  const ready = me && partner && entries && lists

  // An expense can be restored from its latest entry, if that entry is a deletion.
  const latestByEntity = new Map<string, string>()
  for (const entry of entries ?? []) {
    if (!latestByEntity.has(entry.entity_id)) latestByEntity.set(entry.entity_id, entry.id)
  }

  // Newest entries first; older days are drawn on scrolling.
  const { count, hasMore, sentinel } = useIncremental(entries?.length ?? 0, 'activity')
  const days = new Map<string, ActivityEntry[]>()
  for (const entry of (entries ?? []).slice(0, count)) {
    const day = localDay(entry.created_at)
    days.set(day, [...(days.get(day) ?? []), entry])
  }

  // Restoring a payment is not logged, so check whether it is still gone.
  const liveSettlements = new Set((settlements ?? []).map((settlement) => settlement.id))

  const restore = (entry: ActivityEntry) =>
    (entry.action === 'settlement_deleted' ? setSettlementDeleted : setDeleted).mutate(
      { id: entry.entity_id, deleted: false },
      {
        onSuccess: () =>
          toast({ message: entry.action === 'settlement_deleted' ? t.settlement.restored : t.activity.restored }),
        onError: (error) =>
          toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error }),
      },
    )

  return (
    <Screen>
      <div className="mt-1 flex h-[52px] items-center">
        <h1 className="text-large-title font-bold tracking-[0.4px]">{t.tabs.activity}</h1>
      </div>

      {ready && entries.length === 0 && (
        <p className="py-10 text-center text-body text-text-2">{t.activity.empty}</p>
      )}

      {ready &&
        [...days].map(([day, dayEntries]) => (
          <section key={day} className="flex flex-col gap-2">
            <h2 className="px-1 text-footnote font-semibold tracking-[0.4px] text-text-2 uppercase">{dayLabel(day)}</h2>
            <div className="overflow-hidden rounded-card bg-surface shadow-card">
              {dayEntries.map((entry, index) => {
                // A payment shows whoever paid, which is not always who recorded it.
                const actorId = entry.action === 'settlement_created' ? entry.snapshot.from_user : entry.actor_id
                const actor = actorId === me.user_id ? me : partner
                const list = lists.find((candidate) => candidate.id === entry.list_id)
                const badge = BADGES[entry.action]
                // Comments and reactions open the expense, as long as it still exists.
                const target =
                  entry.action === 'expense_commented' || entry.action === 'expense_reacted'
                    ? expenses?.find((candidate) => candidate.id === entry.entity_id)
                    : undefined
                const openable = target !== undefined
                const open = () => target && openExpense(target.id)
                const canRestore =
                  latestByEntity.get(entry.entity_id) === entry.id &&
                  (entry.action === 'expense_deleted' ||
                    (entry.action === 'settlement_deleted' && settlements !== undefined && !liveSettlements.has(entry.entity_id)))
                return (
                  <div
                    key={entry.id}
                    className={`flex items-center gap-3 px-3.5 py-3 ${index > 0 ? 'border-t-[0.5px] border-separator' : ''} ${entry.action === 'settlement_created' ? 'bg-settle' : ''}`}
                  >
                    <span className="relative flex-none">
                      <Avatar member={actor} size={36} />
                      <span className={`absolute -right-1 -bottom-1 flex size-[18px] items-center justify-center rounded-full border-2 border-surface text-surface ${badge.tone}`}>
                        <Icon name={badge.icon} size={10} strokeWidth={3.4} />
                      </span>
                    </span>
                    <span
                      className={`flex min-w-0 flex-1 flex-col gap-1 ${openable ? 'cursor-pointer' : ''}`}
                      {...(openable
                        ? { role: 'button', tabIndex: 0, onClick: open, onKeyDown: (event: React.KeyboardEvent) => event.key === 'Enter' && open() }
                        : {})}
                    >
                      <span className="text-subhead leading-5">{sentence(entry, me, partner)}</span>
                      <span className="flex items-center gap-2 text-footnote text-text-2">
                        {list && (
                          <span className="truncate rounded-full bg-fill px-2 py-0.5">
                            {list.icon} {list.name}
                          </span>
                        )}
                        <span className="flex-none tabular-nums">{formatTime(entry.created_at)}</span>
                      </span>
                    </span>
                    {canRestore && (
                      <button
                        type="button"
                        disabled={!online || setDeleted.isPending || setSettlementDeleted.isPending}
                        onClick={() => restore(entry)}
                        className="h-9 flex-none rounded-full bg-accent-soft px-3.5 text-subhead font-semibold text-accent-text disabled:text-disabled"
                      >
                        {t.activity.restore}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ))}

      {hasMore && <div ref={sentinel} aria-hidden="true" className="h-px" />}
    </Screen>
  )
}
