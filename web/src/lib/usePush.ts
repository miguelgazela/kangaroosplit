import { useCallback, useEffect, useState } from 'react'
import { disablePush, enablePush, getPushState, type PushState } from './push'

export function usePush() {
  // Null until the browser has been asked.
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getPushState().then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const change = useCallback(async (action: () => Promise<PushState>) => {
    setBusy(true)
    try {
      const next = await action()
      setState(next)
      return next
    } finally {
      setBusy(false)
    }
  }, [])

  return {
    state,
    busy,
    enable: useCallback(() => change(enablePush), [change]),
    disable: useCallback(() => change(disablePush), [change]),
  }
}
