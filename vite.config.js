import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Verde scuro dell'interfaccia: --night e --dusk calcolati a tinta 155
const THEME_COLOR = '#002813'
const BACKGROUND_COLOR = '#01190a'

// Content Security Policy della build: solo script dell'app, niente plugin, niente <base> estranei.
// connect-src resta aperto a http/https perché calendari .ics e AI locale sono indirizzi scelti
// dall'utente; la difesa contro gli script iniettati è script-src 'self'.
// frame-ancestors e HSTS non valgono nel meta: stanno in public/_headers per l'hosting.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: http:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ')

function contentSecurityPolicy() {
  return {
    name: 'lowcor-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    contentSecurityPolicy(),
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
        // I font non vengono precaricati tutti: ognuno finisce in cache la prima volta che serve
        // (di solito solo lo stile di testo scelto), poi funziona anche offline.
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
