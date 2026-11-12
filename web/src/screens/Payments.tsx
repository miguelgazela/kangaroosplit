import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BackLink } from '../components/BackLink'
import { Guru } from '../components/Guru'
import { Icon } from '../components/Icon'
import { OptionSheet } from '../components/OptionSheet'
import { Screen } from '../components/Screen'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { Category, List, MerchantRule, PendingPayment } from '../lib/database.types'
import { addDays, todayISO } from '../lib/dates'
import { localDay } from '../lib/dayLabel'
import { formatDayMonth, formatMoney, formatTime } from '../lib/format'
import { OfflineError, useOnline } from '../lib/online'
import {
  useAddPayment,
  useCategories,
  useCurrentMember,
  useDefaultShares,
  useLists,
  useMembers,
  useMerchantRules,
  usePendingPayments,
  useSetExpenseDeleted,
  useSetPaymentStatus,
} from '../query/hooks'

type Choice = { categoryId?: string; listId?: string; remember?: boolean }
type Picking = { id: string; kind: 'category' | 'list' } | null

// "Hoje, 13:42", "Ontem, 08:03", "10 nov, 21:30".
function whenLabel(instant: string): string {
  const day = localDay(instant)
  const today = todayISO()
  const label = day === today ? t.activity.today : day === addDays(today, -1) ? t.activity.yesterday : formatDayMonth(day)
  return `${label}, ${formatTime(instant)}`
}

type Resolved = {
  payment: PendingPayment
  category: Category | undefined
  list: List | undefined
  hasRule: boolean
  remember: boolean
}

export function Payments() {
  const online = useOnline()
  const toast = useToast()
  const { me } = useCurrentMember()
  const { data: payments } = usePendingPayments()
  const { data: rules } = useMerchantRules()
  const { data: lists } = useLists()
  const { data: categories } = useCategories()
  const { data: defaultShares } = useDefaultShares()
  const { data: members } = useMembers()
  const addPayment = useAddPayment()
  const setStatus = useSetPaymentStatus()
  const setExpenseDeleted = useSetExpenseDeleted()
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const [picking, setPicking] = useState<Picking>(null)

  const failed = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  const activeLists = lists?.filter((list) => !list.archived_at) ?? []
  const activeCategories = categories?.filter((category) => !category.archived_at) ?? []
  const mainList = activeLists.find((list) => list.is_default) ?? activeLists[0]

  const resolve = (payment: PendingPayment): Resolved => {
    const choice = choices[payment.id] ?? {}
    const rule: MerchantRule | undefined = rules?.find((candidate) => candidate.merchant_key === payment.merchant_key)
    const ruleCategory = rule && activeCategories.find((category) => category.id === rule.category_id)
    const ruleList = rule && activeLists.find((list) => list.id === rule.list_id)
    const category =
      activeCategories.find((candidate) => candidate.id === choice.categoryId) ?? ruleCategory
    const list = activeLists.find((candidate) => candidate.id === choice.listId) ?? ruleList ?? mainList
    const untouched = choice.categoryId === undefined && choice.listId === undefined
    return {
      payment,
      category,
      list,
      hasRule: Boolean(ruleCategory) && untouched,
      remember: choice.remember ?? !rule,
    }
  }

  const change = (id: string, patch: Choice) => setChoices((current) => ({ ...current, [id]: { ...current[id], ...patch } }))

  const ready = members && lists && categories && defaultShares && me

  const add = async (item: Resolved): Promise<string | null> => {
    if (!ready || !item.category || !item.list) return null
    const list = item.list
    return addPayment.mutateAsync({
      payment: item.payment,
      listId: list.id,
      categoryId: item.category.id,
      note: t.payments.expenseNote,
      members,
      defaults: defaultShares.filter((share) => share.list_id === list.id),
      remember: item.remember,
    })
  }

  // "Anular": the expense goes to the bin again and the draft comes back.
  const undoAdded = (payment: PendingPayment, expenseId: string) => {
    setExpenseDeleted.mutateAsync({ id: expenseId, deleted: true }).then(
      () => setStatus.mutate({ id: payment.id, status: 'pending' }, { onError: failed }),
      failed,
    )
  }

  const addOne = (item: Resolved) => {
    add(item).then((expenseId) => {
      if (!expenseId || !item.list) return
      toast({
        message: t.payments.added(item.list.name, item.payment.merchant),
        action: { label: t.actions.undo, onClick: () => undoAdded(item.payment, expenseId) },
      })
    }, failed)
  }

  const ignore = (payment: PendingPayment) =>
    setStatus.mutate(
      { id: payment.id, status: 'ignored' },
      {
        onSuccess: () =>
          toast({
            message: t.payments.ignored(payment.merchant),
            action: { label: t.actions.undo, onClick: () => setStatus.mutate({ id: payment.id, status: 'pending' }) },
          }),
        onError: failed,
      },
    )

  const items = payments?.map(resolve) ?? []
  const readyItems = items.filter((item) => item.category && item.list)

  const addAll = async () => {
    const done: { payment: PendingPayment; expenseId: string }[] = []
    try {
      for (const item of readyItems) {
        const expenseId = await add(item)
        if (expenseId) done.push({ payment: item.payment, expenseId })
      }
    } catch (error) {
      failed(error)
    }
    if (done.length === 0) return
    toast({
      message: t.payments.addedMany(done.length, mainList?.name ?? ''),
      action: { label: t.actions.undo, onClick: () => done.forEach(({ payment, expenseId }) => undoAdded(payment, expenseId)) },
    })
  }

  const pickingItem = picking ? items.find((item) => item.payment.id === picking.id) : undefined
  const busy = addPayment.isPending || setStatus.isPending

  return (
    <Screen gap={12}>
      <div className="-mx-2 flex h-11 items-center justify-between">
        <BackLink to="/" label={t.payments.back} />
        {readyItems.length > 1 && (
          <button
            type="button"
            disabled={!online || busy}
            onClick={() => void addAll()}
            className="flex h-11 items-center px-2 text-body font-semibold text-link disabled:opacity-40"
          >
            {t.payments.addAll(readyItems.length)}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-[30px] leading-9 font-bold">{t.payments.title}</h1>
        {items.length > 0 && <p className="text-subhead text-text-2">{t.payments.help(items.length)}</p>}
      </div>

      {payments && items.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3.5 pb-[60px] text-center">
          <Guru pose="sucesso" size={150} decorative />
          <p className="text-headline font-semibold">{t.payments.emptyTitle}</p>
          <p className="max-w-[290px] text-subhead text-text-2">{t.payments.emptyBody}</p>
        </div>
      )}

      {items.map((item) => (
        <PaymentCard
          key={item.payment.id}
          item={item}
          disabled={!online || busy}
          onPick={(kind) => setPicking({ id: item.payment.id, kind })}
          onRemember={(remember) => change(item.payment.id, { remember })}
          onIgnore={() => ignore(item.payment)}
          onAdd={() => addOne(item)}
        />
      ))}

      {items.length > 0 && <p className="px-1 text-footnote text-text-2">{t.payments.footer}</p>}
      <Link to="/pagamentos/ligar" className="flex h-[52px] items-center gap-3 rounded-card bg-surface px-4 shadow-card">
        <Icon name="settings" size={22} className="text-text-2" />
        <span className="flex-1 text-body">{t.payments.setupLink}</span>
        <Icon name="chevronRight" size={14} strokeWidth={2.5} className="text-text-2" />
      </Link>

      {picking?.kind === 'category' && pickingItem && (
        <OptionSheet
          title={t.payments.categoryLabel}
          options={activeCategories.map((category) => ({ id: category.id, icon: category.icon, label: category.name }))}
          selected={pickingItem.category?.id ?? null}
          onPick={(categoryId) => {
            change(picking.id, { categoryId })
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
      {picking?.kind === 'list' && pickingItem && (
        <OptionSheet
          title={t.payments.listLabel}
          options={activeLists.map((list) => ({ id: list.id, icon: list.icon, label: list.name }))}
          selected={pickingItem.list?.id ?? null}
          onPick={(listId) => {
            change(picking.id, { listId })
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </Screen>
  )
}

function PaymentCard({
  item,
  disabled,
  onPick,
  onRemember,
  onIgnore,
  onAdd,
}: {
  item: Resolved
  disabled: boolean
  onPick: (kind: 'category' | 'list') => void
  onRemember: (remember: boolean) => void
  onIgnore: () => void
  onAdd: () => void
}) {
  const { payment, category, list, hasRule, remember } = item
  const amount = formatMoney(payment.amount_cents)
  const when = whenLabel(payment.paid_at)
  const needsCategory = !category
  const labelId = `remember-${payment.id}`

  return (
    <section
      aria-label={t.payments.cardAria(payment.merchant, amount, when)}
      className="flex flex-none flex-col gap-3 rounded-card bg-surface p-3.5 shadow-card"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-[42px] flex-none items-center justify-center rounded-xl bg-fill text-[21px]"
        >
          {category?.icon ?? '💳'}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-headline font-semibold">{payment.merchant}</span>
          <span className="flex items-center gap-1.5 text-footnote text-text-2">
            <Icon name="card" size={13} />
            {when} · {t.payments.card(payment.card_last4)}
          </span>
        </span>
        <span className="font-rounded text-xl font-bold tabular-nums">{amount}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-label={`${t.payments.categoryLabel}: ${category?.name ?? t.payments.pickCategory}`}
          onClick={() => onPick('category')}
          className={`flex h-10 items-center gap-1.5 rounded-control px-3 text-subhead ${needsCategory ? 'border-[1.5px] border-dashed border-warn text-warn' : ''}`}
          style={
            category
              ? {
                  background: `color-mix(in srgb, ${category.color} var(--ks-tint-bg), transparent)`,
                  boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${category.color} var(--ks-tint-ring), transparent)`,
                }
              : undefined
          }
        >
          <span aria-hidden="true">{category?.icon ?? '🏷️'}</span>
          {category?.name ?? t.payments.pickCategory}
          <Icon name="chevronDown" size={12} strokeWidth={2.6} className="text-text-2" />
        </button>
        <button
          type="button"
          aria-label={`${t.payments.listLabel}: ${list?.name ?? ''}`}
          onClick={() => onPick('list')}
          className="flex h-10 items-center gap-1.5 rounded-control bg-fill px-3 text-subhead"
        >
          <span aria-hidden="true">{list?.icon}</span>
          {list?.name}
          <Icon name="chevronDown" size={12} strokeWidth={2.6} className="text-text-2" />
        </button>
      </div>

      {hasRule && (
        <p className="flex items-center gap-1.5 self-start rounded-control bg-pos-soft px-2.5 py-1.5 text-footnote text-pos">
          <Icon name="check" size={14} strokeWidth={2.6} />
          {t.payments.ruleSaved(payment.merchant)}
        </p>
      )}
      {needsCategory && (
        <p role="status" className="self-start rounded-control bg-warn-soft px-2.5 py-1.5 text-footnote text-warn">
          {t.payments.needsCategory}
        </p>
      )}
      {!hasRule && (
        <div className="-my-1 flex min-h-11 items-center justify-between gap-3">
          <span id={labelId} className="text-subhead">
            {t.payments.remember(payment.merchant)}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={remember}
            aria-labelledby={labelId}
            onClick={() => onRemember(!remember)}
            className={`relative h-[31px] w-[51px] flex-none rounded-full transition-colors ${remember ? 'bg-accent' : 'bg-fill'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform ${remember ? 'translate-x-5' : ''}`}
            />
          </button>
        </div>
      )}

      <div className="flex gap-2 border-t-[0.5px] border-separator pt-2.5">
        <button
          type="button"
          disabled={disabled}
          onClick={onIgnore}
          className="h-11 flex-1 rounded-xl bg-fill text-body disabled:opacity-40"
        >
          {t.payments.ignore}
        </button>
        <button
          type="button"
          disabled={disabled || needsCategory}
          onClick={onAdd}
          className="h-11 flex-[1.4] rounded-xl bg-accent text-body font-semibold text-white disabled:bg-fill disabled:text-text-2"
        >
          {t.payments.add}
        </button>
      </div>
    </section>
  )
}
