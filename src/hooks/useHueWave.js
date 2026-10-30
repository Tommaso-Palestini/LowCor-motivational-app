import { useEffect } from "react";
import { WAVE_START_HUE } from "../logic/settings";
import { prefersReducedMotion } from "../logic/motion";
import { isScrolling } from "../logic/scrolling";

// Cambiare --hue fa ricalcolare i colori di tutta la pagina: lo aggiorniamo una volta per grado
// (sotto il grado l'occhio non vede differenza), mai più di 10 volte al secondo,
// e ci fermiamo quando l'app non è visibile o mentre l'utente scorre.
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

    const period = waveSeconds * 1000;
    const tick = Math.max(period / 360, MIN_TICK_MS);
    // L'onda ha un suo orologio, che avanza solo quando non si scorre: alla ripresa niente salti di colore
    let elapsed = 0;
    let lastTime = performance.now();
    let lastHue = null;
    let timerId = null;

    function paint() {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;
      if (isScrolling()) {
        return;
      }
      elapsed += Math.min(delta, tick * 2);
      const progress = (elapsed % period) / period;
      const next = Math.round(WAVE_START_HUE + progress * 360) % 360;
      if (next !== lastHue) {
        lastHue = next;
        root.style.setProperty("--hue", String(next));
      }
    }

    function start() {
      if (timerId === null) {
        lastTime = performance.now();
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
