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
