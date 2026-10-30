import { inviteFromText } from "./cloud";

// Un link d'invito (…/#invite=CODICE) apre l'app: il codice si mette da parte finché la persona
// non accede, e si toglie subito dall'indirizzo perché non resti nella cronologia o nei link copiati.
const KEY = "lowcor-pending-invite";

export function capturePendingInvite() {
  if (typeof window === "undefined" || !window.location.hash.startsWith("#invite=")) {
    return null;
  }
  const token = inviteFromText(window.location.hash);
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (token) {
    try {
      sessionStorage.setItem(KEY, token);
    } catch {
      // Senza sessionStorage il codice si potrà comunque incollare a mano
    }
  }
  return token;
}

export function consumePendingInvite() {
  try {
    const token = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return token;
  } catch {
    return null;
  }
}
