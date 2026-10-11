import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { t } from '../i18n/pt'
import { useOnline } from '../lib/online'
import { Icon } from './Icon'

const PULL_THRESHOLD = 64
const PULL_MAX = 96
const MIN_SPINNER_MS = 500

// Pull down at the top of the scroll area to refetch everything.
function usePullToRefresh(scroller: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  const queryClient = useQueryClient()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const element = scroller.current
    if (!element || !enabled) return

    let startY: number | null = null
    let distance = 0
    let busy = false

    const onStart = (event: TouchEvent) => {
      startY = element.scrollTop <= 0 && !busy ? event.touches[0].clientY : null
      distance = 0
    }

    const onMove = (event: TouchEvent) => {
      if (startY === null) return
      const delta = event.touches[0].clientY - startY
      if (delta <= 0 || element.scrollTop > 0) {
        distance = 0
        setPull(0)
        return
      }
      // Take over from the browser's own overscroll bounce.
      event.preventDefault()
      distance = Math.min(delta * 0.5, PULL_MAX)
      setPull(distance)
    }

    const onEnd = () => {
      if (startY === null) return
      startY = null
      if (distance < PULL_THRESHOLD) {
        setPull(0)
        return
      }
      busy = true
      setRefreshing(true)
      setPull(PULL_THRESHOLD)
      void Promise.allSettled([
        queryClient.refetchQueries(),
        new Promise((resolve) => setTimeout(resolve, MIN_SPINNER_MS)),
      ]).then(() => {
        busy = false
        setRefreshing(false)
        setPull(0)
      })
    }

    element.addEventListener('touchstart', onStart, { passive: true })
    element.addEventListener('touchmove', onMove, { passive: false })
    element.addEventListener('touchend', onEnd)
    element.addEventListener('touchcancel', onEnd)
    return () => {
      element.removeEventListener('touchstart', onStart)
      element.removeEventListener('touchmove', onMove)
      element.removeEventListener('touchend', onEnd)
      element.removeEventListener('touchcancel', onEnd)
    }
  }, [scroller, enabled, queryClient])

  return { pull, refreshing }
}

export function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-[14px] bg-warn-soft px-3.5 py-2.5 text-subhead font-medium text-warn"
    >
      <Icon name="offline" size={20} />
      <span>{t.system.offline}</span>
    </div>
  )
}

// Scrollable page body: safe areas, room for the tab bar, offline banner and
// pull-to-refresh.
export function Screen({ children, gap = 16 }: { children: ReactNode; gap?: number }) {
  const scroller = useRef<HTMLDivElement>(null)
  const online = useOnline()
  const { pull, refreshing } = usePullToRefresh(scroller, online)

  return (
    <div className="relative h-full overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 z-10 flex justify-center"
        style={{
          top: 'calc(env(safe-area-inset-top) + 4px)',
          opacity: Math.min(pull / PULL_THRESHOLD, 1),
          transform: `translateY(${pull - 28}px)`,
        }}
        aria-hidden={pull === 0}
      >
        <span
          className="size-6 rounded-full border-[2.5px] border-accent border-t-transparent"
          style={
            refreshing
              ? { animation: 'ks-spin 0.7s linear infinite' }
              : { transform: `rotate(${pull * 4}deg)` }
          }
        />
      </div>
      <div ref={scroller} className="h-full overflow-x-hidden overflow-y-auto overscroll-y-contain">
      <div
        className="flex min-h-full flex-col px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+49px+38px)]"
        style={{
          gap,
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: pull === 0 || refreshing ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {!online && <OfflineBanner />}
        {children}
      </div>
      </div>
    </div>
  )
}
