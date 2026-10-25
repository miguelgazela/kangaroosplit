import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n/pt'

// iOS-style modal sheet: slides up, covers most of the screen, with
// "Cancelar" on the left and the confirming action on the right. There is no
// bottom button, since the keyboard would cover it.
export function Sheet({
  title,
  onCancel,
  action,
  hideCancel = false,
  cancelLabel = t.actions.cancel,
  children,
}: {
  title: string
  onCancel: () => void
  // For a final confirmation screen that offers its own way out.
  hideCancel?: boolean
  // "Fechar" for sheets that only show something.
  cancelLabel?: string
  action?: { label: string; onClick: () => void; disabled?: boolean }
  children: ReactNode
}) {
  return createPortal(
    <div className="fixed inset-0 z-40">
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" style={{ animation: 'ks-fade-in 0.2s ease-out' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+10px)] bottom-0 flex flex-col overflow-hidden rounded-t-sheet bg-bg"
        style={{ animation: 'ks-sheet-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      >
        <div aria-hidden="true" className="mx-auto mt-1.5 h-[5px] w-9 flex-none rounded-full bg-text-2/40" />
        <div className="grid h-12 flex-none grid-cols-[1fr_auto_1fr] items-center px-2">
          {hideCancel ? (
            <span />
          ) : (
            <button type="button" onClick={onCancel} className="h-11 justify-self-start px-2 text-body text-link">
              {cancelLabel}
            </button>
          )}
          <h1 className="text-headline font-semibold">{title}</h1>
          {action && (
            <button
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className="h-11 justify-self-end px-2 text-body font-semibold text-link disabled:text-disabled"
            >
              {action.label}
            </button>
          )}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
