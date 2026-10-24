import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'

const MIN_SKELETON_MS = 300
const TOAST_GAP_MS = 3000

// Whether to show a loading skeleton. Only while there is no data yet: cached
// data shows at once and refreshes in the background. Once shown, the
// skeleton stays at least MIN_SKELETON_MS, so the screen does not flash.
// A failed request while loading shows the error toast; the skeleton stays
// until a retry (pull to refresh, or coming back online) succeeds.
export function useFirstLoad(ready: boolean): boolean {
  const [shownAt, setShownAt] = useState<number | null>(() => (ready ? null : Date.now()))
  const queryClient = useQueryClient()
  const toast = useToast()
  const loading = shownAt !== null

  useEffect(() => {
    if (!ready || shownAt === null) return
    const timer = setTimeout(() => setShownAt(null), Math.max(MIN_SKELETON_MS - (Date.now() - shownAt), 0))
    return () => clearTimeout(timer)
  }, [ready, shownAt])

  // Requests failing together (e.g. offline) give one toast, not one each.
  const lastToast = useRef(0)
  useEffect(() => {
    if (!loading) return
    return queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated' || event.action.type !== 'error') return
      if (event.query.state.data !== undefined || Date.now() - lastToast.current < TOAST_GAP_MS) return
      lastToast.current = Date.now()
      toast({ kind: 'error', message: t.system.error })
    })
  }, [loading, queryClient, toast])

  return loading
}
