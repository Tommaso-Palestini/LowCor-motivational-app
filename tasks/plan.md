# Piano: LowCor app desktop locale

Spec: `SPEC.md` (approvata il 31/10/2026). Task in `tasks/todo.md`.

## Decisioni di architettura

- **Tauri 2**: l'interfaccia React resta servita da Vite. Rust sta sotto e fa solo quello che il browser non
  sa fare: file su disco, notifiche, tray, rete locale.
- **Un solo ponte JS** (`src/desktop.js`) verso Tauri, con import dinamici: in `vite dev` e nei test
  Playwright l'app gira ancora nel browser normale, con `localStorage`.
- **Stato su file**: `data.json` nella cartella dati dell'app, scritto in modo atomico (file temporaneo e poi
  rename). Lo sfondo resta un file a parte (`background.txt`).
- **Rete locale**: mDNS `_lowcor._tcp` per trovarsi, TCP per i dati, Noise `XX_25519_ChaChaPoly_BLAKE2s`
  (crate `snow`) per cifrare. Il codice di 6 cifre si ricava dall'hash dell'handshake, così un intermediario
  non può far comparire lo stesso codice sui due schermi. Si resta in ascolto solo con la schermata aperta.
- **Trasferimento** = copia di tutto lo stato (formato del backup), poi la scelta di `ConflictDialog`.
- **Condivisione con altre persone** = file `.ics` "solo occupato" / "anche i titoli".

## Rischi

| Rischio | Impatto | Mitigazione |
|---|---|---|
| WebKitGTK blocca `fetch` verso `http://localhost:11434` dall'origine `tauri://` | Medio | Proxy dal lato Rust (plugin http) |
| Firewall di Windows blocca la porta di ascolto | Medio | Messaggio chiaro; Windows chiede il permesso la prima volta |
| mDNS bloccato da alcune reti (Wi-Fi ospiti, isolamento client) | Medio | Ripiego: indirizzo e porta mostrati a schermo, da digitare |
| Build Windows solo da CI, non provabile qui | Medio | Installer scaricato e provato a mano prima della 0.1.0 |
