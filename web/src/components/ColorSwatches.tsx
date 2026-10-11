import { SWATCHES } from '../lib/palette'

export function ColorSwatches({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}) {
  const options = SWATCHES.some((swatch) => swatch.toLowerCase() === value.toLowerCase()) ? SWATCHES : [value, ...SWATCHES]
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-3">
      {options.map((swatch) => {
        const active = swatch.toLowerCase() === value.toLowerCase()
        return (
          <button
            key={swatch}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={swatch}
            disabled={disabled}
            onClick={() => onChange(swatch)}
            className="flex size-11 items-center justify-center rounded-full"
            style={active ? { boxShadow: `0 0 0 2px var(--ks-surface), 0 0 0 4px ${swatch}` } : undefined}
          >
            <span className="size-[34px] rounded-full" style={{ background: swatch }} />
          </button>
        )
      })}
    </div>
  )
}
