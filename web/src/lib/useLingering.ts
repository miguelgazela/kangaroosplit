import { useCallback, useEffect, useRef, useState } from 'react'

// Ids that stay where they are for a moment after being ticked ("fica riscado
// no sítio"), so the list does not jump while the next item is being tapped.
export function useLingering(delayMs = 1000) {
  const [ids, setIds] = useState<ReadonlySet<string>>(new Set())
  const timers = useRef(new Map<string, number>())

  const cancel = useCallback((id: string) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setIds((current) => {
      if (!current.has(id)) return current
      const next = new Set(current)
      next.delete(id)
      return next
    })
  }, [])

  const start = useCallback(
    (id: string) => {
      window.clearTimeout(timers.current.get(id))
      setIds((current) => new Set(current).add(id))
      timers.current.set(
        id,
        window.setTimeout(() => cancel(id), delayMs),
      )
    },
    [cancel, delayMs],
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  return { ids, start, cancel }
}
