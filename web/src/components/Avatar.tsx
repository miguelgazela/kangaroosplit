import type { Member } from '../lib/database.types'
import { initials } from '../lib/people'

export function Avatar({
  member,
  size = 36,
  className = '',
}: {
  member: Member
  size?: number
  className?: string
}) {
  return (
    <span
      className={`flex flex-none items-center justify-center rounded-full font-semibold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.39, background: member.color }}
    >
      {initials(member.display_name)}
    </span>
  )
}
