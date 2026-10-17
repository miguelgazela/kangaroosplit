import { PULL_THRESHOLD } from '../lib/usePullToRefresh'

// The spinner that drops in while pulling. `light` is for use over a coloured header.
export function PullIndicator({ pull, refreshing, light = false }: { pull: number; refreshing: boolean; light?: boolean }) {
  return (
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
        className={`size-6 rounded-full border-[2.5px] border-t-transparent ${light ? 'border-white' : 'border-accent'}`}
        style={refreshing ? { animation: 'ks-spin 0.7s linear infinite' } : { transform: `rotate(${pull * 4}deg)` }}
      />
    </div>
  )
}
