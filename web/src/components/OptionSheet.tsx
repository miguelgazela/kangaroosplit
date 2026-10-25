import { createPortal } from 'react-dom'

export type Option = { id: string; icon: string; label: string }

// Small bottom sheet for picking one of a handful of options (category, list).
export function OptionSheet({
  title,
  options,
  selected,
  onPick,
  onClose,
}: {
  title: string
  options: Option[]
  selected: string | null
  onPick: (id: string) => void
  onClose: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-50" style={{ animation: 'ks-fade-in 0.2s ease-out' }}>
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 flex max-h-[70%] flex-col rounded-t-sheet bg-bg pb-[calc(env(safe-area-inset-bottom)+12px)]"
        style={{ animation: 'ks-sheet-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      >
        <div aria-hidden="true" className="mx-auto mt-1.5 h-[5px] w-9 flex-none rounded-full bg-text-2/40" />
        <h2 className="flex h-12 flex-none items-center justify-center text-headline font-semibold">{title}</h2>
        <div role="radiogroup" aria-label={title} className="grid grid-cols-3 gap-2 overflow-y-auto px-4">
          {options.map((option) => {
            const active = option.id === selected
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onPick(option.id)}
                className={`flex h-[76px] flex-col items-center justify-center gap-1 rounded-button px-1 ${active ? 'bg-accent-soft text-link ring-[1.5px] ring-accent ring-inset' : 'bg-surface'}`}
              >
                <span className="text-2xl leading-7">{option.icon}</span>
                <span className={`w-full truncate text-center text-footnote ${active ? 'font-semibold' : ''}`}>
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>,
    document.body,
  )
}
