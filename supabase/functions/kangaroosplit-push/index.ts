// Sends a Web Push to the other member whenever something is logged in
// kangaroosplit.activity. Called by a database webhook on INSERT.
//
// Secrets (Edge Functions -> Secrets):
//   KANGAROOSPLIT_VAPID_PUBLIC_KEY, KANGAROOSPLIT_VAPID_PRIVATE_KEY
//   KANGAROOSPLIT_VAPID_SUBJECT   e.g. mailto:you@example.com
//   KANGAROOSPLIT_WEBHOOK_SECRET  must match the webhook's x-webhook-secret header
// Deploy with JWT verification off: the shared secret is what authenticates
// the caller (the project's publishable key would pass JWT verification).

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

type Snapshot = {
  description?: string
  amount_cents?: number
  recurring?: boolean
  from_user?: string
  to_user?: string
  name?: string
}

type Activity = {
  id: string
  list_id: string
  actor_id: string
  action: string
  entity_id: string
  snapshot: Snapshot
}

type Member = { user_id: string; display_name: string; gender: 'm' | 'f' }

const env = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing secret ${name}`)
  return value
}

const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  db: { schema: 'kangaroosplit' },
})

webpush.setVapidDetails(
  env('KANGAROOSPLIT_VAPID_SUBJECT'),
  env('KANGAROOSPLIT_VAPID_PUBLIC_KEY'),
  env('KANGAROOSPLIT_VAPID_PRIVATE_KEY'),
)

// 123456 -> "1.234,56 €"
function money(cents: number): string {
  const [whole, decimals] = (Math.abs(cents) / 100).toFixed(2).split('.')
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${decimals} €`
}

// Written to the recipient ("tu"); the actor is always the other person.
function message(activity: Activity, actor: Member, recipientId: string): string | null {
  const subject = `${actor.gender === 'f' ? 'A' : 'O'} ${actor.display_name}`
  const { snapshot } = activity
  const expense = `“${snapshot.description ?? ''}”`
  const amount = money(snapshot.amount_cents ?? 0)

  switch (activity.action) {
    case 'expense_created':
      return `${subject} adicionou ${expense} · ${amount}`
    case 'expense_updated':
      return `${subject} editou ${expense}`
    case 'expense_deleted':
      return `${subject} apagou ${expense} · ${amount}`
    case 'expense_restored':
      return `${subject} restaurou ${expense}`
    case 'settlement_created':
      return snapshot.to_user === recipientId
        ? `${subject} pagou-te ${amount}`
        : `${subject} registou que lhe pagaste ${amount}`
    case 'settlement_deleted':
      return `${subject} apagou um acerto de ${amount}`
    case 'list_created':
      return `${subject} criou a lista “${snapshot.name ?? ''}”`
    case 'list_archived':
      return `${subject} arquivou a lista “${snapshot.name ?? ''}”`
    default:
      return null
  }
}

Deno.serve(async (request) => {
  if (request.headers.get('x-webhook-secret') !== env('KANGAROOSPLIT_WEBHOOK_SECRET')) {
    return new Response('Forbidden', { status: 403 })
  }

  const { record: activity } = (await request.json()) as { record: Activity }

  // Recurring expenses appear on their own; nobody did anything worth a ping.
  if (!activity || activity.snapshot?.recurring) return Response.json({ sent: 0 })

  const [{ data: members }, { data: list }] = await Promise.all([
    db.from('members').select('user_id, display_name, gender'),
    db.from('lists').select('name, icon').eq('id', activity.list_id).maybeSingle(),
  ])
  const actor = (members as Member[] | null)?.find((member) => member.user_id === activity.actor_id)
  if (!actor) return Response.json({ sent: 0 })

  const recipients = (members as Member[]).filter((member) => member.user_id !== actor.user_id)
  const { data: subscriptions } = await db
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .eq('enabled', true)
    .in('user_id', recipients.map((member) => member.user_id))

  let sent = 0
  await Promise.all(
    (subscriptions ?? []).map(async (subscription) => {
      const title = message(activity, actor, subscription.user_id)
      if (!title) return
      const payload = JSON.stringify({
        title,
        body: list ? `${list.icon} ${list.name}` : '',
        url: `/lista/${activity.list_id}`,
        tag: activity.id,
      })
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
          payload,
        )
        sent++
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode
        // Gone: the app was removed or the subscription expired.
        if (status === 404 || status === 410) {
          await db.from('push_subscriptions').delete().eq('id', subscription.id)
        } else {
          console.error('Push failed', status, error)
        }
      }
    }),
  )

  return Response.json({ sent })
})
