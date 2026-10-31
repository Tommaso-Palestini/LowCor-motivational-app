// Ponte verso l'app desktop (Tauri). Con `npm run dev` nel browser e nei test end-to-end
// Tauri non c'è: isDesktop è false e l'app usa le API del browser.
export const isDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// Chiama un comando Rust. L'import è dinamico: nel browser il modulo non viene nemmeno scaricato.
export async function invoke(command, args) {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke(command, args);
}

// fetch per indirizzi esterni (Ollama, calendari .ics). Nell'app desktop passa dal lato Rust:
// niente blocchi CORS, così funzionano anche i calendari di Google e iCloud e Ollama su Windows.
export async function appFetch(url, options) {
  if (!isDesktop) {
    return fetch(url, options);
  }
  const { fetch: tauriFetch } = await import("@tauri-apps/plugin-http");
  return tauriFetch(url, options);
}

// Cerca una versione nuova su GitHub. Restituisce l'aggiornamento o null (anche se questa
// installazione non può aggiornarsi da sola, o se non c'è rete: non è un errore da mostrare).
export async function findUpdate() {
  if (!isDesktop || !(await invoke("update_supported"))) {
    return null;
  }
  const { check } = await import("@tauri-apps/plugin-updater");
  return check();
}

// Scarica, installa e riavvia. onProgress riceve un numero da 0 a 1 (o null se la dimensione non è nota).
export async function installUpdate(update, onProgress) {
  let total = 0;
  let received = 0;
  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      total = event.data.contentLength || 0;
    } else if (event.event === "Progress") {
      received += event.data.chunkLength;
      onProgress(total ? Math.min(received / total, 1) : null);
    }
  });
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
