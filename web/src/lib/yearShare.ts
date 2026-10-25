// The "Partilhar o vosso ano" image: a 1080×1920 summary card, shared with the
// Web Share API, or downloaded as a PNG where files cannot be shared.

export type ShareCard = {
  year: number
  names: string
  total: string
  expenses: string
  category: { label: string; value: string } | null
  month: { label: string; value: string } | null
  quites: string
  title: string
}

const W = 1080
const H = 1920
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

// Shrinks the font until the text fits the width.
function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number) {
  let current = size
  ctx.font = `${weight} ${current}px ${FONT}`
  while (ctx.measureText(text).width > maxWidth && current > 24) {
    current -= 4
    ctx.font = `${weight} ${current}px ${FONT}`
  }
  return current
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}

export async function renderShareImage(card: ShareCard): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // Background: the intro story's gradient and soft blobs.
  const gradient = ctx.createLinearGradient(0, 0, W * 0.6, H)
  gradient.addColorStop(0, '#7B5CFA')
  gradient.addColorStop(0.55, '#4A2FD0')
  gradient.addColorStop(1, '#2A1B7A')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = 'rgba(255,255,255,0.10)'
  ctx.beginPath()
  ctx.arc(W + 80, 120, 700, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(200,50,60,0.30)'
  ctx.beginPath()
  ctx.arc(-40, H + 40, 520, 0, Math.PI * 2)
  ctx.fill()

  const left = 96
  const width = W - left * 2
  ctx.fillStyle = '#FFFFFF'
  ctx.textBaseline = 'alphabetic'

  ctx.globalAlpha = 0.85
  ctx.font = `600 44px ${FONT}`
  ctx.fillText(card.names.toUpperCase(), left, 200)
  ctx.globalAlpha = 1
  fitText(ctx, card.title, 900, 140, width)
  ctx.fillText(card.title, left, 350)

  const guru = await loadImage(`${import.meta.env.BASE_URL}guru/sucesso.webp`)
  if (guru) ctx.drawImage(guru, (W - 380) / 2, 400, 380, 380)

  fitText(ctx, card.total, 900, 180, width)
  ctx.fillText(card.total, left, 960)
  ctx.font = `700 52px ${FONT}`
  ctx.fillStyle = '#FFC94A'
  ctx.fillText(card.expenses, left, 1040)

  // Two or three tiles: category, month, quites.
  let y = 1110
  const tile = (label: string, value: string) => {
    ctx.fillStyle = 'rgba(255,255,255,0.14)'
    roundRect(ctx, left, y, width, 200, 48)
    ctx.fillStyle = '#FFFFFF'
    ctx.globalAlpha = 0.8
    ctx.font = `600 36px ${FONT}`
    ctx.fillText(label.toUpperCase(), left + 48, y + 74)
    ctx.globalAlpha = 1
    fitText(ctx, value, 800, 64, width - 96)
    ctx.fillText(value, left + 48, y + 154)
    y += 232
  }
  if (card.category) tile(card.category.label, card.category.value)
  if (card.month) tile(card.month.label, card.month.value)

  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, left, y, width, 160, 48)
  ctx.fillStyle = '#1F7A4D'
  fitText(ctx, card.quites, 800, 56, width - 96)
  ctx.fillText(card.quites, left + 48, y + 100)

  ctx.fillStyle = '#FFFFFF'
  ctx.globalAlpha = 0.75
  ctx.font = `700 44px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('KangarooSplit 🦘', W / 2, H - 70)
  ctx.globalAlpha = 1

  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png'),
  )
}

// Shares the image as a file; downloads it when the browser cannot share files.
export async function shareYear(card: ShareCard, shareTitle: string): Promise<void> {
  const blob = await renderShareImage(card)
  const name = `kangaroosplit-${card.year}.png`
  const file = new File([blob], name, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: shareTitle })
      return
    } catch (error) {
      // Closing the share sheet is not an error.
      if (error instanceof DOMException && error.name === 'AbortError') return
      throw error
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
