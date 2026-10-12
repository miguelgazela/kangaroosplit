import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppProviders } from './AppProviders.tsx'
import { restoreBrand } from './lib/brand.ts'

// Before first paint, so the app never flashes the default colour.
restoreBrand()

// The page itself never scrolls, but iOS still shifts it to bring a focused
// field above the keyboard, and can leave it shifted once the keyboard closes,
// cutting off the top of the screen. Put it back when no field has focus.
document.addEventListener('focusout', () => {
  setTimeout(() => {
    const focused = document.activeElement
    if (!(focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)) window.scrollTo(0, 0)
  }, 100)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
)
