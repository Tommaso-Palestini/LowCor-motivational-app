import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Verde scuro dell'interfaccia: --night e --dusk calcolati a tinta 155
const THEME_COLOR = '#002813'
const BACKGROUND_COLOR = '#01190a'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      includeAssets: ['favicon.svg', 'favicon-64x64.png', 'apple-touch-icon.png'],
      manifest: {
        id: '/',
        name: 'LowCor',
        short_name: 'LowCor',
        description: 'La tua giornata in un anello: blocchi, obiettivi settimanali e carte per i tempi morti.',
        lang: 'it',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        theme_color: THEME_COLOR,
        background_color: BACKGROUND_COLOR,
        categories: ['productivity', 'lifestyle'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
