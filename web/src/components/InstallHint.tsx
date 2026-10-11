import { useState } from 'react'
import { t } from '../i18n/pt'
import { isIOS, isStandalone, readFlag, writeFlag } from '../lib/platform'
import { AppIcon } from './AppIcon'
import { Icon } from './Icon'

const DISMISSED_KEY = 'kangaroosplit-install-dismissed'

// Shown in Safari on iOS, where the app only works properly (fullscreen,
// notifications) once added to the home screen.
export function InstallHint() {
  const [visible, setVisible] = useState(() => isIOS() && !isStandalone() && !readFlag(DISMISSED_KEY))
  if (!visible) return null

  return (
    <div
      role="note"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+18px)] z-[70] flex items-start gap-3 rounded-[22px] bg-surface py-4 pr-3 pl-4 shadow-[0_12px_40px_rgba(17,17,20,0.22)]"
      style={{ animation: 'ks-toast-in 0.25s ease-out' }}
    >
      <AppIcon size={44} className="flex-none rounded-[11px]" />
      <p className="flex-1 text-subhead leading-[21px]">
        <strong className="mb-0.5 block text-headline">{t.install.title}</strong>
        {t.install.before}{' '}
        <span role="img" aria-label={t.install.shareIcon} className="inline-block align-[-3px] text-[#2563EB]">
          <Icon name="share" size={18} />
        </span>{' '}
        {t.install.after}
      </p>
      <button
        type="button"
        aria-label={t.actions.close}
        onClick={() => {
          writeFlag(DISMISSED_KEY)
          setVisible(false)
        }}
        className="-mt-2.5 -mr-1.5 flex size-11 flex-none items-center justify-center text-text-2"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-bg">
          <Icon name="close" size={12} strokeWidth={3} />
        </span>
      </button>
      <span aria-hidden="true" className="absolute -bottom-[9px] left-1/2 size-[18px] -translate-x-1/2 rotate-45 rounded-[3px] bg-surface" />
    </div>
  )
}
