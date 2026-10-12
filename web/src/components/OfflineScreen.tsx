import { t } from '../i18n/pt'
import { Icon } from './Icon'

// Covers the whole app while there is no connection. Nothing works offline,
// so say so plainly instead of showing data that cannot be trusted or changed.
export function OfflineScreen() {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-bg px-8 text-center"
      style={{ animation: 'ks-fade-in 0.2s ease-out' }}
    >
      <div className="flex size-[104px] items-center justify-center rounded-full bg-warn-soft text-warn">
        <Icon name="offline" size={44} strokeWidth={1.8} />
      </div>
      <h1 className="mt-2 text-title2 font-bold">{t.system.offlineTitle}</h1>
      <p className="max-w-[300px] text-body leading-[23px] text-text-2">{t.system.offlineBody}</p>
    </div>
  )
}
