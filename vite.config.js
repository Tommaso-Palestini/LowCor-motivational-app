import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Content Security Policy della build: solo script dell'app, niente plugin, niente <base> estranei.
// connect-src resta aperto a http/https perché calendari .ics e AI locale sono indirizzi scelti
// dall'utente; la difesa contro gli script iniettati è script-src 'self'.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https: http:",
  "worker-src 'self' blob:",
  "frame-src 'self'",
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
  // Con `tauri dev` la finestra si collega a questa porta: deve essere sempre la stessa
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  plugins: [
    react(),
    contentSecurityPolicy(),
  ],
})
