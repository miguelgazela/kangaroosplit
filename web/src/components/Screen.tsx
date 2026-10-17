import { useRef, type ReactNode } from 'react'
import { useOnline } from '../lib/online'
import { usePullToRefresh } from '../lib/usePullToRefresh'
import { PullIndicator } from './PullIndicator'

// Scrollable page body: safe areas, room for the tab bar and pull-to-refresh.
export function Screen({ children, gap = 16 }: { children: ReactNode; gap?: number }) {
  const scroller = useRef<HTMLDivElement>(null)
  const online = useOnline()
  const { pull, refreshing } = usePullToRefresh(scroller, online)

  return (
    <div className="relative h-full overflow-hidden">
      <PullIndicator pull={pull} refreshing={refreshing} />
      <div ref={scroller} className="h-full overflow-x-hidden overflow-y-auto overscroll-y-contain">
      <div
        className="flex min-h-full flex-col px-4 [&>*]:shrink-0 pt-[calc(env(safe-area-inset-top)+8px)] pb-[calc(env(safe-area-inset-bottom)+49px+38px)]"
        style={{
          gap,
          transform: pull ? `translateY(${pull}px)` : undefined,
          transition: pull === 0 || refreshing ? 'transform 0.2s ease-out' : undefined,
        }}
      >
        {children}
      </div>
      </div>
    </div>
  )
}
