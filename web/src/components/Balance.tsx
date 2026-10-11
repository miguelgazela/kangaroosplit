import { formatMoney } from '../lib/format'
import { Icon } from './Icon'

// Direction is never shown by colour alone: callers pair this with a text
// label, and the arrow points down-left (you receive) or up-right (you pay).
export function BalanceAmount({
  cents,
  className = '',
  iconSize = 14,
}: {
  cents: number
  className?: string
  iconSize?: number
}) {
  const tone = cents > 0 ? 'text-pos' : cents < 0 ? 'text-neg' : 'text-text-2'
  const icon = cents > 0 ? 'arrowDownLeft' : cents < 0 ? 'arrowUpRight' : 'check'
  return (
    <span className={`flex items-center gap-1 font-semibold tabular-nums ${tone} ${className}`}>
      <Icon name={icon} size={iconSize} strokeWidth={3} />
      {formatMoney(Math.abs(cents))}
    </span>
  )
}
