import { supabase, unwrap } from './supabase'

const BUCKET = 'kangaroosplit-shopping'
const SIZE = 256
const LINK_SECONDS = 60 * 60

export type Crop = {
  // Zoom on top of "cover the square": 1 to 4.
  zoom: number
  // Centre of the visible square, as a fraction of the image (0 to 1).
  x: number
  y: number
}

export type LoadedPhoto = { image: HTMLImageElement; url: string }

// Reads a photo the person picked or took. Rejects when the browser cannot
// read it. Call `URL.revokeObjectURL(url)` when done.
export async function loadPhoto(file: Blob): Promise<LoadedPhoto> {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.src = url
  try {
    await image.decode()
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
  return { image, url }
}

// The square of the image that is visible for a crop, in image pixels.
export function cropSquare(width: number, height: number, crop: Crop): { sx: number; sy: number; side: number } {
  const side = Math.min(width, height) / crop.zoom
  const sx = Math.min(Math.max(crop.x * width - side / 2, 0), width - side)
  const sy = Math.min(Math.max(crop.y * height - side / 2, 0), height - side)
  return { sx, sy, side }
}

// Draws the cropped square at 256 px and encodes it: WebP where the browser
// can (most can), JPEG otherwise (Safari cannot encode WebP).
export async function renderIcon(image: HTMLImageElement, crop: Crop): Promise<Blob> {
  const { sx, sy, side } = cropSquare(image.naturalWidth, image.naturalHeight, crop)
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas unavailable')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, SIZE, SIZE)
  context.drawImage(image, sx, sy, side, side, 0, 0, SIZE, SIZE)

  const encode = (type: string, quality: number) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
  const webp = await encode('image/webp', 0.85)
  if (webp && webp.type === 'image/webp') return webp
  const jpeg = await encode('image/jpeg', 0.85)
  if (!jpeg) throw new Error('Could not encode photo')
  return jpeg
}

// Returns the path to store on the item.
export async function uploadShoppingImage(photo: Blob): Promise<string> {
  const extension = photo.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${crypto.randomUUID()}.${extension}`
  unwrap(await supabase.storage.from(BUCKET).upload(path, photo, { contentType: photo.type }))
  return path
}

// Best effort: a file left behind costs a little space, nothing else.
export async function removeShoppingImage(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined)
}

// A temporary link to the photo; the bucket itself is private.
export async function shoppingImageLink(path: string): Promise<string> {
  return unwrap(await supabase.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS)).signedUrl
}
