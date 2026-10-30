# LowCor

Routine, focus e obiettivi per chi ha un cervello che va a scatti: ADHD, plusdotazione, o semplicemente giornate
piene. Calendario a blocchi con energia, modalità focus con time timer, piano flessibile senza sensi di colpa,
cose da fare una volta sola, rito della settimana, schema 9×9 degli obiettivi e AI locale (Ollama) per scomporre i
compiti.

**Local-first, account facoltativo.** Senza account i dati restano sul dispositivo e dalle impostazioni si salva e
si ripristina un backup JSON. Con l'account (Supabase) i dati restano comunque anche sul dispositivo, una copia online
tiene allineati telefono e computer e si possono condividere gli impegni con le persone collegate.

## Piattaforme

- **Web / PWA** installabile su iOS, Android e desktop (React + Vite, service worker con `vite-plugin-pwa`)
- **App native** Android e iOS con Capacitor: notifiche locali programmate, vibrazioni, condivisione file
- **Backend** facoltativo su [Supabase](https://supabase.com): autenticazione, Postgres con Row Level Security

## Sviluppo

```bash
npm install
npm run dev            # server di sviluppo
npm run lint           # oxlint
npm test               # test della logica (vitest)
npm run test:e2e       # end-to-end su Chrome, Firefox, Safari (WebKit), iPhone, iPad, Pixel, Galaxy
```

Su Linux WebKit ha bisogno di alcune librerie di sistema: `sudo npx playwright install-deps webkit`.

### Backend in locale

Serve Docker. Lo stack locale ha autenticazione, API, database e una casella email finta (Mailpit) dove arrivano i
codici di conferma.

```bash
npm run backend:start     # avvia Supabase in locale (la prima volta scarica le immagini)
npm run backend:reset     # ricrea il database da zero applicando le migrazioni
npm run test:backend      # test di sicurezza del database (pgTAP) e dell'API con utenti veri
npm run backend:stop
```

Per collegare l'app allo stack locale crea `.env.local` (è ignorato da git) partendo da `.env.example`, con
`API_URL` e `ANON_KEY` presi da `npx supabase status`. Le email con i codici si leggono su http://127.0.0.1:54324.
Senza le variabili `VITE_SUPABASE_*` l'app funziona come prima, solo in locale, e il pulsante dell'account non compare.

Con lo stack avviato, anche `npm run test:e2e` prova registrazione, accesso, sincronizzazione, inviti e
cancellazione dell'account nel browser (`e2e/account.spec.js`); senza stack quei test si saltano.

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

## Backend

Lo schema è in `supabase/migrations/`, i test in `supabase/tests/`. In breve:

| Tabella | Cosa contiene | Chi la legge |
|---|---|---|
| `profiles` | nome da mostrare | solo il proprietario (gli altri tramite funzioni) |
| `consents` | versione di privacy/termini accettata, consenso ai dati sulla salute | solo il proprietario |
| `user_state` | lo stesso JSON che l'app tiene sul dispositivo, con `revision` | solo il proprietario |
| `shares` | collegamenti: chi mostra cosa a chi (`none`, `busy`, `details`) | nessuno direttamente |
| `invites` | inviti, solo hash SHA-256 del codice, 7 giorni, uso singolo | nessuno direttamente |
| `invite_failures` | tentativi falliti, per fermare chi prova a indovinare | nessuno direttamente |
| `schedule_items` | impegni pubblicati per le persone collegate (prossime 4 settimane) | nessuno direttamente |

Le scritture passano solo dalle funzioni (`save_state`, `create_invite`, `accept_invite`, `set_share_level`,
`publish_schedule`, `shared_schedule`, `export_my_data`, `delete_account`, …), che ricavano l'utente da
`auth.uid()` e mai da un parametro.

### Sicurezza

- **Row Level Security attiva e forzata** su ogni tabella; `anon` non ha permessi su tabelle e funzioni.
  `supabase/tests/database/security.test.sql` fallisce se una migrazione futura se ne dimentica.
- **Scritture solo tramite funzioni** `SECURITY DEFINER` con `search_path` vuoto, input validato e limiti:
  stato massimo 2 MB, 500 impegni per pubblicazione e intervalli di massimo 62 giorni, 5 inviti aperti e 20 al giorno,
  10 codici sbagliati all'ora, 200 persone collegate.
- **Conflitti tra dispositivi**: `save_state` salva solo se la `revision` è quella letta; altrimenti l'app chiede
  quale versione tenere. Non si perde mai una modifica in silenzio.
- **Autenticazione**: password di almeno 10 caratteri con maiuscole, minuscole e numeri, email confermata con un
  codice di 6 cifre (15 minuti), rotazione dei refresh token, riautenticazione per cambiare password, nessun token
  negli URL. Registrazione e recupero password non rivelano se un'email ha un account.
- **Condivisione minima**: degli impegni condivisi escono solo giorno, ora e (se scelto) titolo. Chi non mostra niente a
  nessuno non ha impegni salvati sul server.
- **Pulizia notturna** (`pg_cron`, ore 3:17): inviti usati o scaduti, tentativi falliti e impegni passati.
- **App web**: Content Security Policy nella build (`script-src 'self'`, `object-src 'none'`, `base-uri 'none'`),
  intestazioni HSTS, `nosniff`, `frame-ancestors` e `Permissions-Policy` in `public/_headers`.
- **Sessione**: come ogni SPA con Supabase, il token sta nella memoria del browser. Il rischio (furto via XSS) è
  contenuto da CSP, React che non inserisce HTML grezzo e token di accesso brevi (1 ora).

### Andare in produzione

1. Crea un progetto Supabase **nella regione UE (Frankfurt)** e collega la CLI: `npx supabase link --project-ref …`.
2. Applica lo schema: `npx supabase db push`. Controlla che `pg_cron` sia attivo (Database → Extensions).
3. In Authentication → Settings riporta le impostazioni di `supabase/config.toml` (non vengono copiate da sole):
   conferma email attiva, password minima 10 con maiuscole/minuscole/numeri, scadenza OTP 900 s, cambio password
   sicuro, "Leaked password protection" se il piano la include. Copia i template email di `supabase/templates/`
   (usano `{{ .Token }}`, cioè il codice di 6 cifre).
4. Configura un **SMTP vero** (Authentication → SMTP): quello incluso ha limiti bassissimi. Il fornitore va indicato
   nell'informativa privacy.
5. In Authentication → URL Configuration imposta Site URL e redirect con il dominio vero e `capacitor://localhost`,
   `https://localhost` per le app native.
6. Metti `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chiave **anon/publishable**, mai la service_role) nelle
   variabili di build dell'hosting, poi `npm run build`.
7. **Prima di pubblicare** completa i segnaposto tra parentesi quadre in `public/privacy.html` e `public/terms.html`
   (titolare, indirizzo, email, fornitori email e hosting, durata dei backup), firma il DPA di Supabase e degli altri
   fornitori, tieni il registro dei trattamenti (art. 30 GDPR) e valuta con un consulente se serve una valutazione
   d'impatto (DPIA, art. 35): i dati possono riguardare la salute.

## Struttura

- `src/logic/` logica pura (calendario, energia, focus, backup, cose da fare, account, …) con i test in `__tests__/`
- `src/components/` interfaccia per sezione (`account/` per accesso, persone collegate e impegni condivisi)
- `src/storage/` salvataggio locale
- `src/cloud/api.js` ponte verso Supabase, caricato solo se l'account è configurato
- `src/hooks/useCloud.js` sincronizzazione: primo allineamento, salvataggio automatico, conflitti, impegni condivisi
- `src/native.js` ponte verso Capacitor (notifiche, vibrazioni, condivisione)
- `src/i18n/` traduzioni (l'italiano è la chiave, inglese in beta)
- `supabase/` configurazione, migrazioni, template email e test del backend
- `public/privacy.html`, `public/terms.html` informativa privacy e termini d'uso
- `e2e/` test Playwright

© 2026 LowCor. Tutti i diritti riservati.
