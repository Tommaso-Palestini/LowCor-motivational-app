# Spec: LowCor come app desktop locale

Stato: **approvata** (31/10/2026). Questo documento contiene la mappa dei moduli e le regole che
valgono per tutti. Ogni modulo avrà la sua `SPEC-<id>.md` solo dopo l'approvazione della mappa.

## Obiettivo

LowCor smette di essere un sito/PWA con account online e diventa un'**applicazione installabile per PC**
(Linux e Windows), come Devtox. I dati restano sul computer, in file che l'utente può vedere e copiare.
Per passare i dati a un altro PC si usa la **rete locale**: le due app si trovano da sole, l'utente conferma
un codice di 6 cifre uguale sui due schermi e i dati passano cifrati, senza server né account.

Per chi è: la stessa persona di oggi (ADHD, plusdotazione, giornate piene) che usa LowCor su uno o più PC
suoi e non vuole che i suoi dati, compresi energia e giornate no, finiscano su un servizio online.

## Decisioni già prese (dall'utente, 31/10/2026)

| Tema | Decisione |
|---|---|
| Piattaforme | Solo PC: Linux e Windows. macOS, Android e iOS non per ora |
| Contenitore | Tauri 2 (WebView di sistema: WebKitGTK su Linux, WebView2 su Windows) |
| Trasferimento | Stessa rete: scoperta automatica + codice di conferma a 6 cifre |
| Supabase | Rimosso del tutto (account, sincronizzazione online, inviti, condivisione) |
| Android/iOS/PWA | Tolti dalla build. Restano nella cronologia git (ultimo commit con loro: `e9b674a`) |

## Ipotesi (da correggere ora se sbagliate)

1. L'interfaccia React resta quella di oggi. Cambia solo cosa c'è sotto: salvataggio, file, notifiche, rete.
2. I dati passano da `localStorage` a un file JSON nella cartella dati dell'app
   (`~/.local/share/lowcor/` su Linux, `%APPDATA%\lowcor\` su Windows). Al primo avvio l'app sposta lì quello
   che trova in `localStorage`.
3. **Trasferimento, prima versione:** si copia tutto lo stato da un PC all'altro (invio / ricevo), riusando
   la scelta che oggi fa `ConflictDialog` ("tieni questi / tieni quelli"). Unire le modifiche fatte su due PC
   voce per voce è un passo successivo, se servirà.
4. I PC abbinati restano ricordati (si salva la loro chiave pubblica): il codice serve solo la prima volta.
5. L'AI resta Ollama su `localhost:11434`. Se WebKitGTK blocca le richieste dall'app verso `http://localhost`,
   passano dal lato Rust.
6. Aggiornamenti (deciso il 31/10/2026): a ogni push su `main` la CI pubblica una versione su GitHub Releases;
   l'app (AppImage su Linux, installer su Windows) la propone all'avvio. Si spegne dalle impostazioni.
7. La build Windows si fa con GitHub Actions sul repository esistente. Il programma non è firmato, quindi
   Windows SmartScreen mostrerà un avviso al primo avvio.

## Mappa dei moduli

| Id modulo | Responsabilità | Dipende da |
|---|---|---|
| `local-only` | Togliere Supabase (`src/cloud`, `useCloud`, `components/account`, `logic/cloud`, `logic/invite`, `supabase/`), PWA, Capacitor e cartelle `android/` e `ios/`. Riscrivere privacy/termini per un'app senza server | — |
| `desktop-shell` | Progetto Tauri in `src-tauri/`, finestra, icone, CSP, accesso a Ollama, `npm run desktop:dev` e build locale Linux (.deb, AppImage) | `local-only` |
| `disk-storage` | Stato su file nella cartella dati con scrittura atomica, migrazione da `localStorage`, backup/PDF/.ics salvati con la finestra "Salva con nome" del sistema invece di Capacitor | `desktop-shell` |
| `desktop-reminders` | Promemoria dei blocchi con le notifiche del sistema (plugin Tauri), al posto di `LocalNotifications` | `desktop-shell` |
| `lan-transfer` | Lato Rust: annuncio e ricerca sulla rete (mDNS `_lowcor._tcp`), abbinamento con codice di 6 cifre (Noise XX, codice ricavato dall'handshake), PC ricordati, invio e ricezione dello stato cifrato. Lato React: schermata "Altri PC" | `disk-storage` |
| `release` | GitHub Actions per Linux e Windows (installer .msi/.exe), `install.sh` come Devtox, README, CHANGELOG, versione 0.1.0 | tutti |

Ordine: `local-only` → `desktop-shell` → `disk-storage` → `desktop-reminders` e `lan-transfer` (in parallelo)
→ `release`.

## Comandi (obiettivo)

```bash
npm install
npm run desktop:dev       # tauri dev: app desktop con ricarica automatica
npm run desktop:build     # tauri build: pacchetti per il sistema in uso (.deb e AppImage su Linux)
npm run lint              # oxlint
npm test                  # vitest (logica JS)
cargo test --manifest-path src-tauri/Cargo.toml   # test lato Rust (rete, abbinamento, file)
npm run test:e2e          # playwright sull'interfaccia, servita da vite
```

Prerequisiti su Linux (oggi mancano su questo PC):
`rustup` (Rust stabile) e `sudo apt install libwebkit2gtk-4.1-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev
build-essential libssl-dev libayatana-appindicator3-dev librsvg2-dev`.

## Struttura del progetto

```
src/              → interfaccia React (resta com'è)
src/desktop.js    → ponte verso Tauri (prende il posto di src/native.js)
src/logic/        → logica pura + __tests__ (vitest)
src-tauri/        → app Tauri: Cargo.toml, tauri.conf.json, capabilities/, icons/
src-tauri/src/    → Rust: storage.rs, lan/ (discovery, pairing, transfer)
e2e/              → test Playwright dell'interfaccia
.github/workflows → build Linux e Windows
```

## Stile del codice

- JS: lo stile attuale del repository (funzioni piccole e pure in `src/logic`, commenti brevi in italiano
  che spiegano il perché, testi dell'interfaccia passando da `i18n`).
- Rust: `cargo fmt` + `cargo clippy -- -D warnings`. I comandi Tauri sono sottili e la logica sta in funzioni
  testabili. Gli errori arrivano all'interfaccia come testo da mostrare all'utente.

```rust
// Comando Tauri sottile: valida, delega, traduce l'errore per l'interfaccia
#[tauri::command]
fn save_state(app: AppHandle, json: String) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    storage::write_atomic(&dir.join("data.json"), json.as_bytes())
        .map_err(|_| "Non riesco a salvare i dati sul disco".into())
}
```

## Strategia di test

- La logica JS esistente continua a passare (`npm test`). I test di `cloud` e `invite` spariscono con i loro
  moduli.
- Rust: test unitari per la scrittura atomica, il formato dei messaggi e la derivazione del codice. Un test
  di integrazione con due istanze su `127.0.0.1` che si abbinano e si passano lo stato.
- E2E Playwright sull'interfaccia (senza Tauri). I test `e2e/account.spec.js` vengono rimossi.
- Verifica a mano su Linux a ogni modulo (finestra, salvataggio, notifiche). Su Windows dall'installer
  prodotto da CI.

## Confini

- **Sempre:** test e lint verdi prima di ogni commit. Commit piccoli, uno per passo. Messaggi e testi in
  italiano come oggi. Nessuna connessione verso l'esterno senza un'azione dell'utente (l'URL dei calendari .ics
  e Ollama restano le uniche).
- **Chiedere prima:** aggiungere dipendenze npm o crate oltre a quelle previste qui (Tauri e i suoi plugin
  ufficiali, `mdns-sd`, `snow`). Cambiare il formato del file dati o del backup. Toccare la CI. Fare push.
- **Mai:** mandare dati fuori dalla rete locale. Aprire una porta in ascolto senza che l'utente abbia aperto
  la schermata di trasferimento. Accettare dati da un PC non confermato col codice. Cancellare dati senza
  conferma. Commit di segreti.

## Criteri di successo (per l'intero progetto)

1. Su Linux `npm run desktop:build` produce .deb e AppImage. Installati, aprono LowCor dal menu delle
   applicazioni senza rete.
2. Da GitHub Actions esce un installer Windows che installa e apre l'app.
3. Nel codice e nel pacchetto non c'è più traccia di Supabase, Capacitor o service worker
   (`grep -ri supabase src src-tauri` è vuoto).
4. Chiusa e riaperta l'app, i dati ci sono. Chi aveva dati in `localStorage` li ritrova al primo avvio.
5. Due PC sulla stessa rete si vedono entro 5 secondi dall'apertura della schermata. Con codice confermato
   su entrambi, lo stato passa in meno di 3 secondi. Con codice rifiutato, non passa niente.
6. Un promemoria di blocco arriva come notifica di sistema con l'app aperta, anche se la finestra è ridotta
   a icona.
7. L'AI con Ollama funziona dall'app installata.

## Domande chiuse (31/10/2026)

1. **Condivisione con altre persone:** si esporta un file `.ics` con "solo occupato" o "anche i titoli" da
   mandare a chi si vuole. Nessun collegamento diretto tra persone.
2. **Promemoria ad app chiusa:** chiudendo la finestra LowCor resta nell'area di notifica (tray). Avvio
   automatico all'accensione facoltativo, dalle impostazioni. Entra nel modulo `desktop-reminders`.
3. **Trasferimento:** si copia tutto da un PC all'altro. Niente unione voce per voce.
