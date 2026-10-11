// iOS segmented control.
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-control bg-fill p-[3px]">
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.id)}
            className={`h-[34px] flex-auto rounded-lg px-2 text-footnote whitespace-nowrap ${active ? 'bg-segment-on font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.12)]' : 'font-medium'}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
