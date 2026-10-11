import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ActionSheet } from '../components/ActionSheet'
import { Avatar } from '../components/Avatar'
import { DateRow } from '../components/DateRow'
import { Icon } from '../components/Icon'
import { OptionSheet } from '../components/OptionSheet'
import { Segmented } from '../components/Segmented'
import { Sheet } from '../components/Sheet'
import { SplitEditor } from '../components/SplitEditor'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import { generateRecurring } from '../data/recurring'
import type {
  Category,
  ExpenseWithShares,
  Frequency,
  List,
  ListDefaultShare,
  Member,
  RecurringExpense,
} from '../lib/database.types'
import { todayISO } from '../lib/dates'
import { formatAmountInput, formatDate, parseMoney, splitMoney } from '../lib/format'
import { OfflineError } from '../lib/online'
import { ruleStatus } from '../lib/ruleStatus'
import { nameForms } from '../lib/people'
import {
  resolveSplit,
  splitChip,
  splitFormFromDefaults,
  splitFormFromShares,
  splitSummary,
  type SplitForm,
} from '../lib/splitForm'
import {
  useCategories,
  useCreateRecurring,
  useCurrentMember,
  useDefaultShares,
  useLists,
  useMembers,
  useDeleteRecurring,
  useSaveExpense,
  useSetExpenseDeleted,
  useSetRecurringPaused,
  useUpdateRecurring,
} from '../query/hooks'

const LAST_LIST_KEY = 'kangaroosplit-last-list'
const LAST_CATEGORY_KEY = 'kangaroosplit-last-category'

const remembered = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const remember = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode: the preference just does not stick.
  }
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back'] as const

// Applies one keypad press to the amount being typed ("40", "40,5").
function pressKey(amount: string, key: (typeof KEYS)[number]): string {
  if (key === 'back') return amount.slice(0, -1)
  const [whole, decimals] = amount.split(',')
  if (key === ',') return decimals === undefined ? `${amount || '0'},` : amount
  if (decimals !== undefined) return decimals.length < 2 ? amount + key : amount
  if (whole === '0') return key
  return whole.length < 7 ? amount + key : amount
}

export type ExpenseSheetProps = {
  // Preselected list for a new expense.
  listId?: string
  // Present when editing.
  expense?: ExpenseWithShares
  // Set to edit a recurring rule instead of a single expense: the same form,
  // with a schedule in place of the date. `rule` is present when editing one.
  recurring?: { rule?: RecurringExpense }
  onClose: () => void
}

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: 'weekly', label: t.recurring.weekly },
  { id: 'monthly', label: t.recurring.monthly },
  { id: 'yearly', label: t.recurring.yearly },
]

export function ExpenseSheet(props: ExpenseSheetProps) {
  const { me, partner } = useCurrentMember()
  const { data: members } = useMembers()
  const { data: lists } = useLists()
  const { data: categories } = useCategories()
  const { data: defaultShares } = useDefaultShares()

  if (!me || !partner || !members || !lists || !categories || !defaultShares) return null
  return (
    <ExpenseForm
      {...props}
      me={me}
      partner={partner}
      members={members}
      lists={lists}
      categories={categories}
      defaultShares={defaultShares}
    />
  )
}

function ExpenseForm({
  listId,
  expense,
  recurring,
  onClose,
  me,
  partner,
  members,
  lists,
  categories,
  defaultShares,
}: ExpenseSheetProps & {
  me: Member
  partner: Member
  members: Member[]
  lists: List[]
  categories: Category[]
  defaultShares: ListDefaultShare[]
}) {
  const queryClient = useQueryClient()
  const toast = useToast()
  const save = useSaveExpense()
  const setDeleted = useSetExpenseDeleted()
  const createRule = useCreateRecurring()
  const updateRule = useUpdateRecurring()
  const setRulePaused = useSetRecurringPaused()
  const deleteRule = useDeleteRecurring()

  const rule = recurring?.rule
  // What the form starts from when editing.
  const template = expense ?? rule

  const selectableLists = lists.filter((list) => !list.archived_at || list.id === template?.list_id)
  const selectableCategories = categories.filter(
    (category) => !category.archived_at || category.id === template?.category_id,
  )
  const defaultsFor = (id: string) => defaultShares.filter((share) => share.list_id === id)
  const pickExisting = <T extends { id: string }>(items: T[], ...ids: (string | null | undefined)[]) =>
    ids.map((id) => items.find((item) => item.id === id)).find(Boolean) ?? items[0]

  const initialList = pickExisting(
    selectableLists,
    template?.list_id,
    listId,
    remembered(LAST_LIST_KEY),
    lists.find((list) => list.is_default)?.id,
  )
  const initialCategory = pickExisting(selectableCategories, template?.category_id, remembered(LAST_CATEGORY_KEY))

  const [amount, setAmount] = useState(template ? formatAmountInput(template.amount_cents).replace(/,00$/, '') : '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [categoryId, setCategoryId] = useState(initialCategory.id)
  const [selectedListId, setSelectedListId] = useState(initialList.id)
  const [paidBy, setPaidBy] = useState(template?.paid_by ?? me.user_id)
  const [date, setDate] = useState(expense?.spent_on ?? todayISO())
  const [note, setNote] = useState(template?.note ?? '')
  const [split, setSplit] = useState<SplitForm>(() =>
    expense
      ? splitFormFromShares(members, expense.split_mode, expense.expense_shares)
      : rule
        ? splitFormFromShares(members, rule.split_mode, rule.split_input)
        : splitFormFromDefaults(members, defaultsFor(initialList.id)),
  )
  const [frequency, setFrequency] = useState<Frequency>(rule?.frequency ?? 'monthly')
  const [startOn, setStartOn] = useState(rule?.start_on ?? todayISO())
  const [endOn, setEndOn] = useState(rule?.end_on ?? null)
  // Whether the split is still the list's default, and so should follow the list.
  const [splitTouched, setSplitTouched] = useState(template !== undefined)
  const [keypad, setKeypad] = useState(template === undefined)
  const [expanded, setExpanded] = useState(false)
  const [picker, setPicker] = useState<'category' | 'list' | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const amountCents = parseMoney(amount) ?? 0
  const result = resolveSplit(split, members, amountCents)
  const category = selectableCategories.find((candidate) => candidate.id === categoryId)
  const list = selectableLists.find((candidate) => candidate.id === selectedListId)
  const scheduleInvalid = recurring !== undefined && endOn !== null && endOn < startOn
  const pending =
    save.isPending || setDeleted.isPending || createRule.isPending || updateRule.isPending || setRulePaused.isPending || deleteRule.isPending
  const canSave = amountCents > 0 && description.trim() !== '' && result.ok && !scheduleInvalid && !pending

  const fail = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  const changeList = (id: string) => {
    setSelectedListId(id)
    if (!splitTouched) setSplit(splitFormFromDefaults(members, defaultsFor(id)))
  }

  const changeSplit = (next: SplitForm) => {
    setSplit(next)
    setSplitTouched(true)
  }

  const onSaveRule = async () => {
    if (!result.ok) return
    const input = {
      listId: selectedListId,
      description,
      amountCents,
      paidBy,
      categoryId,
      note: note || null,
      splitMode: split.mode,
      shares: result.shares,
      frequency,
      startOn,
      endOn,
    }
    try {
      if (rule) await updateRule.mutateAsync({ id: rule.id, input })
      else await createRule.mutateAsync(input)
      // A rule starting today or earlier has expenses due straight away.
      await generateRecurring()
      await queryClient.invalidateQueries()
      toast({ message: t.recurring.saved })
      onClose()
    } catch (error) {
      fail(error)
    }
  }

  const onTogglePause = () => {
    if (!rule) return
    setRulePaused.mutate({ id: rule.id, paused: !rule.paused_at }, { onSuccess: onClose, onError: fail })
  }

  const onDeleteRule = () => {
    if (!rule) return
    setConfirmingDelete(false)
    deleteRule.mutate(rule.id, {
      onSuccess: () => {
        toast({ message: t.recurring.deleted })
        onClose()
      },
      onError: fail,
    })
  }

  const onSave = () => {
    if (!result.ok) return
    if (recurring) {
      void onSaveRule()
      return
    }
    save.mutate(
      {
        id: expense?.id,
        listId: selectedListId,
        description,
        amountCents,
        spentOn: date,
        paidBy,
        categoryId,
        note: note || null,
        splitMode: split.mode,
        shares: result.shares,
      },
      {
        onSuccess: () => {
          remember(LAST_LIST_KEY, selectedListId)
          remember(LAST_CATEGORY_KEY, categoryId)
          toast({ message: t.expense.saved })
          onClose()
        },
        onError: fail,
      },
    )
  }

  const onDelete = () => {
    if (!expense) return
    setConfirmingDelete(false)
    setDeleted.mutate(
      { id: expense.id, deleted: true },
      {
        onSuccess: () => {
          toast({
            message: t.expense.deleted,
            action: {
              label: t.actions.undo,
              onClick: () => setDeleted.mutate({ id: expense.id, deleted: false }, { onError: fail }),
            },
          })
          onClose()
        },
        onError: fail,
      },
    )
  }

  const { whole, rest } = splitMoney(amountCents)
  const payerLabel = paidBy === me.user_id ? t.expense.paidByYou : t.expense.paidBy(nameForms(partner).by)
  const chip = 'h-9 rounded-full bg-surface px-3 text-subhead'

  const author = (userId: string | null, own: (date: string) => string, other: (by: string, date: string) => string, at: string) => {
    const when = formatDate(new Date(at))
    return userId === me.user_id ? own(when) : other(nameForms(partner).by, when)
  }

  return (
    <Sheet
      title={recurring ? t.recurring.sheetTitle : expense ? t.expense.edit : t.expense.create}
      onCancel={onClose}
      action={{ label: t.actions.save, onClick: onSave, disabled: !canSave }}
    >
      <div className={`flex flex-1 flex-col gap-3 px-4 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+16px)] ${keypad ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div className="flex-none overflow-hidden rounded-card bg-surface">
          <button
            type="button"
            aria-label={t.expense.amount}
            onClick={() => setKeypad((open) => !open)}
            className="block w-full px-4 pt-3 pb-2.5 text-left"
          >
            <span className="text-footnote text-text-2">{t.expense.amount}</span>
            <span className="flex items-baseline gap-0.5 text-[44px] leading-[52px] font-bold tracking-[-0.8px] tabular-nums">
              {keypad ? (
                <>
                  <span>{amount || '0'}</span>
                  <span aria-hidden="true" className="mx-0.5 h-10 w-0.5 self-center bg-accent" />
                  <span className="font-medium text-text-2">€</span>
                </>
              ) : (
                <>
                  <span>{whole}</span>
                  <span className="font-medium text-text-2">{rest}</span>
                </>
              )}
            </span>
          </button>
          <div className="flex h-[50px] items-center border-t-[0.5px] border-separator px-4">
            <input
              type="text"
              aria-label={t.expense.description}
              placeholder={t.expense.description}
              value={description}
              maxLength={80}
              enterKeyHint="done"
              onChange={(event) => setDescription(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-2"
            />
          </div>
        </div>

        {keypad ? (
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPicker('category')} className={chip}>
                {category?.icon} {category?.name}
              </button>
              <button type="button" onClick={() => setPicker('list')} className={chip}>
                {list?.icon} {list?.name}
              </button>
              <button
                type="button"
                onClick={() => setPaidBy(paidBy === me.user_id ? partner.user_id : me.user_id)}
                className={chip}
              >
                {payerLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  setKeypad(false)
                  setExpanded(true)
                }}
                className={`${chip} tabular-nums`}
              >
                {splitChip(split, result)}
              </button>
            </div>
            <div className="flex-1" />
            <div className="grid grid-cols-3 gap-2">
              {KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key === 'back' ? t.expense.deleteDigit : key === ',' ? t.expense.decimalComma : key}
                  onClick={() => setAmount((current) => pressKey(current, key))}
                  className="flex h-14 items-center justify-center rounded-button bg-surface text-[26px] font-medium active:bg-fill"
                >
                  {key === 'back' ? <Icon name="backspace" size={26} /> : key}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex-none overflow-hidden rounded-card bg-surface">
              <Row label={t.expense.category} value={`${category?.icon} ${category?.name}`} onClick={() => setPicker('category')} />
              <Row label={t.expense.list} value={`${list?.icon} ${list?.name}`} onClick={() => setPicker('list')} border />
              {!recurring && (
                <DateRow label={t.expense.date} value={date} onChange={(next) => next && setDate(next)} chevron border />
              )}
              <div className="flex h-14 items-center gap-2 border-t-[0.5px] border-separator pr-2 pl-4">
                <span className="flex-1 text-body">{t.expense.payer}</span>
                <div role="radiogroup" aria-label={t.expense.payer} className="flex rounded-xl bg-fill p-[3px]">
                  {members.map((member) => {
                    const active = member.user_id === paidBy
                    return (
                      <button
                        key={member.user_id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setPaidBy(member.user_id)}
                        className={`flex h-10 items-center gap-1.5 rounded-[9px] pr-3 pl-1.5 text-subhead ${active ? 'bg-segment-on font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'font-medium'}`}
                      >
                        <Avatar member={member} size={28} />
                        {member.display_name}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {recurring && (
              <div className={`flex-none overflow-hidden rounded-card bg-surface ${scheduleInvalid ? 'ring-[1.5px] ring-danger ring-inset' : ''}`}>
                <div className="flex flex-col gap-2 px-4 py-2.5">
                  <span className="text-footnote text-text-2">{t.recurring.frequency}</span>
                  <Segmented label={t.recurring.frequency} options={FREQUENCIES} value={frequency} onChange={setFrequency} />
                </div>
                <DateRow label={t.recurring.startsOn} value={startOn} onChange={(next) => next && setStartOn(next)} border />
                <DateRow label={t.recurring.endsOn} value={endOn} onChange={setEndOn} optional border />
              </div>
            )}
            {scheduleInvalid && <p className="-mt-1 px-1 text-footnote text-danger">{t.recurring.datesInvalid}</p>}

            <div className="flex-none overflow-hidden rounded-card bg-surface">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded((open) => !open)}
                className="flex h-[52px] w-full items-center gap-2 pr-3 pl-4 text-left"
              >
                <span className="flex-1 text-body">{t.expense.split}</span>
                <span className={`truncate text-subhead tabular-nums ${result.ok ? 'text-text-2' : 'text-danger'}`}>
                  {splitSummary(split, result)}
                </span>
                <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={14} strokeWidth={2.5} className="flex-none text-text-2" />
              </button>
              {expanded && (
                <SplitEditor form={split} result={result} members={members} amountCents={amountCents} onChange={changeSplit} />
              )}
            </div>

            {!recurring && (
            <div className="flex h-[52px] flex-none items-center rounded-card bg-surface px-4">
              <input
                type="text"
                aria-label={t.expense.note}
                placeholder={t.expense.note}
                value={note}
                maxLength={200}
                onChange={(event) => setNote(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-2"
              />
            </div>
            )}

            {expense && (
              <div className="flex flex-none flex-col gap-3">
                <div className="flex flex-col gap-0.5 px-1 text-footnote text-text-2">
                  <span>{author(expense.created_by, t.expense.createdByYou, t.expense.createdBy, expense.created_at)}</span>
                  {expense.updated_by && (
                    <span>{author(expense.updated_by, t.expense.editedByYou, t.expense.editedBy, expense.updated_at)}</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirmingDelete(true)}
                  className="h-[50px] rounded-cta bg-surface text-body font-semibold text-danger"
                >
                  {t.expense.delete}
                </button>
              </div>
            )}

            {rule && (
              <div className="flex flex-none flex-col gap-3">
                <div className="flex flex-col gap-0.5 px-1 text-footnote text-text-2">
                  <span>{ruleStatus(rule)}</span>
                  <span>{author(rule.created_by, t.expense.createdByYou, t.expense.createdBy, rule.created_at)}</span>
                </div>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={onTogglePause}
                    className="h-[50px] flex-1 rounded-cta bg-surface text-body font-semibold text-accent-text"
                  >
                    {rule.paused_at ? t.recurring.resume : t.recurring.pause}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirmingDelete(true)}
                    className="h-[50px] flex-1 rounded-cta bg-surface text-body font-semibold text-danger"
                  >
                    {t.recurring.delete}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {picker === 'category' && (
        <OptionSheet
          title={t.expense.category}
          options={selectableCategories.map(({ id, icon, name }) => ({ id, icon, label: name }))}
          selected={categoryId}
          onPick={(id) => {
            setCategoryId(id)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'list' && (
        <OptionSheet
          title={t.expense.list}
          options={selectableLists.map(({ id, icon, name }) => ({ id, icon, label: name }))}
          selected={selectedListId}
          onPick={(id) => {
            changeList(id)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
      {confirmingDelete && (
        <ActionSheet
          message={rule ? t.recurring.deleteConfirm : t.expense.deleteConfirm}
          confirmLabel={rule ? t.recurring.delete : t.expense.delete}
          onConfirm={rule ? onDeleteRule : onDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </Sheet>
  )
}

function Row({ label, value, onClick, border = false }: { label: string; value: string; onClick: () => void; border?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-full items-center gap-2 pr-3 pl-4 text-left ${border ? 'border-t-[0.5px] border-separator' : ''}`}
    >
      <span className="flex-1 text-body">{label}</span>
      <span className="truncate rounded-full bg-fill px-2.5 py-[5px] text-subhead">{value}</span>
      <Icon name="chevronRight" size={14} strokeWidth={2.5} className="flex-none text-text-2" />
    </button>
  )
}
