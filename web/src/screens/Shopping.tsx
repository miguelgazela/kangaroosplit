import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ActionSheet } from '../components/ActionSheet'
import { Guru } from '../components/Guru'
import { Icon } from '../components/Icon'
import { Screen } from '../components/Screen'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { Member, ShoppingItem, ShoppingSection } from '../lib/database.types'
import { initials, nameForms } from '../lib/people'
import { OfflineError } from '../lib/online'
import {
  cartItems,
  displayName,
  groupOpen,
  lookup,
  MAX_QUANTITY,
  nameKey,
  openCount,
  parseDraft,
  SECTIONS,
  suggest,
  usual,
  type Known,
} from '../lib/shopping'
import {
  useAddShoppingItem,
  useClearShoppingCart,
  useCurrentMember,
  useDeleteAllShoppingItems,
  useRestoreShoppingItems,
  useSetShoppingChecked,
  useShoppingHistory,
  useShoppingItems,
  useUpdateShoppingItem,
} from '../query/hooks'
import { ShoppingItemSheet } from '../sheets/ShoppingItemSheet'

const SECTION_LABELS = Object.fromEntries(SECTIONS.map(({ id, label }) => [id, label])) as Record<
  ShoppingSection,
  string
>

function ItemRow({
  item,
  first,
  partner,
  onToggle,
  onOpen,
}: {
  item: ShoppingItem
  first: boolean
  partner: Member
  onToggle: () => void
  onOpen: () => void
}) {
  const done = item.checked_at !== null
  const byPartner = item.added_by === partner.user_id
  return (
    <div
      className={`flex min-h-[52px] items-center gap-1 pr-3 pl-1 ${first ? '' : 'border-t-[0.5px] border-separator'}`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={t.shopping.check(item.name, item.quantity, done)}
        onClick={onToggle}
        className="flex size-11 flex-none items-center justify-center"
      >
        <span
          className={`flex size-6 items-center justify-center rounded-full text-white ${done ? 'bg-pos' : 'border-2 border-[#B4B4BC]'}`}
        >
          {done && <Icon name="check" size={14} strokeWidth={3.4} />}
        </span>
      </button>
      <button
        type="button"
        onClick={onOpen}
        className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left ${done ? 'text-text-2' : ''}`}
      >
        <span aria-hidden="true" className={`text-xl ${done ? 'opacity-55' : ''}`}>
          {item.emoji}
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="flex items-baseline gap-1.5">
            <span className={`truncate text-body ${done ? 'line-through' : ''}`}>{item.name}</span>
            {item.quantity > 1 && (
              <span className="text-subhead font-semibold text-text-2">×{item.quantity}</span>
            )}
          </span>
          {item.note && <span className="truncate text-footnote text-text-2">{item.note}</span>}
        </span>
      </button>
      {byPartner && (
        <span
          title={nameForms(partner).name}
          className={`flex size-[22px] flex-none items-center justify-center rounded-full text-[9px] font-bold text-white ${done ? 'opacity-55' : ''}`}
          style={{ background: partner.color }}
        >
          {initials(partner.display_name)}
        </span>
      )}
    </div>
  )
}

export function Shopping() {
  const toast = useToast()
  const { me, partner } = useCurrentMember()
  const { data: items } = useShoppingItems()
  const { data: history } = useShoppingHistory()
  const add = useAddShoppingItem()
  const update = useUpdateShoppingItem()
  const setChecked = useSetShoppingChecked()
  const clear = useClearShoppingCart()
  const restore = useRestoreShoppingItems()
  const deleteAll = useDeleteAllShoppingItems()

  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)

  // The notice is a passing remark, not a state.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  if (!me || !partner) return <Screen>{null}</Screen>

  const all = items ?? []
  const past = history ?? []
  const open = openCount(all)
  const cart = cartItems(all)
  const groups = groupOpen(all)
  const hasDraft = draft.trim().length > 0
  const { quantity: draftQuantity } = parseDraft(draft)
  const suggestions = hasDraft ? suggest(draft, all, past) : []
  const chips = hasDraft ? [] : usual(all, past)
  const editingItem = editing ? all.find((item) => item.id === editing) : undefined

  const failed = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  const addKnown = (known: Known, quantity: number) => {
    const existing = all.find((item) => item.checked_at === null && item.name_key === nameKey(known.name))
    setDraft('')
    if (existing) {
      const next = Math.min(existing.quantity + quantity, MAX_QUANTITY)
      setNotice(t.shopping.alreadyThere(known.name, next))
      update.mutate({ id: existing.id, patch: { quantity: next } }, { onError: failed })
      return
    }
    setNotice('')
    add.mutate({ ...known, quantity }, { onError: failed })
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const { quantity, term } = parseDraft(draft)
    if (term === '') return
    const known = lookup(term, past) ?? { name: displayName(term), emoji: '🛒', section: 'outros' as const }
    addKnown(known, quantity)
  }

  const clearCart = () => {
    const removed = cart
    clear.mutate(undefined, {
      onSuccess: () => {
        setNotice('')
        toast({
          message: t.shopping.cartCleared(removed.length),
          action: {
            label: t.actions.undo,
            onClick: () => restore.mutate(removed, { onError: failed }),
          },
        })
      },
      onError: failed,
    })
  }

  const eraseAll = () => {
    const removed = all
    setConfirmDeleteAll(false)
    deleteAll.mutate(undefined, {
      onSuccess: () =>
        toast({
          message: t.shopping.deleteAllDone,
          action: { label: t.actions.undo, onClick: () => restore.mutate(removed, { onError: failed }) },
        }),
      onError: failed,
    })
  }

  return (
    <Screen gap={12}>
      <div className="mt-1 flex h-[52px] flex-none items-center justify-between">
        <h1 className="text-large-title font-bold tracking-[0.4px]">{t.tabs.shopping}</h1>
        <button
          type="button"
          aria-label={t.shopping.options}
          onClick={() => setMenu(true)}
          className="flex size-11 items-center justify-center"
        >
          <span className="flex size-[34px] items-center justify-center rounded-full bg-surface text-accent-text">
            <Icon name="more" size={20} />
          </span>
        </button>
      </div>
      <span className="-mt-2.5 text-subhead text-text-2">
        {open === 0 ? t.shopping.nothingToBuy : t.shopping.toBuy(open, nameForms(partner).name)}
      </span>

      <form onSubmit={submit} className="relative flex-none">
        <label
          className={`flex h-[52px] items-center gap-2.5 rounded-2xl bg-surface pr-1.5 pl-3 ${hasDraft ? 'ring-2 ring-accent' : ''}`}
        >
          <span
            aria-hidden="true"
            className="flex size-7 flex-none items-center justify-center rounded-full bg-accent text-white"
          >
            <Icon name="plus" size={16} strokeWidth={3} />
          </span>
          <input
            type="text"
            aria-label={t.shopping.addLabel}
            placeholder={t.shopping.addPlaceholder}
            value={draft}
            maxLength={80}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(event) => {
              setDraft(event.target.value)
              setNotice('')
            }}
            className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-text-2"
          />
          {hasDraft && (
            // Pointer events only: the keyboard stays up when the button is tapped.
            <button
              type="submit"
              onMouseDown={(event) => event.preventDefault()}
              className="h-10 rounded-xl bg-accent px-3.5 text-subhead font-semibold text-white"
            >
              {t.shopping.add}
            </button>
          )}
        </label>

        {hasDraft && (
          <div
            role="listbox"
            aria-label={t.shopping.suggestions}
            className="mt-2 overflow-hidden rounded-2xl bg-surface shadow-card"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.key}
                type="button"
                role="option"
                aria-selected={false}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addKnown(suggestion.known, draftQuantity)}
                className={`flex min-h-12 w-full items-center gap-2.5 px-3.5 text-left ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}
              >
                <span aria-hidden="true" className="w-[26px] text-center text-xl">
                  {suggestion.literal ? '＋' : suggestion.known.emoji}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body">
                    {suggestion.literal ? t.shopping.addLiteral(suggestion.known.name) : suggestion.known.name}
                    {draftQuantity > 1 ? ` ×${draftQuantity}` : ''}
                  </span>
                  <span className="text-xs text-text-2">
                    {SECTION_LABELS[suggestion.known.section]}
                  </span>
                </span>
                {suggestion.onList !== null && (
                  <span className="text-footnote font-medium text-danger">{t.shopping.alreadyOn(suggestion.onList)}</span>
                )}
              </button>
            ))}
            <div className="border-t-[0.5px] border-separator px-3.5 py-2 text-xs text-text-2">{t.shopping.tip}</div>
          </div>
        )}
      </form>

      {chips.length > 0 && (
        <div className="flex flex-none flex-col gap-1.5">
          <span className="px-1 text-footnote font-semibold text-text-2">{t.shopping.usual}</span>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
            {chips.map((chip) => (
              <button
                key={chip.name_key}
                type="button"
                onClick={() => addKnown({ name: chip.name, emoji: chip.emoji, section: chip.section }, 1)}
                className="flex h-9 flex-none items-center gap-1.5 rounded-full bg-surface px-3 text-subhead whitespace-nowrap"
              >
                <span aria-hidden="true">{chip.emoji}</span>
                {chip.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {notice && (
        <div role="status" className="flex-none px-1 text-footnote text-pos">
          {notice}
        </div>
      )}

      {items && all.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 pb-5 text-center">
          <Guru pose="compras" size={170} />
          <p className="text-body font-semibold">{t.shopping.emptyTitle}</p>
          <p className="text-subhead text-text-2">{t.shopping.emptyBody}</p>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.section} className="flex flex-none flex-col gap-1.5">
          <h2 className="flex justify-between px-1 text-footnote font-semibold tracking-[0.4px] text-text-2 uppercase">
            <span>{group.label}</span>
            <span className="tracking-normal normal-case">{group.items.length}</span>
          </h2>
          <div className="overflow-hidden rounded-card bg-surface">
            {group.items.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                first={index === 0}
                partner={partner}
                onToggle={() =>
                  setChecked.mutate({ id: item.id, userId: me.user_id, checked: true }, { onError: failed })
                }
                onOpen={() => setEditing(item.id)}
              />
            ))}
          </div>
        </section>
      ))}

      {cart.length > 0 && (
        <section className="flex flex-none flex-col gap-1.5 pb-[76px]">
          <h2 className="flex justify-between px-1 text-footnote font-semibold tracking-[0.4px] text-text-2 uppercase">
            <span>{t.shopping.inCart}</span>
            <span className="tracking-normal normal-case">{cart.length}</span>
          </h2>
          <div className="overflow-hidden rounded-card bg-surface/60">
            {cart.map((item, index) => (
              <ItemRow
                key={item.id}
                item={item}
                first={index === 0}
                partner={partner}
                onToggle={() =>
                  setChecked.mutate({ id: item.id, userId: me.user_id, checked: false }, { onError: failed })
                }
                onOpen={() => setEditing(item.id)}
              />
            ))}
          </div>
        </section>
      )}

      {cart.length > 0 && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+64px)] z-10 flex h-[60px] items-center gap-2.5 rounded-[20px] bg-surface pr-2 pl-4 shadow-fab">
          <Icon name="cart" size={22} className="text-pos" />
          <span className="flex-1 text-subhead font-semibold">{t.shopping.inCartCount(cart.length)}</span>
          <button
            type="button"
            disabled={clear.isPending}
            onClick={clearCart}
            className="h-11 rounded-[14px] bg-accent px-4 text-subhead font-semibold text-white disabled:bg-disabled"
          >
            {t.shopping.clearCart}
          </button>
        </div>
      )}

      {editingItem && (
        <ShoppingItemSheet
          key={editingItem.id}
          item={editingItem}
          me={me}
          partner={partner}
          onClose={() => setEditing(null)}
        />
      )}

      {menu && (
        <MenuSheet
          onClose={() => setMenu(false)}
          clearDisabled={cart.length === 0}
          deleteDisabled={all.length === 0}
          onClear={() => {
            setMenu(false)
            clearCart()
          }}
          onDeleteAll={() => {
            setMenu(false)
            setConfirmDeleteAll(true)
          }}
        />
      )}

      {confirmDeleteAll && (
        <ActionSheet
          message={t.shopping.deleteAllConfirm}
          confirmLabel={t.shopping.deleteAll}
          onConfirm={eraseAll}
          onCancel={() => setConfirmDeleteAll(false)}
        />
      )}
    </Screen>
  )
}


// Two actions, in the style of the action sheets elsewhere.
function MenuSheet({
  onClose,
  onClear,
  onDeleteAll,
  clearDisabled,
  deleteDisabled,
}: {
  onClose: () => void
  onClear: () => void
  onDeleteAll: () => void
  clearDisabled: boolean
  deleteDisabled: boolean
}) {
  return createPortal(
    <div className="fixed inset-0 z-50" style={{ animation: 'ks-fade-in 0.2s ease-out' }}>
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.shopping.options}
        className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+8px)] flex flex-col gap-2"
        style={{ animation: 'ks-sheet-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      >
        <div className="overflow-hidden rounded-sheet bg-surface/95 backdrop-blur-[20px]">
          <button
            type="button"
            disabled={clearDisabled}
            onClick={onClear}
            className="h-[57px] w-full text-xl text-accent-text disabled:text-disabled"
          >
            {t.shopping.clearCart}
          </button>
          <button
            type="button"
            disabled={deleteDisabled}
            onClick={onDeleteAll}
            className="h-[57px] w-full border-t-[0.5px] border-separator text-xl text-danger disabled:text-disabled"
          >
            {t.shopping.deleteAll}
          </button>
        </div>
        <button type="button" onClick={onClose} className="h-[57px] rounded-sheet bg-surface text-xl font-semibold text-accent-text">
          {t.actions.cancel}
        </button>
      </div>
    </div>,
    document.body,
  )
}
