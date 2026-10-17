import { useState } from 'react'
import { t } from '../i18n/pt'
import { useOnline } from '../lib/online'
import { nameForms } from '../lib/people'
import { isStandalone, readFlag, writeFlag } from '../lib/platform'
import { usePush } from '../lib/usePush'
import { useWhatsNew } from '../lib/whatsNew'
import { useCurrentMember } from '../query/hooks'
import { Guru } from './Guru'
import { Icon } from './Icon'
import { useToast } from './ToastContext'

const DISMISSED_KEY = 'kangaroosplit-notifications-dismissed'

// Explains why before the system permission dialog, which can only be shown
// once: a refusal there is permanent short of a trip to iOS Settings.
export function NotificationPrompt() {
  const online = useOnline()
  const toast = useToast()
  const { partner } = useCurrentMember()
  const { state, busy, enable } = usePush()
  const [dismissed, setDismissed] = useState(() => readFlag(DISMISSED_KEY))
  // What's new goes first; this follows once it is closed.
  const { pending: whatsNew } = useWhatsNew()

  if (!partner || !online || !isStandalone() || state !== 'off' || dismissed || whatsNew) return null

  const close = () => {
    writeFlag(DISMISSED_KEY)
    setDismissed(true)
  }

  const onEnable = async () => {
    try {
      const next = await enable()
      if (next === 'on') toast({ message: t.notifications.enabled })
      else if (next === 'blocked') toast({ kind: 'error', message: t.notifications.blocked })
    } catch {
      toast({ kind: 'error', message: t.system.error })
    }
    close()
  }

  return (
    <div className="fixed inset-0 z-30" style={{ animation: 'ks-fade-in 0.2s ease-out' }}>
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notifications-title"
        className="absolute inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+8px)] flex flex-col items-center gap-3 rounded-[32px] bg-surface px-[22px] pt-7 pb-[22px] text-center"
        style={{ animation: 'ks-sheet-in 0.28s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
      >
        <div className="relative -mt-2 flex h-40 w-[150px] items-end justify-center">
          <Guru pose="ola" size={132} decorative />
          <span className="absolute top-[18px] right-0.5 flex size-10 items-center justify-center rounded-full border-[3px] border-surface bg-accent text-white">
            <Icon name="bell" size={20} strokeWidth={2.2} />
          </span>
        </div>
        <h2 id="notifications-title" className="mt-1 text-title2 font-bold">
          {t.notifications.promptTitle}
        </h2>
        <p className="max-w-[300px] text-body leading-[23px] text-text-2">
          {t.notifications.promptBody(nameForms(partner).subject)}
        </p>
        <div className="mt-2 flex w-full flex-col gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void onEnable()}
            className="h-[52px] rounded-cta bg-accent text-body font-semibold text-white disabled:opacity-60"
          >
            {t.notifications.enable}
          </button>
          <button type="button" onClick={close} className="h-12 rounded-cta text-body text-accent-text">
            {t.notifications.notNow}
          </button>
        </div>
      </div>
    </div>
  )
}
