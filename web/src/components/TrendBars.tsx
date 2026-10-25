import { formatMonthShort } from '../lib/format'

// Small bar chart of monthly totals. The highlighted month, if any, is drawn
// solid; with none (a year view) every bar is.
export function TrendBars({
  points,
  highlight,
  label,
  onPick,
  height = 64,
}: {
  points: { month: string; totalCents: number }[]
  highlight?: string
  label: string
  onPick?: (month: string) => void
  height?: number
}) {
  const peak = Math.max(...points.map((point) => point.totalCents), 1)
  // Twelve bars need to be narrower than six to fit beside the total.
  const wide = points.length <= 6
  const Bar = onPick ? 'button' : 'div'

  return (
    <div className="flex gap-1" role="img" aria-label={label}>
      {points.map((point) => {
        const solid = highlight === undefined || point.month === highlight
        return (
          <Bar
            key={point.month}
            {...(onPick ? { type: 'button' as const, onClick: () => onPick(point.month) } : {})}
            className={`flex flex-col items-center gap-1 ${wide ? 'w-[18px]' : 'min-w-0 flex-1'}`}
          >
            <span className="flex w-full items-end" style={{ height }}>
              <span
                className={`w-full rounded-[4px] ${solid ? 'bg-accent' : 'bg-chart-dim'} ${point.totalCents === 0 ? 'opacity-30' : ''}`}
                style={{ height: `${Math.max((point.totalCents / peak) * 100, 4)}%` }}
              />
            </span>
            <span className={`text-[10px] ${highlight === point.month ? 'font-bold' : 'text-text-2'}`}>
              {wide ? formatMonthShort(point.month) : formatMonthShort(point.month).slice(0, 1).toUpperCase()}
            </span>
          </Bar>
        )
      })}
    </div>
  )
}
