import type { CSSProperties } from 'react'

// A grey placeholder block for content that is still loading. Size and
// radius come from `className`; it pulses unless reduced motion is on.
export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={`ks-skel flex-none bg-skeleton ${className}`} style={style} />
}
