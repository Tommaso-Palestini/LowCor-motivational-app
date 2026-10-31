# Task

## Fase 1 — `local-only`
- [x] 1. Togliere account e Supabase dall'app (codice, dipendenza, `supabase/`, test, script). `ConflictDialog` resta per il trasferimento
- [x] 2. Togliere PWA e Capacitor (plugin Vite, `android/`, `ios/`, dipendenze, icone PWA); `native.js` diventa `desktop.js` vuoto
- [x] 3. Privacy, termini e README per un'app senza server
- [x] Checkpoint: `npm run lint && npm test && npm run build` verdi, e2e principali verdi, nessun `supabase` in `src`

## Fase 2 — `desktop-shell`
- [ ] 4. Rust + librerie di sistema; `src-tauri/` creato; `npm run desktop:dev` apre la finestra
- [ ] 5. CSP per Tauri; Ollama e calendari .ics funzionano dall'app
- [ ] 6. `npm run desktop:build` produce .deb e AppImage che si installano e aprono
- [ ] Checkpoint: app installata su Linux, funziona come nel browser

## Fase 3 — `disk-storage`
- [ ] 7. Comandi Rust `load_state`/`save_state` con scrittura atomica (+ test); `storage.js` li usa in Tauri e migra da `localStorage`
- [ ] 8. Backup, PDF e .ics con "Salva con nome" del sistema (plugin dialog + fs)
- [ ] 9. Esporta i miei impegni in `.ics` "solo occupato" / "anche i titoli"
- [ ] Checkpoint: dati sopravvivono a chiusura e reinstallazione

## Fase 4 — `desktop-reminders`
- [ ] 10. Promemoria dei blocchi come notifiche di sistema
- [ ] 11. Tray: chiudere la finestra la nasconde; avvio automatico facoltativo dalle impostazioni

## Fase 5 — `lan-transfer`
- [ ] 12. Rust: annuncio e ricerca mDNS
- [ ] 13. Rust: abbinamento Noise XX + codice di 6 cifre + PC ricordati (+ test)
- [ ] 14. Rust: invio e ricezione dello stato (+ test con due istanze in locale)
- [ ] 15. Schermata "Altri PC": elenco, codice, conferma, `ConflictDialog`
- [ ] Checkpoint: due istanze si passano i dati

## Fase 6 — `release`
- [ ] 16. GitHub Actions: build Linux e Windows
- [ ] 17. `install.sh`, README, CHANGELOG, versione 0.1.0
