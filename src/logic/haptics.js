// Vibrazioni brevi per i momenti importanti (metà sessione, ultimo minuto, fine).
// Sul telefono Android usa la Vibration API; nell'app nativa (Capacitor) passa dal plugin Haptics.
// Su iPhone nel browser non esiste: lì restano solo i segnali visivi.
import { prefersReducedMotion } from "./motion";

export const PATTERNS = {
  tick: [30],
  halfway: [60, 80, 60],
  lastMinute: [40, 60, 40, 60, 40],
  done: [120, 80, 220],
};

let nativeHaptics = null;

// Chiamata da native.js quando l'app gira dentro Capacitor
export function setNativeHaptics(impl) {
  nativeHaptics = impl;
}

export function vibrate(kind) {
  if (prefersReducedMotion()) {
    return;
  }
  const pattern = PATTERNS[kind] || PATTERNS.tick;
  if (nativeHaptics) {
    nativeHaptics(kind, pattern);
    return;
  }
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
