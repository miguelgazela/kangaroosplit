import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

export const PULL_THRESHOLD = 64
const PULL_MAX = 96
const MIN_SPINNER_MS = 500

// Pull down at the top of the scroll area to refetch everything.
export function usePullToRefresh(scroller: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
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
