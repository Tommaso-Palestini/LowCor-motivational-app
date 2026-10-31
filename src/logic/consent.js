// Versione di informativa privacy e termini: se cambiano in modo sostanziale si alza la data
// e l'app chiede di nuovo il consenso a tutti.
export const LEGAL_VERSION = "2026-10-31";

export function hasConsent(data) {
  return data.consent?.version === LEGAL_VERSION;
}

export function consentRecord(now = new Date()) {
  return { version: LEGAL_VERSION, acceptedAt: now.toISOString() };
}

export const LEGAL_PAGES = {
  privacy: { file: "privacy.html", title: "Privacy" },
  terms: { file: "terms.html", title: "Termini d'uso" },
};

// Le pagine legali si aprono in una finestra dentro l'app (nell'app desktop un link
// porterebbe fuori, nel browser di sistema): i link mandano questo evento.
const LEGAL_EVENT = "lowcor:legal";

export function openLegal(page) {
  window.dispatchEvent(new CustomEvent(LEGAL_EVENT, { detail: page }));
}

export function onOpenLegal(callback) {
  const handler = (event) => callback(event.detail);
  window.addEventListener(LEGAL_EVENT, handler);
  return () => window.removeEventListener(LEGAL_EVENT, handler);
}
