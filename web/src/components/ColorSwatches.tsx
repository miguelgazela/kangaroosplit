import { SWATCHES } from '../lib/palette'

export type Swatch = { hex: string; label: string }
// A colour another person already has: shown dimmed with their initials.
export type TakenSwatch = { hex: string; label: string; mark: string }

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export function ColorSwatches({
  label,
  value,
  onChange,
  disabled = false,
  options = SWATCHES.map((hex) => ({ hex, label: hex })),
  taken,
  describedBy,
}: {
  label: string
  value: string
  onChange: (color: string) => void
  disabled?: boolean
  options?: Swatch[]
  taken?: TakenSwatch
  describedBy?: string
}) {
  // A current value outside the list stays selectable, first.
  const list = options.some((option) => same(option.hex, value)) ? options : [{ hex: value, label: value }, ...options]
  return (
    <div role="radiogroup" aria-label={label} aria-describedby={describedBy} className="-mx-1.5 flex flex-wrap gap-x-0.5 gap-y-2">
      {list.map((option) => {
        const active = same(option.hex, value)
        const isTaken = !active && taken !== undefined && same(option.hex, taken.hex)
        return (
          <button
            key={option.hex}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={isTaken ? taken.label : option.label}
            disabled={disabled || isTaken}
            onClick={() => onChange(option.hex)}
            className="flex size-11 items-center justify-center rounded-full"
          >
            <span
              className={`flex size-[34px] items-center justify-center rounded-full text-[10px] font-bold text-white ${isTaken ? 'opacity-45' : ''}`}
              style={{
                background: option.hex,
                boxShadow: active ? `0 0 0 2px var(--ks-surface), 0 0 0 4px ${option.hex}` : undefined,
              }}
            >
              {isTaken ? taken.mark : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
