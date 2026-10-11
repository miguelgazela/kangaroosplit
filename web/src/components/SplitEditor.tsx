import { t } from '../i18n/pt'
import type { Member, SplitMode } from '../lib/database.types'
import { formatMoney } from '../lib/format'
import { nameForms } from '../lib/people'
import type { SplitResult } from '../lib/split'
import { changeMode, changeText, splitStatus, type SplitForm } from '../lib/splitForm'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Segmented } from './Segmented'

const MODES: { id: SplitMode; label: string }[] = [
  { id: 'equal', label: t.split.equal },
  { id: 'percent', label: t.split.percent },
  { id: 'exact', label: t.split.exact },
  { id: 'shares', label: t.split.shares },
]

export function SplitEditor({
  form,
  result,
  members,
  amountCents,
  onChange,
}: {
  form: SplitForm
  result: SplitResult
  members: Member[]
  amountCents: number
  onChange: (form: SplitForm) => void
}) {
  const invalid = !result.ok

  // Right-hand column: the resulting amount, or for exact amounts the percentage.
  const outcome = (index: number): string => {
    if (!result.ok) return ''
    const cents = result.shares[index].share_cents
    if (form.mode !== 'exact') return formatMoney(cents)
    return amountCents === 0 ? '' : `${Math.round((cents * 100) / amountCents)} %`
  }

  const step = (index: number, delta: number) => {
    const next = Math.max(0, (Number(form.texts[index]) || 0) + delta)
    onChange({ ...form, texts: form.texts.map((text, position) => (position === index ? String(next) : text)) })
  }

  return (
    <div className="flex flex-col gap-1.5 px-4 pb-3">
      <Segmented
        label={t.split.mode}
        options={MODES}
        value={form.mode}
        onChange={(mode) => onChange(changeMode(form, mode, members, amountCents))}
      />

      {members.map((member, index) => (
        <div key={member.user_id} className="flex h-[54px] items-center gap-2.5 border-b-[0.5px] border-separator">
          <Avatar member={member} size={32} />
          <span className="min-w-0 flex-1 truncate text-body">{member.display_name}</span>

          {(form.mode === 'percent' || form.mode === 'exact') && (
            <label
              className={`flex h-10 min-w-[92px] items-center gap-0.5 rounded-control border-[1.5px] bg-fill px-2.5 ${invalid ? 'border-danger' : 'border-transparent'}`}
            >
              <input
                type="text"
                inputMode="decimal"
                aria-label={t.split.shareOf(nameForms(member).of)}
                value={form.texts[index] ?? ''}
                onChange={(event) => onChange(changeText(form, index, event.target.value, amountCents))}
                onFocus={(event) => event.target.select()}
                className="w-16 bg-transparent text-right text-body font-semibold text-text tabular-nums outline-none"
              />
              <span className="text-body text-text-2">{form.mode === 'percent' ? '%' : '€'}</span>
            </label>
          )}

          {form.mode === 'shares' && (
            <div className="flex h-10 items-center rounded-control bg-fill">
              <button
                type="button"
                aria-label={t.split.fewer(member.display_name)}
                onClick={() => step(index, -1)}
                className="h-10 w-11 text-[22px] text-accent-text"
              >
                −
              </button>
              <span className="min-w-5 text-center text-body font-semibold tabular-nums">{form.texts[index]}</span>
              <button
                type="button"
                aria-label={t.split.more(member.display_name)}
                onClick={() => step(index, 1)}
                className="h-10 w-11 text-[22px] text-accent-text"
              >
                +
              </button>
            </div>
          )}

          <span className="min-w-[74px] text-right text-subhead font-medium text-text-2 tabular-nums">
            {outcome(index)}
          </span>
        </div>
      ))}

      <div role="status" className={`flex min-h-[30px] items-center gap-1.5 pt-1 text-footnote ${invalid ? 'text-danger' : 'text-text-2'}`}>
        <Icon name={invalid ? 'alert' : 'check'} size={16} strokeWidth={2.4} className="flex-none" />
        <span>{splitStatus(form, result, amountCents)}</span>
      </div>
    </div>
  )
}
