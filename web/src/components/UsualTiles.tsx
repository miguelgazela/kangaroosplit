import { useLongPress } from '../lib/useLongPress'
import { Icon } from './Icon'
import { ShoppingIcon } from './ShoppingIcon'
import { t } from '../i18n/pt'
import type { ShoppingHistory } from '../lib/database.types'

// "Habituais": what is bought most often, as tiles in a 4-column grid. One tap
// adds the item and the tile shows a tick. Never scrolls sideways.
function Tile({
  entry,
  done,
  onAdd,
  onEdit,
  keepFocus,
  onSurface,
}: {
  entry: ShoppingHistory
  done: boolean
  onAdd: (entry: ShoppingHistory) => void
  onEdit?: (entry: ShoppingHistory) => void
  keepFocus: boolean
  onSurface: boolean
}) {
  const press = useLongPress({ onTap: () => onAdd(entry), onLongPress: () => onEdit?.(entry), delay: 450 })
  return (
    <button
      type="button"
      aria-label={done ? t.shopping.usualAdded(entry.name) : t.shopping.addUsual(entry.name)}
      aria-pressed={done}
      disabled={done}
      onMouseDown={keepFocus ? (event) => event.preventDefault() : undefined}
      {...(onEdit ? press : { onClick: () => onAdd(entry) })}
      className={`relative flex h-[76px] min-w-0 touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl px-1 ${onSurface ? 'bg-fill' : 'bg-surface shadow-card'}`}
    >
      <ShoppingIcon emoji={entry.emoji} imagePath={entry.image_path} size={36} className="bg-transparent" />
      <span className="w-full truncate text-center text-footnote leading-[14px] font-medium">{entry.name}</span>
      <span
        aria-hidden="true"
        className={`absolute top-1.5 right-1.5 flex size-[18px] items-center justify-center rounded-full ${done ? 'bg-pos text-on-pos' : 'bg-accent-soft text-link'}`}
      >
        <Icon name={done ? 'check' : 'plus'} size={11} strokeWidth={3.4} />
      </span>
    </button>
  )
}

export function UsualTiles({
  entries,
  added,
  onAdd,
  keepFocus = false,
  onSurface = false,
  onEdit,
}: {
  entries: ShoppingHistory[]
  // Names (as `name_key`) already added from this grid.
  added: ReadonlySet<string>
  onAdd: (entry: ShoppingHistory) => void
  // True when the add field has the keyboard up: tapping a tile must not close it.
  keepFocus?: boolean
  // Shown on a surface-coloured panel: tiles take the fill colour to stand out.
  onSurface?: boolean
  // Press and hold a tile to edit it.
  onEdit?: (entry: ShoppingHistory) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {entries.map((entry) => (
        <Tile
          key={entry.name_key}
          entry={entry}
          done={added.has(entry.name_key)}
          onAdd={onAdd}
          onEdit={onEdit}
          keepFocus={keepFocus}
          onSurface={onSurface}
        />
      ))}
    </div>
  )
}
