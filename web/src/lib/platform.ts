// Launched from the home screen rather than a browser tab.
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && navigator.standalone === true)
  )
}

export function isIOS(): boolean {
  // iPadOS reports itself as a Mac, but only it has a touch screen.
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, '1')
  } catch {
    // Private mode: the choice just does not stick.
  }
}
