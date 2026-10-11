// Push handling for the service worker. Loaded by the generated worker via
// importScripts (see vite.config.ts).

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    // Not JSON: fall through to the generic notification below.
  }
  // iOS revokes the subscription if a push arrives and nothing is shown, so
  // always show something.
  event.waitUntil(
    self.registration.showNotification(payload.title || 'KangarooSplit', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      tag: payload.tag,
      data: { url: payload.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
      const open = windows[0]
      if (!open) return self.clients.openWindow(url)
      await open.focus()
      if ('navigate' in open) await open.navigate(url)
    }),
  )
})
