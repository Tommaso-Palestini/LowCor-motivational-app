# LowCor

Routine, focus e obiettivi per chi ha un cervello che va a scatti: ADHD, plusdotazione, o semplicemente giornate
piene. Calendario a blocchi con energia, modalità focus con time timer, piano flessibile senza sensi di colpa,
cose da fare una volta sola, rito della settimana, schema 9×9 degli obiettivi e AI locale (Ollama) per scomporre i
compiti.

**Tutto in locale.** LowCor è un programma per PC (Linux e Windows): niente account, niente server, niente
statistiche. I dati stanno in file sul tuo computer, in una cartella che puoi vedere e copiare.

## Provalo

### Linux

Dalla pagina [Releases](../../releases/latest) scarica il file `.AppImage`, poi:

```bash
chmod +x LowCor_*_amd64.AppImage
./LowCor_*_amd64.AppImage
```

Oppure, per averlo nel menu delle applicazioni con il logo (senza sudo):

```bash
git clone https://github.com/Tommaso-Palestini/LowCor-motivational-app.git
cd LowCor-motivational-app
sh install.sh                # scarica l'ultima AppImage in ~/.local
sh install.sh --uninstall    # la toglie; i dati restano
```

Le AppImage hanno bisogno di FUSE 2: su Ubuntu 24.04 `sudo apt install libfuse2t64`, su Ubuntu 22.04
`sudo apt install libfuse2`. Nelle Releases c'è anche un `.deb`, che però non si aggiorna da solo.

### Windows

Dalla pagina [Releases](../../releases/latest) scarica `LowCor_*_x64-setup.exe` e installalo. Il programma non è
firmato: se Windows SmartScreen avvisa, scegli *Ulteriori informazioni → Esegui comunque*.

### Aggiornamenti

A ogni modifica pubblicata su `main` GitHub Actions compila una nuova versione e la mette nelle Releases.
All'avvio LowCor se ne accorge e propone **Aggiorna e riavvia**. Vale per l'AppImage e per l'installer di
Windows; si spegne dalle impostazioni ("Cerca aggiornamenti").

### Dove stanno i dati

| Sistema | Cartella |
|---|---|
| Linux | `~/.local/share/lowcor/` |
| Windows | `%APPDATA%\lowcor\` |

Dentro c'è `data.json` con tutto. Disinstallare il programma non lo cancella. Dalle impostazioni puoi salvare e
ripristinare un backup.

### AI locale (facoltativa)

Brainstorming, carte generate e schema 9×9 usano [Ollama](https://ollama.com) sul tuo computer:

```bash
ollama serve
ollama pull llama3.2
```

Senza Ollama tutto il resto funziona lo stesso.

## Stato del progetto

LowCor è appena passata da sito web ad app desktop. Il piano è in [`SPEC.md`](SPEC.md), i passi in
[`tasks/todo.md`](tasks/todo.md).

- [x] App desktop per Linux e Windows, dati su file, aggiornamenti automatici
- [ ] "Salva con nome" del sistema per backup, PDF e calendari
- [ ] Promemoria come notifiche di sistema, icona nell'area di notifica
- [ ] Passaggio dei dati tra due PC sulla stessa rete, con codice di conferma di 6 cifre

## Sviluppo

Servono [Node.js](https://nodejs.org) 22, [Rust](https://rustup.rs) e, su Linux, le librerie di sistema:

```bash
sudo apt install libwebkit2gtk-4.1-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev libssl-dev \
    libayatana-appindicator3-dev librsvg2-dev libxdo-dev build-essential file \
    gstreamer1.0-plugins-base gstreamer1.0-plugins-good patchelf
```

```bash
npm install
npm run desktop:dev        # l'app in una finestra, con ricarica automatica
npm run dev                # solo l'interfaccia, nel browser (i dati vanno in localStorage)
npm run desktop:build      # .deb e AppImage in src-tauri/target/release/bundle/
sh install.sh --from-source   # compila e installa in ~/.local (senza aggiornamenti automatici)
```

### Test

```bash
npm run lint                                        # oxlint
npm test                                            # logica JS (vitest)
cargo test --manifest-path src-tauri/Cargo.toml     # lato Rust (salvataggio su file, …)
npm run test:e2e                                    # Playwright su Chromium, WebKit e una finestra stretta
```

Su Linux WebKit per Playwright ha bisogno di: `sudo npx playwright install-deps webkit`.

La CI (`.github/workflows/release.yml`) fa lint, test JS, `cargo fmt`, `clippy` e test Rust prima di ogni rilascio.
Per firmare gli aggiornamenti serve nei segreti del repository `TAURI_SIGNING_PRIVATE_KEY` (il contenuto della
chiave creata con `npx tauri signer generate`) e, se la chiave ha una password, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
Senza chiave le versioni escono lo stesso, ma senza aggiornamento automatico.

## Struttura

- `src/` interfaccia React (Vite)
  - `logic/` logica pura (calendario, energia, focus, backup, …) con i test in `__tests__/`
  - `components/` interfaccia per sezione
  - `storage/` salvataggio: `localStorage` nel browser, file su disco nell'app desktop
  - `desktop.js` ponte verso Tauri (comandi Rust, HTTP, aggiornamenti)
  - `i18n/` traduzioni (l'italiano è la chiave, inglese in beta)
- `src-tauri/` app desktop Tauri 2: configurazione, permessi, icone e codice Rust in `src/`
- `public/privacy.html`, `public/terms.html` informativa privacy e termini d'uso
- `e2e/` test Playwright
- `install.sh` installazione per l'utente su Linux

Le versioni web/PWA, Android e iOS (Capacitor) e il backend Supabase sono state tolte il 31/10/2026: si ritrovano
nella cronologia git fino al commit `e9b674a`.

## Licenza

Copyright © 2026 XENON1354.

LowCor è software libero, distribuito con la [GNU General Public License v3.0 o successiva](LICENSE).
Non ha alcuna garanzia. Usa Tauri, React e le altre librerie elencate in `package.json` e `src-tauri/Cargo.toml`,
ognuna con la sua licenza.
