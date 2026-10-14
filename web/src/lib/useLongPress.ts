import { useRef, type PointerEvent, type MouseEvent } from 'react'

// Tap or press-and-hold on one element. Holding past `delay` calls
// `onLongPress` with the element and suppresses the tap that follows.
export function useLongPress({
  onTap,
  onLongPress,
  delay = 420,
}: {
  onTap: () => void
  onLongPress: (element: HTMLElement) => void
  delay?: number
}) {
  const timer = useRef<number | undefined>(undefined)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const clear = () => {
    window.clearTimeout(timer.current)
    timer.current = undefined
  }

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      fired.current = false
      origin.current = { x: event.clientX, y: event.clientY }
      const element = event.currentTarget
      clear()
      timer.current = window.setTimeout(() => {
        fired.current = true
        timer.current = undefined
        navigator.vibrate?.(10)
        onLongPress(element)
      }, delay)
    },
    // Scrolling or dragging cancels the hold.
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const start = origin.current
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) clear()
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    // No browser or system menu on top of ours.
    onContextMenu: (event: MouseEvent<HTMLElement>) => event.preventDefault(),
    onClick: (event: MouseEvent<HTMLElement>) => {
      if (fired.current) {
        fired.current = false
        event.preventDefault()
        event.stopPropagation()
        return
      }
      onTap()
    },
  }
}
