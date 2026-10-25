import { Link } from 'react-router-dom'
import { Icon } from './Icon'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex h-11 items-center gap-0.5 pr-2 text-body text-link">
      <Icon name="chevronLeft" strokeWidth={2.4} />
      {label}
    </Link>
  )
}
