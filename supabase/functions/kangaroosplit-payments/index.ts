// Receives one Apple Pay payment from the iOS Shortcuts automation ("Transação")
// and stores it as a draft in kangaroosplit.pending_payments, then pings the
// person's phone ("Pagamento por classificar").
//
//   POST  {project}.supabase.co/functions/v1/kangaroosplit-payments
//   Header  x-payment-key: ks_...   (made in the app: Definições > Pagamentos automáticos)
//   Body    { "merchant": "Pingo Doce", "amount": "23,40 €", "card": "Visa 4242", "date": "2026-11-12T13:42:00Z" }
//           Only merchant and amount are required.
//
// Secrets (Edge Functions -> Secrets): the VAPID ones already used by
// kangaroosplit-push. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are built in.
// Deploy with JWT verification off: the personal key is what authenticates the
// caller. The function can only add drafts for the person who owns the key.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'
import { cleanMerchant, merchantKey, parseAmountCents, parseCardLast4 } from './parse.ts'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  db: { schema: 'kangaroosplit' },
})

const vapid = {
  subject: Deno.env.get('KANGAROOSPLIT_VAPID_SUBJECT'),
  publicKey: Deno.env.get('KANGAROOSPLIT_VAPID_PUBLIC_KEY'),
  privateKey: Deno.env.get('KANGAROOSPLIT_VAPID_PRIVATE_KEY'),
}
const canPush = Boolean(vapid.subject && vapid.publicKey && vapid.privateKey)
if (canPush) webpush.setVapidDetails(vapid.subject!, vapid.publicKey!, vapid.privateKey!)

const MAX_CENTS = 50_000_000 // 500 000,00 €: anything above is a typo or an attack
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function money(cents: number): string {
  const [whole, decimals] = (cents / 100).toFixed(2).split('.')
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals} €`
}

function reply(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status })
}

async function notify(userId: string, merchant: string, amountCents: number, paymentId: string) {
  if (!canPush) return
  const { data: subscriptions } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('enabled', true)
    .eq('user_id', userId)

  const payload = JSON.stringify({
    title: 'Pagamento por classificar',
    body: `${merchant} · ${money(amountCents)}`,
    url: '/pagamentos',
    tag: paymentId,
  })
  await Promise.all(
    (subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          payload,
        )
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', subscription.id)
        else console.error('Push failed', status)
      }
    }),
  )
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply(405, { error: 'method' })

  const key = request.headers.get('x-payment-key')?.trim()
  if (!key || !/^ks_[0-9a-f]{48}$/.test(key)) return reply(401, { error: 'key' })

  const { data: token } = await db
    .from('payment_tokens')
    .select('user_id')
    .eq('token_hash', await sha256Hex(key))
    .maybeSingle()
  if (!token) return reply(401, { error: 'key' })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return reply(400, { error: 'json' })
  }

  const merchantRaw = typeof body.merchant === 'string' ? body.merchant.replace(/\s+/g, ' ').trim() : ''
  const amountCents = parseAmountCents(body.amount)
  if (!merchantRaw || merchantRaw.length > 200) return reply(400, { error: 'merchant' })
  if (amountCents === null || amountCents > MAX_CENTS) return reply(400, { error: 'amount' })

  const merchant = cleanMerchant(merchantRaw)
  const key_ = merchantKey(merchant)
  if (!key_) return reply(400, { error: 'merchant' })

  // The automation can fire twice for one tap; ignore a repeat within two minutes.
  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS).toISOString()
  const { data: repeat } = await db
    .from('pending_payments')
    .select('id')
    .eq('user_id', token.user_id)
    .eq('merchant_key', key_)
    .eq('amount_cents', amountCents)
    .gte('created_at', since)
    .limit(1)
  if (repeat && repeat.length > 0) return reply(200, { ok: true, duplicate: true })

  const parsedDate = typeof body.date === 'string' ? new Date(body.date) : null
  // Never trust a date far from now: a wrong phone clock or a typo.
  const paidAt =
    parsedDate && !Number.isNaN(parsedDate.getTime()) && Math.abs(parsedDate.getTime() - Date.now()) < 7 * 86_400_000
      ? parsedDate
      : new Date()

  const { data: payment, error } = await db
    .from('pending_payments')
    .insert({
      user_id: token.user_id,
      merchant_raw: merchantRaw,
      merchant,
      merchant_key: key_,
      amount_cents: amountCents,
      paid_at: paidAt.toISOString(),
      card_last4: parseCardLast4(body.card),
    })
    .select('id')
    .single()
  if (error || !payment) {
    console.error('Insert failed', error?.message)
    return reply(500, { error: 'insert' })
  }

  await db.from('payment_tokens').update({ last_used_at: new Date().toISOString() }).eq('user_id', token.user_id)
  // Best effort: the draft is already saved.
  await notify(token.user_id, merchant, amountCents, payment.id).catch((e) => console.error('Notify failed', e))

  return reply(200, { ok: true })
})
