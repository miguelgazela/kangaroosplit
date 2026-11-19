import { useLongPress } from '../lib/useLongPress'
import { Icon } from './Icon'
import { ShoppingIcon } from './ShoppingIcon'
import { t } from '../i18n/pt'
import type { Member, ShoppingItem } from '../lib/database.types'
import { initials, nameForms } from '../lib/people'

// One item on the list. The whole row ticks it; the icon, or pressing and
// holding the row, opens the item.
export function ShoppingRow({
  item,
  first,
  partner,
  onToggle,
  onOpen,
}: {
  item: ShoppingItem
  first: boolean
  partner: Member
  onToggle: () => void
  onOpen: () => void
}) {
  const done = item.checked_at !== null
  const byPartner = item.added_by === partner.user_id
  const press = useLongPress({ onTap: onToggle, onLongPress: onOpen })
  return (
    <div
      className={`relative transition-colors duration-150 motion-reduce:transition-none ${done ? 'bg-pos-soft' : ''} ${first ? '' : 'border-t-[0.5px] border-separator'}`}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={t.shopping.check(item.name, item.quantity, done)}
        {...press}
        className="flex min-h-[60px] w-full touch-manipulation items-center gap-3 pr-3 pl-3 text-left"
      >
        <span
          aria-hidden="true"
          className={`flex size-7 flex-none items-center justify-center rounded-full transition-colors duration-150 motion-reduce:transition-none ${done ? 'bg-pos text-on-pos' : 'border-2 border-checkbox-off'}`}
        >
          {done && <Icon name="check" size={16} strokeWidth={3.4} />}
        </span>
        <span className="size-11 flex-none" />
        <span className={`flex min-w-0 flex-1 flex-col justify-center ${done ? 'text-text-2' : ''}`}>
          <span className="flex items-baseline gap-1.5">
            <span className={`truncate text-body ${done ? 'line-through' : ''}`}>{item.name}</span>
            {item.quantity > 1 && (
              <span className="text-subhead font-semibold text-text-2">×{item.quantity}</span>
            )}
          </span>
          {item.note && <span className="truncate text-footnote text-text-2">{item.note}</span>}
        </span>
        {byPartner && (
          <span
            title={nameForms(partner).name}
            className={`flex size-[22px] flex-none items-center justify-center rounded-full text-[9px] font-bold text-white ${done ? 'opacity-55' : ''}`}
            style={{ background: partner.color }}
          >
            {initials(partner.display_name)}
          </span>
        )}
      </button>
      <button
        type="button"
        aria-label={t.shopping.rowOpen(item.name)}
        onClick={onOpen}
        className="absolute top-1/2 left-[52px] flex size-11 -translate-y-1/2 touch-manipulation items-center justify-center"
      >
        <ShoppingIcon emoji={item.emoji} imagePath={item.image_path} size={44} dim={done} />
      </button>
    </div>
  )
}
