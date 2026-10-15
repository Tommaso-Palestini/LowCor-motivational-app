import { useEffect } from "react";
import { WAVE_START_HUE } from "../logic/settings";

const TICK_MS = 80;

// Fa girare la tinta di tutta l'app aggiornando la variabile CSS --hue.
// Da rosso fa il giro di tutti i colori e torna al rosso, come le tastiere gaming a onda.
export function useHueWave({ wave, waveSeconds, hue }) {
  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!wave || reduceMotion) {
      root.style.setProperty("--hue", String(hue));
      return undefined;
    }

    const startedAt = performance.now();
    const period = waveSeconds * 1000;

    function paint() {
      const progress = ((performance.now() - startedAt) % period) / period;
      root.style.setProperty("--hue", (WAVE_START_HUE + progress * 360).toFixed(1));
    }

    paint();
    const timerId = setInterval(paint, TICK_MS);
    return () => clearInterval(timerId);
  }, [wave, waveSeconds, hue]);
}
