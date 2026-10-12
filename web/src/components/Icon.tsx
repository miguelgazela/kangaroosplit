// Stroke icons taken from the mockups (24 × 24 grid).
const paths = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  activity: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7v5l3 2',
  stats: 'M5 20V12M12 20V5M19 20v-9M3 20h18',
  settings:
    'M12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  plus: 'M12 5v14M5 12h14',
  // You receive.
  arrowDownLeft: 'M17 7 7 17M7 8v9h9',
  // You pay.
  arrowUpRight: 'M7 17 17 7M8 7h9v9',
  arrowRight: 'M3 12h15M13 7l5 5-5 5',
  check: 'm5 12 5 5 9-10',
  settle: 'M7 7h12l-4-4M17 17H5l4 4',
  archive: 'M3 4h18v4H3zM5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4',
  chevronRight: 'm9 6 6 6-6 6',
  chevronLeft: 'm15 5-7 7 7 7',
  chevronDown: 'm6 9 6 6 6-6',
  search: 'M11 4a7 7 0 1 0 0 14a7 7 0 1 0 0-14M20 20l-3.5-3.5',
  filter: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5a2 2 0 1 0 0 4a2 2 0 1 0 0-4M10 15a2 2 0 1 0 0 4a2 2 0 1 0 0-4',
  repeat: 'M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3',
  offline:
    'M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 10.5 5.1M5 12.6a10 10 0 0 1 5.2-2.6M19 12.6a10 10 0 0 0-2.3-1.6M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18',
  alert: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7.5v5.5M12 16.5h.01',
  close: 'M6 6l12 12M18 6 6 18',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7',
  paperclip: 'M21 11.5l-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.5 8.5a1.8 1.8 0 0 1-2.6-2.6l7.8-7.8',
  share: 'M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  restore: 'M4 12a8 8 0 1 0 2.6-5.9M4 4v5h5',
  list: 'M5 7h14M5 12h14M5 17h9',
  pause: 'M9 6v12M15 6v12',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
  backspace: 'M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM17 9.5l-5 5M12 9.5l5 5',
} as const

export type IconName = keyof typeof paths

export function Icon({
  name,
  size = 24,
  strokeWidth = 2,
  className,
}: {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  )
}
