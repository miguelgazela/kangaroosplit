import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ActionSheet } from '../components/ActionSheet'
import { Guru } from '../components/Guru'
import { Icon } from '../components/Icon'
import { Screen } from '../components/Screen'
import { ShoppingAdd } from '../components/ShoppingAdd'
import { ShoppingRow } from '../components/ShoppingRow'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/ToastContext'
import { useShoppingAdder } from '../components/useShoppingAdder'
import { UsualTiles } from '../components/UsualTiles'
import { t } from '../i18n/pt'
import type { ShoppingHistory, ShoppingItem } from '../lib/database.types'
import { nameForms } from '../lib/people'
import { OfflineError } from '../lib/online'
import { cartCount, cartItems, groupOpen, openCount, progress, usual } from '../lib/shopping'
import { useLingering } from '../lib/useLingering'
import {
  useClearShoppingCart,
  useCurrentMember,
  useDeleteAllShoppingItems,
  useRestoreShoppingItems,
  useSetShoppingChecked,
  useShoppingHistory,
  useShoppingItems,
} from '../query/hooks'
import { ShoppingItemSheet } from '../sheets/ShoppingItemSheet'
import { UsualEditSheet } from '../sheets/UsualEditSheet'
import { useSheets } from '../sheets/SheetContext'

// Tiles on the list screen; "Ver todos" opens the rest.
const TILE_ROWS = 8

export function Shopping() {
  const toast = useToast()
  const navigate = useNavigate()
  const { me, partner } = useCurrentMember()
  const { data: items } = useShoppingItems()
  const { data: history } = useShoppingHistory()
  const setChecked = useSetShoppingChecked()
  const clear = useClearShoppingCart()
  const restore = useRestoreShoppingItems()
  const deleteAll = useDeleteAllShoppingItems()
  const linger = useLingering(1000)

  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [allUsual, setAllUsual] = useState(false)
  const [editingUsual, setEditingUsual] = useState<ShoppingHistory | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  // Shown after "Remover comprados" until dismissed or used.
  const [donePrompt, setDonePrompt] = useState(false)
  // Undo for the last "Remover comprados", shown with the notice.
  const [undo, setUndo] = useState<ShoppingItem[] | null>(null)
  const { addExpense } = useSheets()

  const all = items ?? []
  const past = history ?? []
  const adder = useShoppingAdder(all, setNotice)

  // The notice is a passing remark, not a state.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => {
      setNotice('')
      setUndo(null)
    }, 4000)
    return () => clearTimeout(timer)
  }, [notice])

  if (!me || !partner) return <Screen>{null}</Screen>

  const open = openCount(all)
  const inCart = cartCount(all)
  const cart = cartItems(all, linger.ids)
  const groups = groupOpen(all, linger.ids)
  const tiles = usual(
    all.filter((item) => item.checked_at === null && !adder.just.has(item.name_key)),
    past,
  )
  const editingItem = editing ? all.find((item) => item.id === editing) : undefined

  const failed = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  const toggle = (item: ShoppingItem) => {
    const checked = item.checked_at === null
    navigator.vibrate?.(8)
    if (checked) linger.start(item.id)
    else linger.cancel(item.id)
    setChecked.mutate({ id: item.id, userId: me.user_id, checked }, { onError: failed })
  }

  const clearCart = () => {
    const removed = all.filter((item) => item.checked_at !== null)
    clear.mutate(undefined, {
      onSuccess: () => {
        // A notice line, not a toast: the toast would sit on the prompt card.
        setNotice(t.shopping.cartCleared(removed.length))
        setUndo(removed)
        setDonePrompt(true)
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
    <>
      <Screen gap={12}>
        <div className="mt-1 flex h-[52px] flex-none items-center justify-between">
          <h1 className="font-rounded text-large-title font-bold tracking-[0.2px]">{t.tabs.shopping}</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate('/compras/loja')}
              className="flex h-[38px] touch-manipulation items-center gap-1.5 rounded-full bg-accent pr-4 pl-3 text-subhead font-semibold text-white"
            >
              <Icon name="cart" size={18} strokeWidth={2.2} />
              {t.shopping.storeMode}
            </button>
            <button
              type="button"
              aria-label={t.shopping.options}
              onClick={() => setMenu(true)}
              className="flex size-11 items-center justify-center"
            >
              <span className="flex size-[34px] items-center justify-center rounded-full bg-surface text-link">
                <Icon name="more" size={20} />
              </span>
            </button>
          </div>
        </div>

        {all.length > 0 && (
          <div className="flex flex-none items-center gap-3 rounded-card bg-surface py-3 pr-3 pl-4 shadow-card">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-subhead font-semibold">{t.shopping.progress(inCart, all.length)}</span>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={all.length}
                aria-valuenow={inCart}
                aria-label={t.shopping.progress(inCart, all.length)}
                className="h-1.5 overflow-hidden rounded-full bg-fill"
              >
                <div
                  className="h-full rounded-full bg-pos transition-[width] duration-200 motion-reduce:transition-none"
                  style={{ width: `${Math.round(progress(all) * 100)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={clear.isPending || inCart === 0}
              onClick={clearCart}
              className="h-11 flex-none rounded-[14px] bg-accent-soft px-3.5 text-subhead font-semibold text-link disabled:text-disabled"
            >
              {t.shopping.clearCart}
            </button>
          </div>
        )}

        {notice && (
          <div role="status" className="flex flex-none items-center gap-2 px-1 text-footnote text-text-2">
            <span className="flex-1">{notice}</span>
            {undo && (
              <button
                type="button"
                onClick={() => {
                  restore.mutate(undo, { onError: failed })
                  setUndo(null)
                  setNotice('')
                  setDonePrompt(false)
                }}
                className="-my-3 h-11 px-1 font-semibold text-link"
              >
                {t.actions.undo}
              </button>
            )}
          </div>
        )}

        {cart.length === 0 && inCart === 0 && donePrompt && (
          <div className="flex flex-none items-center gap-3 rounded-[20px] bg-surface py-3 pr-1 pl-3.5 shadow-card">
            <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-xl bg-fill text-xl">
              🧾
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-subhead font-semibold">{t.shopping.doneTitle}</span>
              <span className="text-footnote text-text-2">{t.shopping.doneBody(nameForms(partner).with)}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setDonePrompt(false)
                addExpense()
              }}
              className="h-10 flex-none rounded-xl bg-accent px-3 text-subhead font-semibold whitespace-nowrap text-white"
            >
              {t.shopping.logExpense}
            </button>
            <button
              type="button"
              aria-label={t.shopping.notNow}
              onClick={() => setDonePrompt(false)}
              className="flex h-11 w-9 flex-none items-center justify-center text-text-2"
            >
              <Icon name="close" size={16} strokeWidth={2.4} />
            </button>
          </div>
        )}

        {tiles.length > 0 && (
          <section className="flex flex-none flex-col gap-2">
            <h2 className="flex items-baseline justify-between px-1 text-subhead font-semibold">
              <span>
                {t.shopping.usualTitle}
                <span className="font-normal text-text-2"> · {t.shopping.usualHint}</span>
              </span>
              {tiles.length > TILE_ROWS && (
                <button
                  type="button"
                  onClick={() => setAllUsual(true)}
                  className="-my-3 h-11 font-semibold text-link"
                >
                  {t.shopping.seeAll(tiles.length)}
                </button>
              )}
            </h2>
            <UsualTiles entries={tiles.slice(0, TILE_ROWS)} added={adder.just} onAdd={adder.addUsual} onEdit={setEditingUsual} />
          </section>
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
            <h2 className="flex justify-between px-1 text-subhead font-semibold">
              <span>{group.label}</span>
              <span className="font-medium text-text-2 tabular-nums">{group.items.length}</span>
            </h2>
            <div className="overflow-hidden rounded-card bg-surface">
              {group.items.map((item, index) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  first={index === 0}
                  partner={partner}
                  onToggle={() => toggle(item)}
                  onOpen={() => setEditing(item.id)}
                />
              ))}
            </div>
          </section>
        ))}

        {cart.length > 0 && (
          <section className="flex flex-none flex-col gap-1.5">
            <h2 className="flex justify-between px-1 text-subhead font-semibold">
              <span>{t.shopping.inCart}</span>
              <span className="font-medium text-text-2 tabular-nums">{cart.length}</span>
            </h2>
            <div className="overflow-hidden rounded-card bg-surface/60">
              {cart.map((item, index) => (
                <ShoppingRow
                  key={item.id}
                  item={item}
                  first={index === 0}
                  partner={partner}
                  onToggle={() => toggle(item)}
                  onOpen={() => setEditing(item.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Room to scroll the last item above the add field. */}
        <div aria-hidden="true" className="h-[72px] flex-none" />

        {editingItem && (
          <ShoppingItemSheet
            key={editingItem.id}
            item={editingItem}
            me={me}
            partner={partner}
            onClose={() => setEditing(null)}
          />
        )}

        {allUsual && (
          <Sheet title={t.shopping.usualTitle} cancelLabel={t.shopping.close} onCancel={() => setAllUsual(false)}>
            <div className="overflow-y-auto px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+34px)]">
              <UsualTiles entries={tiles} added={adder.just} onAdd={adder.addUsual} onEdit={setEditingUsual} />
            </div>
          </Sheet>
        )}

        {editingUsual && (
          <UsualEditSheet
            key={editingUsual.name_key}
            entry={editingUsual}
            partnerSubject={nameForms(partner).subject}
            onClose={() => setEditingUsual(null)}
          />
        )}

        {menu && (
          <MenuSheet
            onClose={() => setMenu(false)}
            clearDisabled={inCart === 0}
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

      <ShoppingAdd items={all} history={past} adder={adder} showUsual aboveTabBar />
      {/* Referenced so the count in the tab bar and this screen agree. */}
      <span className="sr-only" aria-live="polite">
        {open === 0 ? t.shopping.nothingToBuy : t.shopping.toBuy(open)}
      </span>
    </>
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
            className="h-[57px] w-full text-xl text-link disabled:text-disabled"
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
        <button type="button" onClick={onClose} className="h-[57px] rounded-sheet bg-surface text-xl font-semibold text-link">
          {t.actions.cancel}
        </button>
      </div>
    </div>,
    document.body,
  )
}
