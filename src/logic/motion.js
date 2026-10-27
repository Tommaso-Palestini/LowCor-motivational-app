// Movimento ridotto se lo chiede il sistema oppure se l'utente l'ha scelto in Impostazioni > Aspetto.
export function prefersReducedMotion() {
  return (
    document.documentElement.dataset.motion === "reduced" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
