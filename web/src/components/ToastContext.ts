import { createContext, useContext } from 'react'

export type ToastInput = {
  message: string
  kind?: 'success' | 'error'
  action?: { label: string; onClick: () => void }
}

export const ToastContext = createContext<((toast: ToastInput) => void) | null>(null)

export function useToast(): (toast: ToastInput) => void {
  const show = useContext(ToastContext)
  if (!show) throw new Error('useToast must be used inside ToastProvider')
  return show
}
