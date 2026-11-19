import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Guru } from '../components/Guru'
import { Icon } from '../components/Icon'
import { ShoppingAdd } from '../components/ShoppingAdd'
import { ShoppingIcon } from '../components/ShoppingIcon'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/ToastContext'
import { useShoppingAdder } from '../components/useShoppingAdder'
import { t } from '../i18n/pt'
import type { ShoppingItem } from '../lib/database.types'
import { nameForms } from '../lib/people'
import { OfflineError, suppressOfflineScreen, useOnline } from '../lib/online'
import { cartCount, cartItems, groupOpen, openCount, progress } from '../lib/shopping'
import { pendingChecks } from '../lib/shoppingQueue'
import { useLingering } from '../lib/useLingering'
import {
  useClearShoppingCart,
  useCurrentMember,
  useSetShoppingChecked,
  useShoppingHistory,
  useShoppingItems,
} from '../query/hooks'
import { useSyncExternalStore } from 'react'

const TEXT_KEY = 'ks.storeLargeText'

function readLarge(): boolean {
  try {
    return window.localStorage.getItem(TEXT_KEY) === '1'
  } catch {
    return false
  }
}

// Keeps the screen awake while the mode is open. Released on leaving or when
// the app is hidden; asked for again when it comes back.
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        const next = await navigator.wakeLock?.request('screen')
        if (cancelled) void next?.release()
        else lock = next ?? null
      } catch {
        // Refused (low battery, no support): the screen just dims as usual.
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request()
    }
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [])
}

function StoreRow({
  item,
  first,
  large,
  requestedBy,
  onToggle,
}: {
  item: ShoppingItem
  first: boolean
  large: boolean
  // "pedido pela Mara", when she added it and there is no note.
  requestedBy: string | null
  onToggle: () => void
}) {
  const done = item.checked_at !== null
  const line = item.note ?? requestedBy
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={t.shopping.check(item.name, item.quantity, done)}
      onClick={onToggle}
      className={`flex w-full touch-manipulation items-center gap-3 pr-3 pl-3 text-left transition-colors duration-150 motion-reduce:transition-none ${large ? 'min-h-[68px]' : 'min-h-[52px]'} ${done ? 'bg-pos-soft' : ''} ${first ? '' : 'border-t-[0.5px] border-separator'}`}
    >
      <ShoppingIcon emoji={item.emoji} imagePath={item.image_path} size={large ? 44 : 36} dim={done} />
      <span className={`flex min-w-0 flex-1 flex-col justify-center py-1 ${done ? 'text-text-2' : ''}`}>
        <span className="flex items-center gap-2">
          <span
            className={`truncate font-medium ${large ? 'text-[22px] leading-7' : 'text-[18px] leading-6'} ${done ? 'line-through' : ''}`}
          >
            {item.name}
          </span>
          {item.quantity > 1 && (
            <span className="flex-none rounded-full bg-accent-soft px-2 text-subhead leading-6 font-bold text-link">
              ×{item.quantity}
            </span>
          )}
        </span>
        {line && <span className={`truncate text-text-2 ${large ? 'text-subhead' : 'text-footnote'}`}>{line}</span>}
      </span>
      <span
        aria-hidden="true"
        className={`flex size-[30px] flex-none items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none ${done ? 'bg-pos text-on-pos' : 'border-2 border-checkbox-off'}`}
      >
        {done && <Icon name="check" size={17} strokeWidth={3.4} />}
      </span>
    </button>
  )
}

// "Na loja": the list for use inside the supermarket. Big, compact, one thing
// to do (tick). No tab bar, no usual items, no add field until "Esqueci-me".
export function ShoppingStore() {
  const navigate = useNavigate()
  const toast = useToast()
  const online = useOnline()
  const { me, partner } = useCurrentMember()
  const { data: items } = useShoppingItems()
  const { data: history } = useShoppingHistory()
  const setChecked = useSetShoppingChecked()
  const clear = useClearShoppingCart()
  const linger = useLingering(1000)
  const waiting = useSyncExternalStore(pendingChecks.subscribe, pendingChecks.snapshot).length

  const [large, setLarge] = useState(readLarge)
  const [cartOpen, setCartOpen] = useState(false)
  const [adding, setAdding] = useState(false)

  const all = items ?? []
  const adder = useShoppingAdder(all, (message) => message && toast({ message }))

  useWakeLock()
  useEffect(() => {
    suppressOfflineScreen(true)
    return () => suppressOfflineScreen(false)
  }, [])

  const failed = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })

  if (!me || !partner) return <div className="h-full bg-bg" />

  const open = openCount(all)
  const inCart = cartCount(all)
  const groups = groupOpen(all, linger.ids)
  const cart = cartItems(all)
  const finished = items !== undefined && all.length > 0 && groups.length === 0
  const nothing = items !== undefined && all.length === 0

  const toggle = (item: ShoppingItem, checked: boolean) => {
    navigator.vibrate?.(8)
    if (checked) linger.start(item.id)
    else linger.cancel(item.id)
    setChecked.mutate({ id: item.id, userId: me.user_id, checked }, { onError: failed })
    if (checked) {
      toast({
        message: t.shopping.store.inCartToast(item.name),
        action: { label: t.actions.undo, onClick: () => toggle(item, false) },
      })
    }
  }

  const finish = () => navigate('/compras')
  const clearAndFinish = () =>
    clear.mutate(undefined, { onSuccess: finish, onError: failed })

  const flip = () => {
    const next = !large
    setLarge(next)
    try {
      window.localStorage.setItem(TEXT_KEY, next ? '1' : '0')
    } catch {
      // Not saved this time; the choice still holds until the screen closes.
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex flex-none flex-col gap-1 px-4 pt-[calc(env(safe-area-inset-top)+8px)]">
        <div className="grid h-11 grid-cols-[1fr_auto_1fr] items-center">
          <button
            type="button"
            onClick={finish}
            className="h-11 justify-self-start text-body font-medium text-link"
          >
            {t.shopping.store.finish}
          </button>
          <h1 className="flex items-center gap-1.5 text-headline font-semibold">
            <Icon name="cart" size={18} strokeWidth={2.2} />
            {t.shopping.store.title}
          </h1>
          <button
            type="button"
            aria-label={t.shopping.store.textSize}
            aria-pressed={large}
            onClick={flip}
            className={`h-[38px] w-[46px] justify-self-end rounded-xl font-bold ${large ? 'bg-accent text-white' : 'bg-surface text-link'}`}
          >
            <span className="text-body">A</span>
            <span className="text-footnote">A</span>
          </button>
        </div>

        <div className="mt-1 flex flex-col gap-2 pb-2">
          <h2 className="font-rounded text-[34px] leading-[41px] font-bold tracking-[0.2px]">
            {finished || nothing ? t.shopping.store.allDoneTitle : t.shopping.store.left(open)}
          </h2>
          {all.length > 0 && (
            <div className="flex items-center gap-3">
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={all.length}
                aria-valuenow={inCart}
                aria-label={t.shopping.progress(inCart, all.length)}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill"
              >
                <div
                  className="h-full rounded-full bg-pos transition-[width] duration-200 motion-reduce:transition-none"
                  style={{ width: `${Math.round(progress(all) * 100)}%` }}
                />
              </div>
              <span className="text-subhead text-text-2 tabular-nums">{t.shopping.inCartCount(inCart)}</span>
            </div>
          )}
        </div>
      </header>

      {!online && (
        <div
          role="status"
          className="mx-4 mb-2 flex flex-none items-start gap-3 rounded-2xl bg-warn-soft px-3.5 py-3 text-subhead text-warn"
        >
          <span className="font-bold">{t.shopping.store.offlineLead}</span>
          <span className="flex-1">
            {t.shopping.store.offlineBody}
            {waiting > 0 && ` ${t.shopping.store.sending(waiting)}.`}
          </span>
        </div>
      )}

      {finished || nothing ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <Guru pose={finished ? 'sucesso' : 'compras'} size={200} />
          <p className="mt-2 text-title2 font-bold">
            {finished ? t.shopping.store.allDoneBody(inCart) : t.shopping.store.emptyTitle}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pb-6">
          {groups.map((group) => (
            <section key={group.section} className="mt-3 flex flex-col gap-1.5">
              <h3
                className={`px-1 font-semibold tracking-[0.4px] text-text-2 uppercase ${large ? 'text-subhead' : 'text-footnote'}`}
              >
                {group.label} · {group.items.length}
              </h3>
              <div className="overflow-hidden rounded-card bg-surface">
                {group.items.map((item, index) => (
                  <StoreRow
                    key={item.id}
                    item={item}
                    first={index === 0}
                    large={large}
                    requestedBy={
                      item.added_by === partner.user_id ? t.shopping.store.requestedBy(nameForms(partner).by) : null
                    }
                    onToggle={() => toggle(item, item.checked_at === null)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <footer className="flex flex-none flex-col gap-2 border-t-[0.5px] border-separator bg-bg px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        {finished ? (
          <>
            <button
              type="button"
              disabled={clear.isPending}
              onClick={clearAndFinish}
              className="h-[54px] rounded-cta bg-accent text-body font-semibold text-white disabled:bg-disabled"
            >
              {t.shopping.store.clearAndFinish}
            </button>
            <button type="button" onClick={finish} className="h-11 text-body font-semibold text-link">
              {t.shopping.store.finishWithout}
            </button>
          </>
        ) : (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-surface text-body font-semibold shadow-card"
            >
              <Icon name="check" size={18} strokeWidth={3} className="text-pos" />
              {t.shopping.store.inCartButton(inCart)}
            </button>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-accent-soft text-body font-semibold text-link"
            >
              <Icon name="plus" size={18} strokeWidth={2.6} />
              {t.shopping.store.forgot}
            </button>
          </div>
        )}
      </footer>

      {cartOpen && (
        <Sheet
          title={t.shopping.store.inCartTitle(cart.length)}
          hideCancel
          onCancel={() => setCartOpen(false)}
          action={{ label: t.shopping.store.ok, onClick: () => setCartOpen(false) }}
        >
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pt-1 pb-[calc(env(safe-area-inset-bottom)+34px)]">
            <p className="px-1 text-subhead text-text-2">{t.shopping.store.inCartHint}</p>
            <div className="overflow-hidden rounded-card bg-surface">
              {cart.map((item, index) => (
                <StoreRow
                  key={item.id}
                  item={item}
                  first={index === 0}
                  large={large}
                  requestedBy={null}
                  onToggle={() => toggle(item, false)}
                />
              ))}
            </div>
          </div>
        </Sheet>
      )}

      {adding && (
        <ShoppingAdd
          items={all}
          history={history ?? []}
          adder={adder}
          showUsual={false}
          aboveTabBar={false}
          autoFocus
          onDismiss={() => setAdding(false)}
        />
      )}
    </div>
  )
}
