import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { cloudflare } from '@cloudflare/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    cloudflare(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'دفتر حساب سیمرغ',
        short_name: 'سیمرغ',
        description: 'حساب‌وکتاب ساده با دوستان و آشنایان',
        theme_color: '#0f6b6b',
        background_color: '#f4efe6',
        display: 'standalone',
        lang: 'fa',
        dir: 'rtl',
        start_url: '/',
        // Pinned so installs survive a future start_url change.
        id: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // Online-only app: API responses are never cached, and navigations
        // to /api must not be answered with index.html.
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [],
      },
    }),
  ],
})
