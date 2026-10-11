import { t } from '../i18n/pt'

// A coin dropping into a pouch.
export function AppIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={t.appName} className={className}>
      <rect width="100" height="100" rx="22" fill="#6847F0" />
      <circle cx="50" cy="36" r="15" fill="#FFC94A" />
      <circle cx="50" cy="36" r="10.5" fill="none" stroke="#E0A21A" strokeWidth="2" />
      <path d="M21 46h58v8c0 17-13 29-29 29S21 71 21 54z" fill="#FFFFFF" />
      <path d="M28 54h44" stroke="#C9BCFB" strokeWidth="2.4" strokeDasharray="4 4" strokeLinecap="round" />
    </svg>
  )
}
