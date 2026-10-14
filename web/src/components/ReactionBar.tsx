import { t } from '../i18n/pt'
import type { Member } from '../lib/database.types'
import { REACTIONS } from '../lib/social'
import { nameForms } from '../lib/people'
import { Avatar } from './Avatar'

// The six reactions. One per person: yours has an accent ring, the other
// person's carries their small avatar.
export function ReactionBar({
  mine,
  theirs,
  partner,
  disabled,
  variant,
  onPick,
}: {
  mine: string | null
  theirs: string | null
  partner: Member
  disabled: boolean
  // 'card': full-width row on the detail sheet. 'pill': floating bar over a list row.
  variant: 'card' | 'pill'
  onPick: (emoji: string) => void
}) {
  const card = variant === 'card'
  const subject = nameForms(partner).subject
  return (
    <div
      role="group"
      aria-label={t.detail.reactions}
      className={
        card
          ? 'grid grid-cols-6 gap-0.5 rounded-[18px] bg-surface p-1.5 shadow-card'
          : 'flex gap-0.5 rounded-full bg-surface p-[5px] shadow-[0_10px_30px_rgba(17,17,20,0.18)]'
      }
    >
      {REACTIONS.map(({ emoji, name }) => {
        const isMine = emoji === mine
        const isTheirs = emoji === theirs
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            aria-pressed={isMine}
            aria-label={`${t.detail.reactWith(name)}${isMine ? ` ${t.detail.yourReaction}` : ''}${isTheirs ? ` ${t.detail.theirReaction(subject)}` : ''}`}
            onClick={() => onPick(emoji)}
            className={`relative flex items-center justify-center disabled:opacity-50 ${
              card ? 'h-12 rounded-[13px] text-2xl' : 'size-[46px] rounded-full text-[25px]'
            } ${isMine ? 'bg-accent-soft shadow-[inset_0_0_0_2px_var(--ks-accent)]' : ''}`}
          >
            {emoji}
            {isTheirs && (
              <span aria-hidden="true" className="absolute right-0.5 bottom-0.5 rounded-full border-2 border-surface">
                <Avatar member={partner} size={card ? 18 : 16} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
