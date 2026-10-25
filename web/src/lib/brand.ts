import { applyAccent } from '../theme/colors'

// The signed-in person's profile colour drives every accent in the app (see
// theme/colors.ts and theme/tokens.css). It is cached on the device so the right
// colour is there on launch, before the profile has loaded.

const STORAGE_KEY = 'kangaroosplit-brand'
const HEX = /^#[0-9a-f]{6}$/i

function set(color: string | null): void {
  applyAccent(color && HEX.test(color) ? color : null)
}

// Pass null to go back to the default (signed out).
export function applyBrand(color: string | null): void {
  set(color)
  try {
    if (color && HEX.test(color)) localStorage.setItem(STORAGE_KEY, color)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private mode: the colour is simply applied a moment later on next launch.
  }
}

export function restoreBrand(): void {
  try {
    set(localStorage.getItem(STORAGE_KEY))
  } catch {
    // Nothing cached to restore.
  }
}
