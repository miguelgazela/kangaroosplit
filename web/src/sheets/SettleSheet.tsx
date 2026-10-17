import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { DateRow } from '../components/DateRow'
import { Guru } from '../components/Guru'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { List, ListBalance, Member } from '../lib/database.types'
import { todayISO } from '../lib/dates'
import { formatAmountInput, formatMoney, parseMoney } from '../lib/format'
import { OfflineError } from '../lib/online'
import { nameForms } from '../lib/people'
import { listBalance, overallBalance } from '../lib/stats'
import { useBalances, useCreateSettlement, useCurrentMember, useLists, useSettleAll } from '../query/hooks'

export type SettleSheetProps = {
  // One list, or every active list when omitted.
  listId?: string
  onClose: () => void
}

export function SettleSheet({ listId, onClose }: SettleSheetProps) {
  const { me, partner } = useCurrentMember()
  const { data: lists } = useLists()
  const { data: balances } = useBalances()

  if (!me || !partner || !lists || !balances) return null
  return <SettleForm listId={listId} onClose={onClose} me={me} partner={partner} lists={lists} balances={balances} />
}

function SettleForm({
  listId,
  onClose,
  me,
  partner,
  lists,
  balances,
}: SettleSheetProps & { me: Member; partner: Member; lists: List[]; balances: ListBalance[] }) {
  const toast = useToast()
  const createSettlement = useCreateSettlement()
  const settleAll = useSettleAll()
  const names = nameForms(partner)

  const list = lists.find((candidate) => candidate.id === listId)
  // Fixed at open: the balance changes underneath once the payment is saved.
  const [balance] = useState(() =>
    listId ? listBalance(balances, listId, me.user_id) : overallBalance(balances, lists, me.user_id),
  )
  const [breakdown] = useState(() =>
    lists
      .filter((candidate) => !candidate.archived_at)
      .map((candidate) => ({ list: candidate, cents: listBalance(balances, candidate.id, me.user_id) }))
      .filter((entry) => entry.cents !== 0),
  )
  const owed = Math.abs(balance)
  const partnerPays = balance > 0

  const [amount, setAmount] = useState(formatAmountInput(owed))
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [paid, setPaid] = useState<number | null>(null)

  const amountCents = list ? (parseMoney(amount) ?? 0) : owed
  const tooMuch = amountCents > owed
  const pending = createSettlement.isPending || settleAll.isPending
  const canSubmit = amountCents > 0 && !tooMuch && !pending

  const fail = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  const onSubmit = () => {
    if (!list) {
      settleAll.mutate(undefined, { onSuccess: () => setPaid(owed), onError: fail })
      return
    }
    createSettlement.mutate(
      {
        listId: list.id,
        fromUser: partnerPays ? partner.user_id : me.user_id,
        toUser: partnerPays ? me.user_id : partner.user_id,
        amountCents,
        settledOn: date,
        note: note || null,
      },
      { onSuccess: () => setPaid(amountCents), onError: fail },
    )
  }

  if (paid !== null) {
    const settled = paid === owed
    return (
      <Sheet title="" onCancel={onClose} hideCancel>
        <div className="flex flex-1 flex-col items-center px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] text-center">
          <div className="flex flex-1 flex-col items-center justify-center gap-3.5">
            <Guru pose="sucesso" size={220} />
            <p className="mt-1.5 flex items-center gap-2 text-[28px] font-bold">
              <span className="flex size-7 flex-none items-center justify-center rounded-full bg-pos text-surface">
                <Icon name="check" size={16} strokeWidth={3} />
              </span>
              {settled ? t.settlement.doneTitle : t.settlement.partialTitle}
            </p>
            <p className="text-body leading-6 text-text-2">
              {partnerPays
                ? t.settlement.donePaidYou(names.subject, formatMoney(paid))
                : t.settlement.doneYouPaid(names.to, formatMoney(paid))}
              {settled && (
                <>
                  <br />
                  {list ? t.settlement.evenList : t.settlement.evenAll}
                </>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} className="h-[52px] w-full rounded-cta bg-accent text-body font-semibold text-white">
            {t.settlement.done}
          </button>
        </div>
      </Sheet>
    )
  }

  const [from, to] = partnerPays ? [partner, me] : [me, partner]

  return (
    <Sheet title={list ? t.balance.settleUp : t.balance.settleAll} onCancel={onClose}>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="flex flex-none flex-col items-center gap-2.5 rounded-card bg-surface px-4 py-[18px]">
          <div className="flex items-center gap-2.5" aria-hidden="true">
            <Avatar member={from} size={52} />
            <svg width="44" height="20" viewBox="0 0 44 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-2">
              <path d="M3 10h36M32 3l7 7-7 7" strokeDasharray="4 4" />
            </svg>
            <Avatar member={to} size={52} />
          </div>
          <span className="text-xl font-semibold">
            {partnerPays ? t.settlement.paysYou(names.subject) : t.settlement.youPay(names.to)}
          </span>
          <span className="text-subhead text-text-2">
            {list ? t.settlement.scopeList(list.name) : t.settlement.scopeAll}
          </span>
        </div>

        <div className={`flex-none rounded-card bg-surface px-4 py-3 ${tooMuch ? 'ring-[1.5px] ring-danger ring-inset' : ''}`}>
          <label htmlFor="settle-amount" className="text-footnote text-text-2">
            {list ? t.settlement.amount : t.settlement.amountAll(formatMoney(owed))}
          </label>
          <div className="flex items-baseline text-[44px] leading-[52px] font-bold tracking-[-0.8px] tabular-nums">
            {list ? (
              <>
                <input
                  id="settle-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  onFocus={(event) => event.target.select()}
                  // Grows with its content so the euro sign sits right after it.
                  style={{ width: `${Math.max(amount.length, 1)}ch` }}
                  className="min-w-0 bg-transparent p-0 text-text outline-none"
                />
                <span className="ml-2 font-medium text-text-2">€</span>
              </>
            ) : (
              <>
                <span id="settle-amount">{formatMoney(owed)}</span>
              </>
            )}
          </div>
          <span className={`text-footnote ${tooMuch ? 'text-danger' : 'text-text-2'}`}>
            {!list
              ? t.settlement.hintAll
              : tooMuch
                ? t.settlement.tooMuch(formatMoney(owed))
                : t.settlement.hintList(formatMoney(owed))}
          </span>
        </div>

        {!list && (
          <div className="flex-none overflow-hidden rounded-card bg-surface">
            <div className="px-4 pt-3 pb-1 text-footnote font-semibold text-text-2">
              {t.settlement.includes(breakdown.length)}
            </div>
            {breakdown.map(({ list: item, cents }) => (
              <div key={item.id} className="flex h-[52px] items-center gap-3 border-t-[0.5px] border-separator px-4">
                <span className="text-xl" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-body">{item.name}</span>
                <span className="flex flex-col items-end">
                  <span className={`text-base font-semibold tabular-nums ${cents > 0 ? 'text-pos' : 'text-neg'}`}>
                    {cents > 0 ? '+' : '−'}
                    {formatMoney(Math.abs(cents))}
                  </span>
                  <span className="text-xs text-text-2">
                    {cents > 0 ? t.settlement.owesYouLine(names.subject) : t.settlement.youOweLine(names.to)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}

        {list && (
          <div className="flex-none overflow-hidden rounded-card bg-surface">
            <DateRow label={t.expense.date} value={date} onChange={(next) => next && setDate(next)} />
            <div className="flex h-12 items-center border-t-[0.5px] border-separator px-4">
              <input
                type="text"
                aria-label={t.settlement.note}
                placeholder={t.settlement.note}
                value={note}
                maxLength={200}
                onChange={(event) => setNote(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-2"
              />
            </div>
          </div>
        )}

        <div className="min-h-2 flex-1" />
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className="h-[52px] flex-none rounded-cta bg-accent text-body font-semibold text-white disabled:bg-disabled"
        >
          {t.settlement.submit}
        </button>
      </div>
    </Sheet>
  )
}
