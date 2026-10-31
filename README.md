# LowCor

Routine, focus e obiettivi per chi ha un cervello che va a scatti: ADHD, plusdotazione, o semplicemente giornate
piene. Calendario a blocchi con energia, modalità focus con time timer, piano flessibile senza sensi di colpa,
cose da fare una volta sola, rito della settimana, schema 9×9 degli obiettivi e AI locale (Ollama) per scomporre i
compiti.

**Tutto in locale.** LowCor è un programma per PC: niente account, niente server. I dati stanno in file sul tuo
computer. Per passarli a un altro PC basta la stessa rete: i due computer si trovano da soli, controlli che lo
stesso codice di 6 cifre compaia su entrambi e i dati passano cifrati, direttamente.

> **Lavori in corso.** LowCor sta diventando un'app desktop installabile (Tauri, Linux e Windows).
> Il piano è in [`SPEC.md`](SPEC.md) e [`tasks/todo.md`](tasks/todo.md). Fino al primo rilascio l'app si prova
> nel browser con `npm run dev`, e lì salva i dati nella memoria del browser.

## Sviluppo

```bash
npm install
npm run dev            # interfaccia nel browser, con ricarica automatica
npm run lint           # oxlint
npm test               # test della logica (vitest)
npm run test:e2e       # end-to-end su Chromium, WebKit e una finestra stretta
```

Su Linux WebKit ha bisogno di alcune librerie di sistema: `sudo npx playwright install-deps webkit`.

### AI locale

Le funzioni AI usano [Ollama](https://ollama.com) sul computer, all'indirizzo `http://localhost:11434`:

```bash
ollama serve
ollama pull llama3.2
```

## Struttura

- `src/logic/` logica pura (calendario, energia, focus, backup, cose da fare, …) con i test in `__tests__/`
- `src/components/` interfaccia per sezione
- `src/storage/` salvataggio dei dati
- `src/i18n/` traduzioni (l'italiano è la chiave, inglese in beta)
- `public/privacy.html`, `public/terms.html` informativa privacy e termini d'uso
- `e2e/` test Playwright

Le versioni web/PWA, Android e iOS (Capacitor) e il backend Supabase sono stati tolti il 31/10/2026: si ritrovano
nella cronologia git fino al commit `e9b674a`.

© 2026 LowCor. Tutti i diritti riservati.
