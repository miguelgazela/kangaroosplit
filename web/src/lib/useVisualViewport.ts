import { useEffect, useState } from 'react'

// The part of the screen that is really visible: it shrinks when the keyboard
// opens and its top moves when iOS scrolls the page to reveal a field. Fixed
// elements that must sit on top of the keyboard follow this box.
export function useVisualViewport(active: boolean): { top: number; height: number } | null {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!active || !viewport) return
    const update = () => setBox({ top: Math.round(viewport.offsetTop), height: Math.round(viewport.height) })
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [active])

  return active ? box : null
}
