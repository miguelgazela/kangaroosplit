import { useState } from 'react'
import { DateRow } from '../components/DateRow'
import { Segmented } from '../components/Segmented'
import { Sheet } from '../components/Sheet'
import { t } from '../i18n/pt'
import type { Category, Member } from '../lib/database.types'

export type ListFilter = {
  categoryId?: string
  paidBy?: string
  from?: string
  to?: string
}

const ANYONE = 'anyone'

export function FilterSheet({
  filter,
  categories,
  me,
  partner,
  onApply,
  onClose,
}: {
  filter: ListFilter
  categories: Category[]
  me: Member
  partner: Member
  onApply: (filter: ListFilter) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(filter)
  const patch = (change: ListFilter) => setDraft((current) => ({ ...current, ...change }))
  const hasAny = Object.values(draft).some(Boolean)
  // Archived categories stay selectable: old expenses still use them.
  const datesInvalid = draft.from !== undefined && draft.to !== undefined && draft.from > draft.to

  return (
    <Sheet title={t.filter.title} onCancel={onClose} action={{ label: t.filter.apply, onClick: () => onApply(draft), disabled: datesInvalid }}>
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="flex-none rounded-card bg-surface px-4 pt-3 pb-3.5">
          <span className="block pb-2.5 text-footnote text-text-2">{t.filter.category}</span>
          <div role="radiogroup" aria-label={t.filter.category} className="flex flex-wrap gap-2">
            {categories.map((category) => {
              const active = draft.categoryId === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => patch({ categoryId: active ? undefined : category.id })}
                  className={`h-9 rounded-full px-3 text-subhead ${active ? 'bg-accent font-semibold text-white' : 'bg-fill'}`}
                >
                  {category.icon} {category.name}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-none flex-col gap-2 rounded-card bg-surface px-4 py-3">
          <span className="text-footnote text-text-2">{t.filter.payer}</span>
          <Segmented
            label={t.filter.payer}
            options={[
              { id: ANYONE, label: t.filter.anyone },
              { id: me.user_id, label: t.filter.you },
              { id: partner.user_id, label: partner.display_name },
            ]}
            value={draft.paidBy ?? ANYONE}
            onChange={(id) => patch({ paidBy: id === ANYONE ? undefined : id })}
          />
        </div>

        <div className={`flex-none overflow-hidden rounded-card bg-surface ${datesInvalid ? 'ring-[1.5px] ring-danger ring-inset' : ''}`}>
          <DateRow label={t.filter.from} value={draft.from ?? null} onChange={(value) => patch({ from: value ?? undefined })} optional />
          <DateRow label={t.filter.to} value={draft.to ?? null} onChange={(value) => patch({ to: value ?? undefined })} optional border />
        </div>
        {datesInvalid && <p className="-mt-1 px-1 text-footnote text-danger">{t.listEditor.datesInvalid}</p>}

        {hasAny && (
          <button type="button" onClick={() => setDraft({})} className="h-[50px] flex-none rounded-card bg-surface text-body text-accent-text">
            {t.filter.clear}
          </button>
        )}
      </div>
    </Sheet>
  )
}
