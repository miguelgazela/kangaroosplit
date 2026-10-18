import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      // Push and notification-click handlers live in public/push-sw.js.
      // The Guru images are cached too, so the offline screen can show him.
      workbox: { importScripts: ['push-sw.js'], globPatterns: ['**/*.{js,css,html,webp}'] },
      manifest: {
        name: 'KangarooSplit',
        short_name: 'KangarooSplit',
        lang: 'pt-PT',
        display: 'standalone',
        start_url: '/',
        background_color: '#f2f2f7',
        theme_color: '#f2f2f7',
        // Long-press the app icon (Android, desktop Chrome/Edge). iOS ignores
        // these; there, add /nova to the home screen as its own icon.
        shortcuts: [
          {
            name: 'Nova despesa',
            short_name: 'Nova despesa',
            url: '/nova',
            icons: [{ src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
