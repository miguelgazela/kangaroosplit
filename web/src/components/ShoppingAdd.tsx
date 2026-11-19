import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { ShoppingIcon } from './ShoppingIcon'
import { UsualTiles } from './UsualTiles'
import type { ShoppingAdder } from './useShoppingAdder'
import { t } from '../i18n/pt'
import type { ShoppingHistory, ShoppingItem, ShoppingSection } from '../lib/database.types'
import {
  displayName,
  lookup,
  parseDraft,
  SECTIONS,
  suggest,
  usual,
} from '../lib/shopping'
import { useKeyboardInset } from '../lib/useKeyboardInset'

const SECTION_LABELS = Object.fromEntries(SECTIONS.map(({ id, label }) => [id, label])) as Record<
  ShoppingSection,
  string
>

// The add field, fixed above the tab bar (or at the bottom of a full-screen
// view). Focusing it opens a panel over the list: the usual items while the
// field is empty, suggestions while typing. The keyboard stays up when
// something is added, so a run of items is one tap each.
export function ShoppingAdd({
  items,
  history,
  adder,
  showUsual,
  aboveTabBar,
  autoFocus = false,
  onDismiss,
  extraFocusRing = false,
}: {
  items: ShoppingItem[]
  history: ShoppingHistory[]
  adder: ShoppingAdder
  showUsual: boolean
  aboveTabBar: boolean
  autoFocus?: boolean
  // Called when the field loses the focus (full-screen use closes the field).
  onDismiss?: () => void
  extraFocusRing?: boolean
}) {
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const inset = useKeyboardInset()
  const { addKnown, addUsual, just, setHold } = adder

  useEffect(() => setHold(focused), [focused, setHold])

  const hasDraft = draft.trim().length > 0
  const { quantity: draftQuantity } = parseDraft(draft)
  const suggestions = hasDraft ? suggest(draft, items, history) : []
  const open = items.filter((item) => item.checked_at === null)
  const tiles = showUsual && !hasDraft ? usual(open.filter((item) => !just.has(item.name_key)), history) : []
  const panel = focused && (hasDraft ? suggestions.length > 0 : tiles.length > 0)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const { quantity, term } = parseDraft(draft)
    if (term === '') return
    const known = lookup(term, history) ?? { name: displayName(term), emoji: '🛒', section: 'outros' as const }
    setDraft('')
    addKnown(known, quantity)
  }

  const bottom =
    inset > 0
      ? `${inset + 8}px`
      : aboveTabBar
        ? 'calc(env(safe-area-inset-bottom) + 74px)'
        : 'calc(env(safe-area-inset-bottom) + 12px)'

  return (
    <>
      {aboveTabBar && !focused && (
        // Fades the list out under the field, between it and the tab bar.
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 z-10 h-[96px] bg-linear-to-t from-bg via-bg/85 to-transparent"
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 49px)' }}
        />
      )}
      {focused && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-20 bg-black/45"
          style={{ animation: 'ks-fade-in 0.15s ease-out' }}
          // Keep the focus until the tap is over, then let go.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
        />
      )}
      <div
        className="fixed inset-x-0 z-30 flex flex-col gap-2 px-3"
        style={{ bottom }}
        onBlur={(event) => {
          // Moving between the field and the panel is not leaving.
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setFocused(false)
            onDismiss?.()
          }
        }}
      >
        {panel && (
          <div
            className="flex flex-col overflow-hidden rounded-[20px] bg-surface shadow-[0_10px_30px_rgba(17,17,20,0.18)]"
            style={{ maxHeight: `calc(100dvh - ${inset}px - 190px)`, animation: 'ks-toast-in 0.15s ease-out' }}
          >
            {hasDraft ? (
              <div role="listbox" aria-label={t.shopping.suggestions} className="overflow-y-auto overscroll-contain">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion.key}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setDraft('')
                      addKnown(suggestion.known, draftQuantity)
                    }}
                    className={`flex min-h-14 w-full items-center gap-2.5 px-3.5 text-left ${index > 0 ? 'border-t-[0.5px] border-separator' : ''}`}
                  >
                    {suggestion.literal ? (
                      <span
                        aria-hidden="true"
                        className="flex size-9 flex-none items-center justify-center rounded-xl bg-fill text-link"
                      >
                        <Icon name="plus" size={18} strokeWidth={2.6} />
                      </span>
                    ) : (
                      <ShoppingIcon
                        emoji={suggestion.known.emoji}
                        imagePath={suggestion.known.image_path}
                        size={36}
                      />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body">
                        {suggestion.literal ? t.shopping.addLiteral(suggestion.known.name) : suggestion.known.name}
                        {draftQuantity > 1 ? ` ×${draftQuantity}` : ''}
                      </span>
                      <span className="text-footnote text-text-2">
                        {suggestion.onList !== null ? (
                          <span className="font-medium text-pos">{t.shopping.alreadyOn(suggestion.onList)}</span>
                        ) : (
                          SECTION_LABELS[suggestion.known.section]
                        )}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 overflow-y-auto overscroll-contain p-3">
                <h2 className="px-0.5 text-subhead font-semibold">
                  {t.shopping.usualTitle}
                  <span className="font-normal text-text-2"> · {t.shopping.usualHint}</span>
                </h2>
                <UsualTiles entries={tiles} added={just} onAdd={addUsual} keepFocus onSurface />
              </div>
            )}
          </div>
        )}

        <form onSubmit={submit} className="flex-none">
          <label
            className={`flex h-[52px] items-center gap-2.5 rounded-2xl bg-surface pr-1.5 pl-3 shadow-[0_6px_20px_rgba(17,17,20,0.14)] ${focused || extraFocusRing ? 'ring-2 ring-accent' : ''}`}
          >
            <input
              type="text"
              aria-label={t.shopping.addLabel}
              placeholder={t.shopping.addPlaceholder}
              value={draft}
              maxLength={80}
              autoComplete="off"
              enterKeyHint="done"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus={autoFocus}
              onFocus={() => setFocused(true)}
              onChange={(event) => setDraft(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-text-2"
            />
            {/* Pointer events only: the keyboard stays up when the button is tapped. */}
            <button
              type="submit"
              aria-label={t.shopping.add}
              disabled={!hasDraft}
              onMouseDown={(event) => event.preventDefault()}
              className="flex size-10 flex-none items-center justify-center rounded-full bg-accent text-white"
            >
              <Icon name={hasDraft ? 'send' : 'plus'} size={20} strokeWidth={2.6} />
            </button>
          </label>
        </form>
      </div>
    </>
  )
}
