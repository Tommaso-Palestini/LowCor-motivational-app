import { jobEnd } from "./jobs";
import { timeToMinutes } from "./time";

// Logica pura dell'account: cosa va sul server, come si decide la prima sincronizzazione,
// quali impegni si mostrano alle persone collegate e come si spiegano gli errori.

// Quanti giorni di impegni vedono le persone collegate, da oggi in avanti
export const SHARE_DAYS = 28;
const MAX_SHARED_ITEMS = 500;

export const SHARE_LEVELS = [
  { id: "none", label: "Niente" },
  { id: "busy", label: "Solo occupato" },
  { id: "details", label: "Anche i titoli" },
];

export const PASSWORD_MIN = 10;

// Il focus in corso è di questo dispositivo: non va sugli altri
export function syncPayload(data) {
  const { focus: _focus, ...rest } = data;
  return rest;
}

// JSON con le chiavi in ordine: il database riordina le chiavi, il confronto non deve accorgersene
export function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

// Al primo login su un dispositivo: carico, scarico o chiedo?
export function initialSync(local, remote) {
  if (!remote) {
    return "upload";
  }
  if (!local.onboarded) {
    return "download";
  }
  if (stableStringify(syncPayload(local)) === stableStringify(syncPayload(remote))) {
    return "same";
  }
  return "ask";
}

function sharedItem(day, start, end, title, kind) {
  const startMin = timeToMinutes(start);
  const endMin = end === "24:00" ? 1440 : timeToMinutes(end);
  if (!(startMin >= 0 && startMin < 1440 && endMin > startMin && endMin <= 1440)) {
    return null;
  }
  return { day, start_min: startMin, end_min: endMin, title: (title || "").slice(0, 120), kind };
}

// Gli impegni da mostrare alle persone collegate: blocchi del calendario e cose da fare con un orario.
// Solo giorno, ora e titolo: niente note, energia o altro.
export function scheduleItems(data, from, to) {
  const names = new Map((data.activities || []).map((activity) => [activity.id, activity.name]));
  const items = [];
  for (const block of data.blocks || []) {
    if (block.date >= from && block.date <= to) {
      items.push(sharedItem(block.date, block.start, block.end, names.get(block.activityId), "block"));
    }
  }
  for (const job of data.jobs || []) {
    if (!job.done && job.date && job.time && job.date >= from && job.date <= to) {
      items.push(sharedItem(job.date, job.time, jobEnd(job), job.title, "job"));
    }
  }
  return items
    .filter(Boolean)
    .sort((a, b) => a.day.localeCompare(b.day) || a.start_min - b.start_min)
    .slice(0, MAX_SHARED_ITEMS);
}

// Raggruppa per giorno gli impegni condivisi che arrivano dal server
export function groupShared(items) {
  const days = new Map();
  for (const item of items) {
    if (!days.has(item.day)) {
      days.set(item.day, []);
    }
    days.get(item.day).push(item);
  }
  return [...days.entries()].map(([day, list]) => ({ day, items: list }));
}

export function passwordProblems(password) {
  const problems = [];
  if (password.length < PASSWORD_MIN) {
    problems.push(`almeno ${PASSWORD_MIN} caratteri`);
  }
  if (!/[a-z]/.test(password)) {
    problems.push("una minuscola");
  }
  if (!/[A-Z]/.test(password)) {
    problems.push("una maiuscola");
  }
  if (!/\d/.test(password)) {
    problems.push("un numero");
  }
  return problems;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length <= 254;
}

const INVITE_PATTERN = /(?:^|invite=|[^A-Za-z0-9_-])([A-Za-z0-9_-]{24})(?![A-Za-z0-9_-])/;

// Il codice d'invito, da solo o dentro il link
export function inviteFromText(text) {
  const match = (text || "").trim().match(INVITE_PATTERN);
  return match ? match[1] : null;
}

export function inviteLink(origin, token) {
  return `${origin}/#invite=${token}`;
}

// Messaggi per le persone, mai i dettagli interni dell'errore
const MESSAGES = {
  invalid_credentials: "Email o password non corretti.",
  email_not_confirmed: "Conferma prima l'email con il codice che ti abbiamo mandato.",
  weak_password: "Password troppo debole: almeno 10 caratteri, con maiuscole, minuscole e numeri.",
  same_password: "La nuova password deve essere diversa da quella di prima.",
  otp_expired: "Codice non valido o scaduto. Chiedine uno nuovo.",
  over_email_send_rate_limit: "Abbiamo già mandato un'email da poco: aspetta un minuto e riprova.",
  over_request_rate_limit: "Troppi tentativi: riprova tra qualche minuto.",
  over_sms_send_rate_limit: "Troppi tentativi: riprova tra qualche minuto.",
  signup_disabled: "Le nuove registrazioni sono chiuse in questo momento.",
  reauthentication_needed: "Per sicurezza accedi di nuovo prima di cambiare la password.",
  consent_required: "Per creare l'account servono i consensi.",
  not_authenticated: "La sessione è scaduta: accedi di nuovo.",
  state_too_large: "I dati superano i 2 MB del salvataggio online: togli qualche calendario importato.",
  too_many_open_invites: "Hai già 5 inviti aperti: aspetta che vengano usati o scadano.",
  invite_rate_limited: "Hai creato troppi inviti oggi: riprova domani.",
  too_many_connections: "Hai raggiunto il massimo di 200 persone collegate.",
  not_connected: "Questa persona non è più collegata.",
  invalid: "Codice d'invito non valido, già usato o scaduto.",
  own_invite: "Questo è un tuo invito: mandalo alla persona che vuoi collegare.",
  rate_limited: "Troppi codici sbagliati: riprova tra un'ora.",
  network: "Nessuna connessione: riprova quando sei online.",
};

export function cloudErrorMessage(error) {
  if (!error) {
    return "";
  }
  if (typeof error === "string") {
    return MESSAGES[error] || MESSAGES.invalid;
  }
  if (error.code && MESSAGES[error.code]) {
    return MESSAGES[error.code];
  }
  const text = `${error.message || ""}`;
  const known = Object.keys(MESSAGES).find((key) => text === key || text.includes(key));
  if (known) {
    return MESSAGES[known];
  }
  if (/Database error saving new user/i.test(text)) {
    return MESSAGES.consent_required;
  }
  if (error.status === 429 || /rate limit/i.test(text)) {
    return MESSAGES.over_request_rate_limit;
  }
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(text)) {
    return MESSAGES.network;
  }
  return "Qualcosa non ha funzionato. Riprova tra poco.";
}
