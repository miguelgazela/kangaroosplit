import { createPortal } from 'react-dom'
import { t } from '../i18n/pt'

// iOS-style confirmation for destructive actions.
export function ActionSheet({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return createPortal(
    <div className="fixed inset-0 z-50" style={{ animation: 'ks-fade-in 0.2s ease-out' }}>
      <div aria-hidden="true" onClick={onCancel} className="absolute inset-0 bg-black/40" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="action-sheet-message"
        className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+8px)] flex flex-col gap-2"
        style={{ animation: 'ks-sheet-in 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      >
        <div className="overflow-hidden rounded-sheet bg-surface/95 backdrop-blur-[20px]">
          <p id="action-sheet-message" className="px-5 py-3.5 text-center text-footnote text-text-2">
            {message}
          </p>
          <button
            type="button"
            onClick={onConfirm}
            className="h-[57px] w-full border-t-[0.5px] border-separator text-xl text-danger"
          >
            {confirmLabel}
          </button>
        </div>
        <button type="button" onClick={onCancel} className="h-[57px] rounded-sheet bg-surface text-xl font-semibold text-accent-text">
          {t.actions.cancel}
        </button>
      </div>
    </div>,
    document.body,
  )
}
