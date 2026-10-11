import { useState } from 'react'
import { ColorSwatches } from '../components/ColorSwatches'
import { Sheet } from '../components/Sheet'
import { useToast } from '../components/ToastContext'
import { t } from '../i18n/pt'
import type { Category } from '../lib/database.types'
import { OfflineError } from '../lib/online'
import { SWATCHES } from '../lib/palette'
import { useCategories, useCreateCategory, useSetCategoryArchived, useUpdateCategory } from '../query/hooks'

const ICONS = [
  '🛒', '🏠', '💡', '🍽️', '🚗', '✈️', '💊', '🎉',
  '📦', '☕', '🍺', '👕', '🎁', '🐱', '🐶', '📱',
  '🎬', '🏋️', '📚', '🔧', '🧹', '💇', '👶', '🌱',
]

export function CategorySheet({ category, onClose }: { category?: Category; onClose: () => void }) {
  const toast = useToast()
  const { data: categories } = useCategories()
  const create = useCreateCategory()
  const update = useUpdateCategory()
  const setArchived = useSetCategoryArchived()

  const [name, setName] = useState(category?.name ?? '')
  const [icon, setIcon] = useState(category?.icon ?? ICONS[8])
  const [color, setColor] = useState(category?.color ?? SWATCHES[3])

  const pending = create.isPending || update.isPending || setArchived.isPending
  const trimmed = name.trim()
  const duplicate = (categories ?? []).some(
    (other) => other.id !== category?.id && other.name.toLowerCase() === trimmed.toLowerCase(),
  )
  const archived = category?.archived_at != null

  const fail = (error: unknown) =>
    toast({ kind: 'error', message: error instanceof OfflineError ? t.system.offline : t.system.error })
  const done = () => {
    toast({ message: t.categories.saved })
    onClose()
  }

  const onSave = () => {
    const input = { name: trimmed, icon, color }
    if (category) update.mutate({ id: category.id, patch: input }, { onSuccess: done, onError: fail })
    else create.mutate(input, { onSuccess: done, onError: fail })
  }

  return (
    <Sheet
      title={category ? t.categories.edit : t.categories.create}
      onCancel={onClose}
      action={{ label: t.actions.save, onClick: onSave, disabled: trimmed === '' || duplicate || pending }}
    >
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className={`flex flex-none items-center gap-3.5 rounded-card bg-surface px-4 py-3 ${duplicate ? 'ring-[1.5px] ring-danger ring-inset' : ''}`}>
          <span
            className="flex size-[60px] flex-none items-center justify-center rounded-[18px] text-[32px]"
            style={{ background: `${color}26` }}
          >
            {icon}
          </span>
          <label className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-footnote text-text-2">{t.categories.name}</span>
            <input
              type="text"
              value={name}
              maxLength={30}
              autoFocus={!category}
              onChange={(event) => setName(event.target.value)}
              className="min-w-0 bg-transparent p-0 text-xl font-semibold text-text outline-none"
            />
          </label>
        </div>
        {duplicate && <p className="-mt-1 px-1 text-footnote text-danger">{t.categories.duplicate}</p>}

        <div className="flex-none rounded-card bg-surface px-2.5 pt-3 pb-2.5">
          <span className="block px-1.5 pb-1.5 text-footnote text-text-2">{t.categories.icon}</span>
          <div role="radiogroup" aria-label={t.categories.icon} className="grid grid-cols-8">
            {(ICONS.includes(icon) ? ICONS : [icon, ...ICONS.slice(0, -1)]).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={option === icon}
                aria-label={option}
                onClick={() => setIcon(option)}
                className="flex h-11 items-center justify-center"
              >
                <span
                  className={`flex size-[38px] items-center justify-center rounded-xl text-[22px] ${option === icon ? 'bg-accent-soft ring-2 ring-accent ring-inset' : ''}`}
                >
                  {option}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-none rounded-card bg-surface px-4 pt-3 pb-3.5">
          <span className="block pb-2.5 text-footnote text-text-2">{t.categories.color}</span>
          <ColorSwatches label={t.categories.color} value={color} onChange={setColor} />
        </div>

        {category && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              setArchived.mutate({ id: category.id, archived: !archived }, { onSuccess: done, onError: fail })
            }
            className="h-[50px] flex-none rounded-card bg-surface text-body text-accent-text"
          >
            {archived ? t.categories.unarchive : t.categories.archive}
          </button>
        )}
      </div>
    </Sheet>
  )
}
