// Vibrazioni brevi per i momenti importanti (metà sessione, ultimo minuto, fine).
// Dove esiste la Vibration API (telefoni Android nel browser) vibra; sul PC restano i segnali visivi.
import { prefersReducedMotion } from "./motion";

export const PATTERNS = {
  tick: [30],
  halfway: [60, 80, 60],
  lastMinute: [40, 60, 40, 60, 40],
  done: [120, 80, 220],
};

export function vibrate(kind) {
  if (prefersReducedMotion()) {
    return;
  }
  const pattern = PATTERNS[kind] || PATTERNS.tick;
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
