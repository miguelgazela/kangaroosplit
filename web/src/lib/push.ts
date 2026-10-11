import { supabase, unwrap } from './supabase'

export type PushState =
  // No service worker (dev server, old browser) or not installed to the home
  // screen: iOS only allows push for installed web apps.
  | 'unsupported'
  // The user refused in the system dialog; only iOS Settings can undo that.
  | 'blocked'
  | 'off'
  | 'on'

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function getPushState(): Promise<PushState> {
  const worker = await registration()
  if (!worker) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  return (await worker.pushManager.getSubscription()) ? 'on' : 'off'
}

function decodeKey(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64Url.length / 4) * 4, '=')
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

// Must be called from a tap: iOS only shows the permission dialog in response
// to a user gesture.
export async function enablePush(): Promise<PushState> {
  const worker = await registration()
  if (!worker) return 'unsupported'
  if ((await Notification.requestPermission()) !== 'granted') {
    return Notification.permission === 'denied' ? 'blocked' : 'off'
  }

  const subscription = await worker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeKey(import.meta.env.VITE_VAPID_PUBLIC_KEY),
  })
  const { endpoint, keys } = subscription.toJSON()
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('Incomplete push subscription')

  unwrap(
    await supabase
      .from('push_subscriptions')
      .upsert({ endpoint, p256dh: keys.p256dh, auth: keys.auth, enabled: true }, { onConflict: 'endpoint' })
      .select('id'),
  )
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const worker = await registration()
  if (!worker) return 'unsupported'
  const subscription = await worker.pushManager.getSubscription()
  if (subscription) {
    // Row first: once unsubscribed, the endpoint is gone and so is the key to find it.
    await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
    await subscription.unsubscribe()
  }
  return Notification.permission === 'denied' ? 'blocked' : 'off'
}
