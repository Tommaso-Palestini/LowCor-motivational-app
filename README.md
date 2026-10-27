# LowCor

Routine, focus e obiettivi per chi ha un cervello che va a scatti: ADHD, plusdotazione, o semplicemente giornate
piene. Calendario a blocchi con energia, modalità focus con time timer, piano flessibile senza sensi di colpa,
rito della settimana, schema 9×9 degli obiettivi e AI locale (Ollama) per scomporre i compiti.

**Local-first**: niente account e niente server. I dati restano sul dispositivo; dalle impostazioni si salva e si
ripristina un backup JSON.

## Piattaforme

- **Web / PWA** installabile su iOS, Android e desktop (React + Vite, service worker con `vite-plugin-pwa`)
- **App native** Android e iOS con Capacitor: notifiche locali programmate, vibrazioni, condivisione file

## Sviluppo

```bash
npm install
npm run dev        # server di sviluppo
npm run lint       # oxlint
npm test           # test della logica (vitest)
npm run test:e2e   # test end-to-end su Chrome, Firefox, Safari (WebKit), iPhone, iPad, Pixel, Galaxy
```

Su Linux WebKit ha bisogno di alcune librerie di sistema: `sudo npx playwright install-deps webkit`.

### AI locale

Le funzioni AI usano [Ollama](https://ollama.com) sul computer, all'indirizzo `http://localhost:11434`:

```bash
ollama serve
ollama pull llama3.2
```

Nell'app nativa l'AI è disattivata: sul telefono non c'è Ollama.

### App native

```bash
npm run android    # build, sync e apre Android Studio
npm run ios        # build, sync e apre Xcode (serve un Mac)
npm run native:sync
```

## Struttura

- `src/logic/` logica pura (calendario, energia, focus, backup, …) con i test in `__tests__/`
- `src/components/` interfaccia per sezione
- `src/storage/` salvataggio locale
- `src/native.js` ponte verso Capacitor (notifiche, vibrazioni, condivisione)
- `src/i18n/` traduzioni (l'italiano è la chiave, inglese in beta)
- `public/privacy.html` informativa privacy
- `e2e/` test Playwright

© 2026 LowCor. Tutti i diritti riservati.
