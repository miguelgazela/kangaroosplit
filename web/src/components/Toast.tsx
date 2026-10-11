import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'
import { ToastContext, type ToastInput } from './ToastContext'

const VISIBLE_MS = 4000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastInput & { key: number }) | null>(null)

  const show = useCallback((input: ToastInput) => setToast({ ...input, key: Date.now() }), [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <ToastContext value={show}>
      {children}
      {toast && (
        <div
          key={toast.key}
          role="status"
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+78px)] z-[60] flex min-h-[52px] items-center gap-2.5 rounded-cta bg-[#1C1C1E] py-1 pr-1.5 pl-3.5 text-[#F5F5F7] shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
          style={{ animation: 'ks-toast-in 0.2s ease-out' }}
        >
          {toast.kind === 'error' ? (
            <span className="flex size-6 flex-none items-center justify-center rounded-full bg-[#FF6B5E] text-subhead font-extrabold text-[#2A0B07]">
              !
            </span>
          ) : (
            <span className="flex size-6 flex-none items-center justify-center rounded-full bg-[#3DD6A3] text-[#0B2A20]">
              <Icon name="check" size={14} strokeWidth={3.2} />
            </span>
          )}
          <span className="flex-1 py-2 text-subhead font-medium">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick()
                setToast(null)
              }}
              className="h-11 px-3 text-subhead font-semibold text-(--ks-accent-on-dark)"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext>
  )
}
