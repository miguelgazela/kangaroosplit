import { supabase, unwrap } from './supabase'

const BUCKET = 'kangaroosplit-receipts'
// Enough to read small print on a till receipt, at a few hundred kilobytes.
const MAX_SIDE = 1600
const QUALITY = 0.8
const LINK_SECONDS = 60 * 60

// Shrinks a photo and re-encodes it as JPEG. Phone photos are several
// megabytes; storage is limited and shared.
export async function compressPhoto(file: Blob): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    // Rejects when the file is not an image the browser can read.
    await image.decode()

    const scale = Math.min(1, MAX_SIDE / Math.max(image.naturalWidth, image.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    // JPEG has no transparency; without this, clear areas turn black.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    return await new Promise((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode photo'))), 'image/jpeg', QUALITY),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Returns the path to store on the expense.
export async function uploadReceipt(photo: Blob): Promise<string> {
  const path = `${crypto.randomUUID()}.jpg`
  unwrap(await supabase.storage.from(BUCKET).upload(path, photo, { contentType: 'image/jpeg' }))
  return path
}

// Best effort: a file left behind costs a little space, nothing else.
export async function removeReceipt(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined)
}

// A temporary link to view the photo; the bucket itself is private.
export async function receiptLink(path: string): Promise<string> {
  return unwrap(await supabase.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS)).signedUrl
}
