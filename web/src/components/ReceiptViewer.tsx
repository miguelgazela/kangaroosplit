import { createPortal } from 'react-dom'
import { t } from '../i18n/pt'
import { Icon } from './Icon'

// Full-screen look at a receipt photo. Pinch to zoom works as on any image.
export function ReceiptViewer({ src, onClose }: { src: string; onClose: () => void }) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.expense.receipt}
      className="fixed inset-0 z-[65] flex flex-col bg-black"
      style={{ animation: 'ks-fade-in 0.2s ease-out' }}
    >
      <div className="flex flex-none justify-end px-2 pt-[calc(env(safe-area-inset-top)+4px)]">
        <button type="button" aria-label={t.actions.close} onClick={onClose} className="flex size-11 items-center justify-center text-white">
          <span className="flex size-8 items-center justify-center rounded-full bg-white/20">
            <Icon name="close" size={14} strokeWidth={3} />
          </span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto pb-[env(safe-area-inset-bottom)]" style={{ touchAction: 'pinch-zoom pan-x pan-y' }}>
        <img src={src} alt={t.expense.receipt} className="mx-auto min-h-full w-full object-contain" />
      </div>
    </div>,
    document.body,
  )
}
