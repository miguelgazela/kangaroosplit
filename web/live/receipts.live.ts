// Checks receipt storage against the real project without creating any
// expense (which would notify the other phone): a file goes up, is readable
// through a signed link, and comes down again.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { receiptLink, removeReceipt, uploadReceipt } from '../src/lib/receipts'
import { supabase } from '../src/lib/supabase'

// Smallest valid JPEG: a single grey pixel.
const JPEG = Uint8Array.from(
  atob(
    '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=',
  ),
  (character) => character.charCodeAt(0),
)

let path: string | null = null

beforeAll(async () => {
  const email = process.env.TEST_EMAIL
  const password = process.env.TEST_PASSWORD
  if (!email || !password) throw new Error('Set TEST_EMAIL and TEST_PASSWORD in web/.env.local')
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in failed: ${error.message}`)
})

afterAll(async () => {
  if (path) await removeReceipt(path)
  await supabase.auth.signOut({ scope: 'local' })
})

describe('receipts', () => {
  it('uploads a photo and serves it through a signed link', async () => {
    path = await uploadReceipt(new Blob([JPEG], { type: 'image/jpeg' }))
    const response = await fetch(await receiptLink(path))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect((await response.arrayBuffer()).byteLength).toBe(JPEG.length)
  })

  it('is not readable without signing in', async () => {
    const publicUrl = supabase.storage.from('kangaroosplit-receipts').getPublicUrl(path!).data.publicUrl
    expect((await fetch(publicUrl)).ok).toBe(false)
  })

  it('refuses files that are not JPEG', async () => {
    const { error } = await supabase.storage
      .from('kangaroosplit-receipts')
      .upload(`${crypto.randomUUID()}.txt`, new Blob(['x'], { type: 'text/plain' }))
    expect(error).not.toBeNull()
  })

  it('removes the photo', async () => {
    await removeReceipt(path!)
    await expect(receiptLink(path!)).rejects.toThrow()
    path = null
  })

  it('has the save function that accepts a receipt', async () => {
    // Deliberately invalid shares: reaching that check proves the new
    // eleven-argument function was found, and nothing gets saved.
    const zero = '00000000-0000-0000-0000-000000000000'
    const { error } = await supabase.rpc('save_expense', {
      p_id: null,
      p_list_id: zero,
      p_description: 'x',
      p_amount_cents: 100,
      p_spent_on: '2026-01-01',
      p_paid_by: zero,
      p_category_id: zero,
      p_note: null,
      p_split_mode: 'equal',
      p_shares: [],
      p_receipt_path: 'x.jpg',
    })
    expect(error?.message).toMatch(/do not sum/)
  })
})
