import { useEffect, useRef, useState } from 'react'

// Shows a long list a page at a time: `count` items now, more as the sentinel
// element scrolls into view. Everything is already in memory (stats, search
// and offline need it there), so this limits rendering, not fetching.
// `resetKey` starts over, e.g. when the search text or the list changes.
export function useIncremental(total: number, resetKey: string, pageSize = 40) {
  const [state, setState] = useState({ key: resetKey, count: pageSize })
  const count = state.key === resetKey ? state.count : pageSize
  const hasMore = count < total
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = sentinel.current
    if (!element || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setState({ key: resetKey, count: count + pageSize })
      },
      // Start a screen early, so the next page is there before the end is reached.
      { rootMargin: '600px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasMore, resetKey, count, pageSize])

  return { count, hasMore, sentinel }
}
