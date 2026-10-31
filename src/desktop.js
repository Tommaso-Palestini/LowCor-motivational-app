// Ponte verso l'app desktop (Tauri). Con `npm run dev` nel browser e nei test end-to-end
// Tauri non c'è: isDesktop è false e l'app usa le API del browser.
export const isDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

// Chiama un comando Rust. L'import è dinamico: nel browser il modulo non viene nemmeno scaricato.
export async function invoke(command, args) {
  const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
  return tauriInvoke(command, args);
}
