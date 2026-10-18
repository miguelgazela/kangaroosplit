import { useRef, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Highlight } from '../data/changelog'
import { t } from '../i18n/pt'
import { useWhatsNew } from '../lib/whatsNew'
import { Guru } from './Guru'
import { Icon } from './Icon'

const TONES: Record<Highlight['tone'], CSSProperties> = {
  accent: { background: 'var(--color-accent-soft)', color: 'var(--color-accent-text)' },
  teal: { background: 'var(--ks-teal-bg)', color: 'var(--ks-teal-fg)' },
  orange: { background: 'var(--ks-orange-bg)', color: 'var(--ks-orange-fg)' },
}

// Shown once, over Início, on the first launch after an update that has
// highlights. Closes with the ×, a tap outside or a swipe down.
export function WhatsNewSheet() {
  const navigate = useNavigate()
  const { pending, dismiss } = useWhatsNew()
  const [drag, setDrag] = useState(0)
  const startY = useRef<number | null>(null)

  if (!pending) return null

  const seeAll = () => {
    dismiss()
    navigate('/novidades')
  }

  return (
    <div className="fixed inset-0 z-40" style={{ animation: 'ks-fade-in 0.2s ease-out' }}>
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" onClick={dismiss} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
        className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+8px)] flex flex-col items-center gap-2.5 rounded-[32px] bg-surface px-5 pt-6 pb-3"
        style={{
          animation: 'ks-sheet-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
          transform: drag ? `translateY(${drag}px)` : undefined,
          transition: drag ? undefined : 'transform 0.2s ease-out',
        }}
        onTouchStart={(event) => {
          startY.current = event.touches[0].clientY
        }}
        onTouchMove={(event) => {
          if (startY.current !== null) setDrag(Math.max(0, event.touches[0].clientY - startY.current))
        }}
        onTouchEnd={() => {
          if (drag > 80) dismiss()
          setDrag(0)
          startY.current = null
        }}
      >
        <button
          type="button"
          aria-label={t.whatsNew.close}
          onClick={dismiss}
          className="absolute top-2.5 right-2.5 flex size-11 items-center justify-center"
        >
          <span className="flex size-[30px] items-center justify-center rounded-full bg-fill text-text-2">
            <Icon name="close" size={14} strokeWidth={3} />
          </span>
        </button>

        <div className="relative -mt-1.5 flex h-[98px] w-32 items-end justify-center">
          <Guru pose="sucesso" size={96} decorative />
          <span className="absolute -top-0 -right-1 box-content flex h-7 items-center rounded-[17px] border-[3px] border-surface bg-accent px-2.5 text-xs font-bold text-white">
            {pending.version}
          </span>
        </div>
        <h2 id="whats-new-title" className="mt-0.5 text-[22px] font-bold">
          {t.whatsNew.title}
        </h2>

        <ul className="mt-1 flex w-full flex-col gap-1">
          {pending.highlights.map((highlight) => (
            <li key={highlight.title} className="flex items-start gap-3 px-1 py-2">
              <span
                aria-hidden="true"
                className="flex size-10 flex-none items-center justify-center rounded-xl"
                style={TONES[highlight.tone]}
              >
                <Icon name={highlight.icon} size={22} />
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-base font-semibold">{highlight.title}</span>
                <span className="text-sm leading-[19px] text-text-2">{highlight.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <button type="button" onClick={seeAll} className="h-11 w-full rounded-cta text-[15px] font-semibold text-accent-text">
          {t.whatsNew.seeAll}
        </button>
      </div>
    </div>
  )
}
