import { useState } from 'react'
import { Avatar } from '../components/Avatar'
import { BalanceAmount } from '../components/Balance'
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
  const empty = amountCents <= 0
  const tooMuch = amountCents > owed
  const valid = !empty && !tooMuch
  const partial = valid && amountCents < owed
  const pending = createSettlement.isPending || settleAll.isPending
  const canSubmit = valid && !pending

  // One status line under the amount (2.2).
  const status = !list
    ? t.settlement.hintAll(breakdown.length)
    : empty
      ? t.settlement.empty
      : tooMuch
        ? t.settlement.tooMuch(formatMoney(owed))
        : partial
          ? t.settlement.hintPartial(formatMoney(owed - amountCents))
          : t.settlement.hintList(list.name)
  const cta = !valid
    ? t.settlement.submit
    : partial
      ? t.settlement.submitPartial(formatMoney(amountCents))
      : t.settlement.submitFull(formatMoney(amountCents))

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
    const left = formatMoney(owed - paid)
    return (
      <Sheet title="" onCancel={onClose} hideCancel>
        <div className="flex flex-1 flex-col items-center px-6 pb-[calc(env(safe-area-inset-bottom)+16px)] text-center">
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Guru pose={settled ? 'sucesso' : 'normal'} size={200} />
            <p className="mt-2 flex items-center gap-2 font-rounded text-[28px] leading-[34px] font-bold">
              {settled && (
                <span aria-hidden="true" className="flex size-7 flex-none items-center justify-center rounded-full bg-pos text-surface">
                  <Icon name="check" size={16} strokeWidth={3} />
                </span>
              )}
              {settled ? t.settlement.doneTitle : t.settlement.partialTitle}
            </p>
            <p className="text-body leading-6 text-text-2">
              {partnerPays
                ? t.settlement.donePaidYou(names.subject, formatMoney(paid))
                : t.settlement.doneYouPaid(names.to, formatMoney(paid))}
              <br />
              {settled
                ? list
                  ? t.settlement.evenList(list.name)
                  : t.settlement.evenAll
                : partnerPays
                  ? t.settlement.stillOwesYou(left, list?.name ?? '')
                  : t.settlement.youStillOwe(left, list?.name ?? '')}
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
        <section aria-label={t.settlement.label} className="flex flex-none flex-col gap-3.5 rounded-card bg-surface p-4">
          <div className="flex items-center gap-3">
            <span className="flex flex-none items-center gap-1.5" aria-hidden="true">
              <Avatar member={from} size={36} />
              <Icon name="arrowRight" size={20} strokeWidth={2} className="text-text-2" />
              <Avatar member={to} size={36} />
            </span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="text-headline font-semibold">
                {partnerPays ? t.settlement.paysYou(names.subject) : t.settlement.youPay(names.to)}
              </span>
              <span className="text-footnote text-text-2">
                {list ? t.settlement.scopeList(list.name) : t.settlement.scopeAll}
              </span>
            </span>
          </div>

          <div className="flex flex-col gap-1 border-t-[0.5px] border-separator pt-3">
            <label htmlFor="settle-amount" className="text-footnote text-text-2">
              {t.settlement.amount}
            </label>
            <div className="flex items-baseline gap-1.5 font-rounded text-[48px] leading-[56px] font-bold tabular-nums">
              {list ? (
                <input
                  id="settle-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  aria-invalid={!valid}
                  aria-describedby="settle-status"
                  onChange={(event) => setAmount(event.target.value)}
                  onFocus={(event) => event.target.select()}
                  // Grows with its content so the euro sign sits right after it.
                  style={{ width: `${Math.max(amount.length, 1)}ch` }}
                  className={`min-w-0 border-b-2 bg-transparent p-0 text-text outline-none ${valid ? 'border-heat-3' : 'border-danger'}`}
                />
              ) : (
                <span id="settle-amount">{formatAmountInput(owed)}</span>
              )}
              <span>€</span>
            </div>
            <span
              id="settle-status"
              role="status"
              className={`text-footnote ${list && !valid ? 'text-danger' : 'text-text-2'}`}
            >
              {status}
            </span>
          </div>
        </section>

        {!list && (
          <section aria-label={t.settlement.includes(breakdown.length)} className="flex-none overflow-hidden rounded-card bg-surface">
            <h2 className="px-4 pt-3 pb-1 text-footnote font-semibold text-text-2">
              {t.settlement.includes(breakdown.length)}
            </h2>
            {breakdown.map(({ list: item, cents }, index) => (
              <div
                key={item.id}
                className={`flex min-h-[52px] items-center gap-3 px-4 ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}
              >
                <span className="text-xl" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-body">{item.name}</span>
                <span className="flex flex-col items-end">
                  <BalanceAmount cents={cents} className="text-base" iconSize={12} />
                  <span className="text-xs text-text-2">
                    {cents > 0 ? t.balance.owesYouShort : t.balance.youOweShort}
                  </span>
                </span>
              </div>
            ))}
          </section>
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
          {cta}
        </button>
      </div>
    </Sheet>
  )
}
