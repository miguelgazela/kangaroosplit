import { t } from '../i18n/pt'
import { todayISO } from '../lib/dates'
import { formatISODate } from '../lib/format'
import { Icon } from './Icon'

// A form row showing a date as a chip. Tapping it opens the system date
// picker, which sits invisibly over the row.
export function DateRow({
  label,
  value,
  onChange,
  optional = false,
  chevron = false,
  border = false,
}: {
  label: string
  value: string | null
  onChange: (value: string | null) => void
  // Optional dates show "Sem data" and can be cleared.
  optional?: boolean
  chevron?: boolean
  border?: boolean
}) {
  const text = value === null ? t.listEditor.noDate : value === todayISO() ? t.expense.today : formatISODate(value)

  return (
    <div className={`flex h-12 items-center ${border ? 'border-t-[0.5px] border-separator' : ''}`}>
      <label className="relative flex h-full min-w-0 flex-1 items-center gap-2 pr-3 pl-4">
        <span className="min-w-0 flex-1 truncate text-body">{label}</span>
        <span className={`rounded-full bg-fill px-2.5 py-[5px] text-subhead ${value === null ? 'text-text-2' : ''}`}>
          {text}
        </span>
        {chevron && <Icon name="chevronRight" size={14} strokeWidth={2.5} className="text-text-2" />}
        <input
          type="date"
          aria-label={label}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value || null)}
          onClick={(event) => {
            // Open the picker outright; a tap alone does not always do it for an
            // invisible field.
            try {
              event.currentTarget.showPicker()
            } catch {
              // Not supported or not allowed here: the tap's default still applies.
            }
          }}
          className="absolute inset-0 size-full opacity-0"
        />
      </label>
      {optional && value !== null && (
        <button
          type="button"
          aria-label={t.listEditor.clearDate}
          onClick={() => onChange(null)}
          className="-ml-2 flex size-11 flex-none items-center justify-center text-text-2"
        >
          <Icon name="close" size={16} strokeWidth={2.4} />
        </button>
      )}
    </div>
  )
}
