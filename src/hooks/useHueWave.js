import { useEffect } from "react";
import { WAVE_START_HUE } from "../logic/settings";
import { prefersReducedMotion } from "../logic/motion";

// Cambiare --hue fa ricalcolare i colori di tutta la pagina: lo aggiorniamo una volta per grado
// (sotto il grado l'occhio non vede differenza), mai più di 10 volte al secondo,
// e ci fermiamo quando l'app non è visibile.
const MIN_TICK_MS = 100;

// Fa girare la tinta di tutta l'app aggiornando la variabile CSS --hue.
// Da rosso fa il giro di tutti i colori e torna al rosso, come le tastiere gaming a onda.
export function useHueWave({ wave, waveSeconds, hue, motion }) {
  useEffect(() => {
    const root = document.documentElement;
    if (!wave || prefersReducedMotion()) {
      root.style.setProperty("--hue", String(hue));
      return undefined;
    }

    const startedAt = performance.now();
    const period = waveSeconds * 1000;
    const tick = Math.max(period / 360, MIN_TICK_MS);
    let lastHue = null;
    let timerId = null;

    function paint() {
      const progress = ((performance.now() - startedAt) % period) / period;
      const next = Math.round(WAVE_START_HUE + progress * 360) % 360;
      if (next !== lastHue) {
        lastHue = next;
        root.style.setProperty("--hue", String(next));
      }
    }

    function start() {
      if (timerId === null) {
        paint();
        timerId = setInterval(paint, tick);
      }
    }

    function stop() {
      clearInterval(timerId);
      timerId = null;
    }

    function handleVisibility() {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    }

    if (!document.hidden) {
      start();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [wave, waveSeconds, hue, motion]);
}
