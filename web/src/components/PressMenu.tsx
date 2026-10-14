import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from './Icon'

// The press-and-hold overlay: the page blurs, and whatever was pressed
// lifts above it with its actions around it.
export function PressMenu({
  label,
  top,
  align = 'start',
  onClose,
  children,
}: {
  label: string
  // Where the stack starts, in px from the top of the screen.
  top: number
  // Which edge the stack hugs; follows the side of a chat bubble.
  align?: 'start' | 'end'
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[60]" style={{ animation: 'ks-fade-in 0.15s ease-out' }}>
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-bg/55 backdrop-blur-[14px]"
      />
      <div
        role="group"
        aria-label={label}
        className={`absolute inset-x-4 flex flex-col gap-2.5 ${align === 'end' ? 'items-end' : 'items-start'}`}
        style={{ top }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

export type MenuItem = {
  label: string
  icon: IconName
  onSelect: () => void
  destructive?: boolean
  disabled?: boolean
}

export function MenuList({ label, items }: { label: string; items: MenuItem[] }) {
  return (
    <div
      role="menu"
      aria-label={label}
      className="w-[250px] overflow-hidden rounded-[14px] bg-surface/95 shadow-[0_12px_40px_rgba(17,17,20,0.2)] backdrop-blur-[20px]"
    >
      {items.map((item, index) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={item.onSelect}
          className={`flex h-11 w-full items-center justify-between px-4 text-xl disabled:text-disabled ${
            index > 0 ? 'border-t-[0.5px] border-separator' : ''
          } ${item.destructive ? 'text-danger' : 'text-text'}`}
        >
          {item.label}
          <Icon name={item.icon} size={20} strokeWidth={1.9} />
        </button>
      ))}
    </div>
  )
}
