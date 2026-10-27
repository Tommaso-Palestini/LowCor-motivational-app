// Tutto quello che chiediamo all'AI: le carte del feed, il brainstorming e lo schema 9×9.
// Ogni funzione prepara il contesto, manda la richiesta e ripulisce la risposta.

import { chatJson } from "./ai";
import { findActivityByName } from "./activities";
import { addDays, formatDate, getWeekRange, toDateString } from "./dates";
import { freeWindows } from "./calendar";
import { blocksOverlap, minutesOfDay, minutesToTime, timeToMinutes } from "./time";
import { getWeekSummary } from "./planner";
import { ACTION_COUNT, PILLAR_COUNT } from "./mandala";

const COACH =
  "Sei il coach dentro LowCor, un'app personale per organizzare giornate, abitudini e obiettivi. " +
  "Scrivi sempre in italiano, tono informale e diretto, energico ma senza frasi motivazionali vuote. " +
  "Sei concreto: ogni suggerimento si può fare davvero, oggi.";

const HISTORY_LIMIT = 8;
const DAY_START = 8 * 60;
const DAY_END = 22 * 60;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function describeActivity(activity) {
  const kind = activity.type === "fixed" ? "abitudine fissa" : "passione";
  const period = activity.goal.period === "week" ? "a settimana" : "al giorno";
  const focus = activity.status === "focus" ? ", IN FOCUS adesso" : "";
  const parked = activity.status === "parked" ? `, in pausa (nota: ${activity.resumeNote || "nessuna"})` : "";
  return `- ${activity.name} (${kind}, ${activity.goal.amount} volte ${period}${focus}${parked})`;
}

function describeGoal(mandala) {
  if (!mandala || mandala.goal === "") {
    return "";
  }
  const pillars = mandala.pillars.map((pillar) => pillar.title).filter(Boolean);
  return `Obiettivo grande: ${mandala.goal}${pillars.length ? `. Pilastri: ${pillars.join(", ")}` : ""}.`;
}

function trimHistory(messages) {
  return messages
    .filter((message) => !message.error && !message.stopped)
    .slice(-HISTORY_LIMIT)
    .map((message) => ({
    role: message.role,
    content: message.text || "",
  }));
}

// ---- Carte del feed ----

export async function requestCards({ ai, activities, cards, mandala, count = 6, signal }) {
  const available = activities.filter((activity) => activity.status !== "parked");
  if (available.length === 0) {
    return [];
  }
  const names = available.map((activity) => activity.name);
  const liked = cards.filter((card) => card.completed > card.skipped).slice(-8);
  const disliked = cards.filter((card) => card.skipped > card.completed).slice(-6);
  const recent = cards.slice(-20).map((card) => `- ${card.text}`);

  const prompt = [
    `Genera ${count} carte per il feed da scorrere nei tempi morti, al posto dei reel.`,
    "Attività:",
    ...available.map(describeActivity),
    describeGoal(mandala),
    liked.length ? `Carte che gli sono piaciute:\n${liked.map((card) => `- ${card.text}`).join("\n")}` : "",
    disliked.length ? `Carte che ha saltato (evita cose simili):\n${disliked.map((card) => `- ${card.text}`).join("\n")}` : "",
    recent.length ? `Carte che ha già, non ripeterle:\n${recent.join("\n")}` : "",
    "Regole:",
    '- Circa metà "micro-task": una cosa concreta da fare in 2-10 minuti, con un numero o un dettaglio preciso.',
    '- Circa metà "fact": una curiosità vera, sorprendente e verificabile legata all\'attività. Se non sei sicuro che sia vera, fai un micro-task.',
    "- Dai più carte all'attività in focus.",
    "- Massimo 140 caratteri per carta, una frase sola, niente emoji.",
  ]
    .filter(Boolean)
    .join("\n");

  const schema = {
    type: "object",
    properties: {
      cards: {
        type: "array",
        minItems: 1,
        maxItems: count,
        items: {
          type: "object",
          properties: {
            activity: { type: "string", enum: names },
            type: { type: "string", enum: ["micro-task", "fact"] },
            text: { type: "string" },
          },
          required: ["activity", "type", "text"],
        },
      },
    },
    required: ["cards"],
  };

  const result = await chatJson({
    ai,
    schema,
    signal,
    temperature: 0.9,
    messages: [
      { role: "system", content: COACH },
      { role: "user", content: prompt },
    ],
  });

  return (result.cards || [])
    .map((card) => {
      const activity = findActivityByName(available, card.activity || "");
      const text = (card.text || "").trim().slice(0, 200);
      if (!activity || text === "") {
        return null;
      }
      return {
        activityId: activity.id,
        type: card.type === "fact" ? "fact" : "micro-task",
        text,
        source: "ai",
      };
    })
    .filter(Boolean);
}

// ---- Brainstorming: Incastra ----

function nextDates(now, days = 7) {
  const today = toDateString(now);
  return Array.from({ length: days }, (_, index) => addDays(today, index));
}

function describeWeek(data, now) {
  const today = toDateString(now);
  const nameOf = (block) => {
    const activity = data.activities.find((item) => item.id === block.activityId);
    return activity ? activity.name : "Blocco";
  };

  return nextDates(now).map((date) => {
    const dayBlocks = data.blocks
      .filter((block) => block.date === date)
      .sort((a, b) => a.start.localeCompare(b.start));
    const from = date === today ? Math.max(DAY_START, Math.ceil(minutesOfDay(now) / 15) * 15) : DAY_START;
    const windows = from < DAY_END ? freeWindows(dayBlocks, from, DAY_END) : [];
    const busy = dayBlocks.map((block) => `${block.start}-${block.end} ${nameOf(block)}${block.done ? " (fatto)" : ""}`);
    const free = windows.map((window) => `${minutesToTime(window.start)}-${minutesToTime(window.end)}`);
    return [
      `${date} (${formatDate(date, { weekday: "long" })}${date === today ? ", oggi" : ""})`,
      `  occupato: ${busy.length ? busy.join(", ") : "niente"}`,
      `  libero: ${free.length ? free.join(", ") : "niente"}`,
    ].join("\n");
  });
}

function describeGoalsLeft(data, now) {
  const { start } = getWeekRange(now);
  return getWeekSummary(data.activities, data.blocks, start, now)
    .filter((row) => row.missing > 0)
    .map((row) => `- ${row.activity.name}: mancano ${row.missing} sessioni questa settimana`);
}

function cleanProposal(raw, data, allowedDates) {
  const start = (raw.start || "").trim();
  const end = (raw.end || "").trim();
  const date = (raw.date || "").trim();
  if (!allowedDates.includes(date) || !TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) {
    return null;
  }
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    return null;
  }
  const activityName = (raw.activity || "").trim();
  if (activityName === "") {
    return null;
  }
  const activity = findActivityByName(data.activities, activityName);
  const draft = { date, start, end };
  const conflicts = data.blocks.filter((block) => blocksOverlap(block, draft));
  return {
    ...draft,
    activityName: activity ? activity.name : activityName,
    activityId: activity ? activity.id : null,
    why: (raw.why || "").trim(),
    conflict: conflicts.length > 0,
  };
}

export async function brainstormFit({ ai, data, now, history, signal, onReply }) {
  const allowedDates = nextDates(now);
  const activeNames = data.activities.filter((item) => item.status !== "parked").map((item) => item.name);

  const system = [
    COACH,
    "Modalità INCASTRA: aiuti a far entrare le cose nella settimana senza sovrapposizioni.",
    `Adesso è ${formatDate(toDateString(now), { weekday: "long", day: "numeric", month: "long" })}, ore ${minutesToTime(minutesOfDay(now))}.`,
    "Attività che ha:",
    ...data.activities.map(describeActivity),
    describeGoal(data.mandala),
    "Prossimi 7 giorni (usa SOLO gli orari liberi):",
    ...describeWeek(data, now),
    ...describeGoalsLeft(data, now),
    "Rispondi con:",
    '- "reply": 1-3 frasi, il ragionamento in breve.',
    `- "proposals": i blocchi da aggiungere. "activity" è il nome di un'attività esistente (${activeNames.join(", ")}) oppure una cosa nuova chiesta da lui. "date" in formato AAAA-MM-GG, "start" ed "end" in formato HH:MM dentro gli orari liberi. "why" è il motivo in poche parole.`,
    "Lascia sempre 15 minuti di respiro tra un blocco e l'altro. Se non serve proporre blocchi, lascia proposals vuoto.",
  ]
    .filter(Boolean)
    .join("\n");

  const schema = {
    type: "object",
    properties: {
      reply: { type: "string" },
      proposals: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          properties: {
            activity: { type: "string" },
            date: { type: "string", enum: allowedDates },
            start: { type: "string" },
            end: { type: "string" },
            why: { type: "string" },
          },
          required: ["activity", "date", "start", "end", "why"],
        },
      },
    },
    required: ["reply", "proposals"],
  };

  const result = await chatJson({
    ai,
    schema,
    signal,
    temperature: 0.4,
    onText: onReply,
    messages: [{ role: "system", content: system }, ...trimHistory(history)],
  });

  return {
    reply: (result.reply || "").trim(),
    proposals: (result.proposals || [])
      .map((proposal) => cleanProposal(proposal, data, allowedDates))
      .filter(Boolean),
  };
}

// ---- Brainstorming: Esplora ----

export async function brainstormExplore({ ai, data, history, signal, onReply }) {
  const liked = data.cards.filter((card) => card.completed > card.skipped).slice(-8);

  const system = [
    COACH,
    "Modalità ESPLORA: lo aiuti a trovare cose nuove da fare o da imparare, oppure nuovi modi di unire le sue passioni.",
    "Si appassiona in fretta e dopo una settimana perde interesse: proponi cose con un risultato visibile in pochi giorni e un primo passo piccolissimo.",
    "Attività che ha già:",
    ...data.activities.map(describeActivity),
    describeGoal(data.mandala),
    liked.length ? `Carte del feed che gli sono piaciute:\n${liked.map((card) => `- ${card.text}`).join("\n")}` : "",
    "Rispondi con:",
    '- "reply": 1-3 frasi.',
    '- "ideas": da 0 a 4 idee. "title" breve (massimo 5 parole, sarà il nome dell\'attività), "kind" tra "impara", "fai" e "progetto", "why" perché fa per lui, "firstStep" il primo passo da 10 minuti.',
    "Non riproporre attività che ha già. Se sta solo chiacchierando, ideas può essere vuoto.",
  ]
    .filter(Boolean)
    .join("\n");

  const schema = {
    type: "object",
    properties: {
      reply: { type: "string" },
      ideas: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            kind: { type: "string", enum: ["impara", "fai", "progetto"] },
            why: { type: "string" },
            firstStep: { type: "string" },
          },
          required: ["title", "kind", "why", "firstStep"],
        },
      },
    },
    required: ["reply", "ideas"],
  };

  const result = await chatJson({
    ai,
    schema,
    signal,
    temperature: 0.9,
    onText: onReply,
    messages: [{ role: "system", content: system }, ...trimHistory(history)],
  });

  return {
    reply: (result.reply || "").trim(),
    ideas: (result.ideas || [])
      .map((idea) => ({
        title: (idea.title || "").trim().slice(0, 48),
        kind: idea.kind || "fai",
        why: (idea.why || "").trim(),
        firstStep: (idea.firstStep || "").trim(),
      }))
      .filter((idea) => idea.title !== "" && idea.firstStep !== ""),
  };
}

// ---- Schema 9×9 ----

function describeMandala(mandala) {
  return mandala.pillars
    .map((pillar, index) => {
      const actions = pillar.actions.map((action) => action.text).filter(Boolean);
      return `${index + 1}. ${pillar.title || "(vuoto)"}${actions.length ? `: ${actions.join("; ")}` : ""}`;
    })
    .join("\n");
}

const SHORT_LIST = (size) => ({
  type: "object",
  properties: {
    items: { type: "array", minItems: size, maxItems: size, items: { type: "string" } },
  },
  required: ["items"],
});

export async function suggestPillars({ ai, mandala, signal }) {
  const missing = mandala.pillars.filter((pillar) => pillar.title === "").length;
  const prompt = [
    `Obiettivo al centro dello schema 9×9 (metodo Harada): "${mandala.goal}".`,
    "Pilastri attuali:",
    describeMandala(mandala),
    `Proponi ${missing} pilastri nuovi per i posti vuoti: le aree su cui lavorare per arrivare all'obiettivo.`,
    "Pensa anche a corpo, mente, carattere e abitudini, non solo alla tecnica.",
    "Massimo 3 parole per pilastro, diversi da quelli già presenti.",
  ].join("\n");

  const result = await chatJson({
    ai,
    schema: SHORT_LIST(missing),
    signal,
    temperature: 0.7,
    messages: [
      { role: "system", content: COACH },
      { role: "user", content: prompt },
    ],
  });
  return (result.items || []).slice(0, PILLAR_COUNT);
}

export async function suggestActions({ ai, mandala, pillarIndex, signal }) {
  const pillar = mandala.pillars[pillarIndex];
  const missing = pillar.actions.filter((action) => action.text === "").length;
  const written = pillar.actions.map((action) => action.text).filter(Boolean);
  const prompt = [
    `Obiettivo: "${mandala.goal}". Pilastro: "${pillar.title}".`,
    written.length ? `Azioni già scritte: ${written.join("; ")}.` : "",
    `Proponi ${missing} azioni concrete e misurabili per questo pilastro, diverse da quelle già scritte.`,
    "Ogni azione massimo 6 parole, comincia con un verbo, devono stare in una casella piccola.",
  ]
    .filter(Boolean)
    .join("\n");

  const result = await chatJson({
    ai,
    schema: SHORT_LIST(missing),
    signal,
    temperature: 0.7,
    messages: [
      { role: "system", content: COACH },
      { role: "user", content: prompt },
    ],
  });
  return (result.items || []).slice(0, ACTION_COUNT);
}

// ---- Scomposizione task / obiettivi in micro-step da meno di 10 minuti ----

function generateMockMicroSteps(title) {
  const lower = (title || "").toLowerCase();

  if (lower.includes("inglese") || lower.includes("lingua") || lower.includes("spagnolo") || lower.includes("tedesco")) {
    return [
      { text: "Ascolta 1 breve podcast o spezzone audio da 3 minuti in lingua originale", minutes: 3 },
      { text: "Trascrivi 3 nuovi vocaboli incontrati e cerca un sinonimo comune", minutes: 4 },
      { text: "Formula e pronuncia ad alta voce 2 frasi usando i nuovi vocaboli", minutes: 3 },
      { text: "Ripassa velocemente le 3 parole con la tecnica del richiamo attivo", minutes: 2 },
    ];
  }

  if (lower.includes("palestra") || lower.includes("allen") || lower.includes("corsa") || lower.includes("sport") || lower.includes("workout")) {
    return [
      { text: "Prepara la borsa, la borraccia d'acqua e allacciati le scarpe da ginnastica", minutes: 3 },
      { text: "Esegui 4 minuti di mobilità articolare e riscaldamento dinamico", minutes: 4 },
      { text: "Completa la prima serie del primo esercizio a carico controllato", minutes: 5 },
      { text: "Bevi un sorso d'acqua e registra peso e ripetizioni sulle note", minutes: 2 },
    ];
  }

  if (lower.includes("dieta") || lower.includes("mangia") || lower.includes("cucina") || lower.includes("pasto") || lower.includes("nutriz")) {
    return [
      { text: "Pianifica i macronutrienti e gli ingredienti del prossimo pasto", minutes: 3 },
      { text: "Controlla nel frigo le verdure fresche e lavane una porzione", minutes: 4 },
      { text: "Pesa e porziona la fonte proteica principale", minutes: 3 },
      { text: "Bevi un bicchiere d'acqua grande prima di accendere i fornelli", minutes: 1 },
    ];
  }

  if (lower.includes("blender") || lower.includes("3d") || lower.includes("modell") || lower.includes("render")) {
    return [
      { text: "Apri il file di progetto ed elimina le geometrie o i modificatori inutilizzati", minutes: 4 },
      { text: "Posiziona la camera e imposta una prima luce guida per la scena", minutes: 5 },
      { text: "Modella o rifinisci un singolo dettaglio o loop di vertici sull'oggetto", minutes: 7 },
      { text: "Lancia un render di prova veloce a bassa risoluzione (viewport render)", minutes: 2 },
    ];
  }

  if (lower.includes("studio") || lower.includes("studi") || lower.includes("esame") || lower.includes("leggi") || lower.includes("libro")) {
    return [
      { text: "Sfoglia il capitolo leggendo solo titoli, sottotitoli e grafici riassuntivi", minutes: 3 },
      { text: "Leggi con attenzione le prime 2 pagine evidenziando i concetti cardine", minutes: 6 },
      { text: "Scrivi a margine una domanda chiave per testare la comprensione", minutes: 3 },
      { text: "Spiega il concetto principale ad alta voce senza guardare il testo", minutes: 3 },
    ];
  }

  if (lower.includes("podcast") || lower.includes("audio") || lower.includes("video") || lower.includes("post")) {
    return [
      { text: "Scrivi su carta l'idea centrale o la domanda a cui vuoi rispondere", minutes: 3 },
      { text: "Butta giù una scaletta essenziale in 3 punti chiave (intro, corpo, chiusura)", minutes: 5 },
      { text: "Registra una prima prova vocale di 60 secondi col registratore dello smartphone", minutes: 4 },
      { text: "Riascolta al volo e segna l'eventuale passaggio da chiarire o rifinire", minutes: 2 },
    ];
  }

  if (lower.includes("codice") || lower.includes("programm") || lower.includes("app") || lower.includes("bug") || lower.includes("svilupp")) {
    return [
      { text: "Definisci lo scopo della funzione o del componente in un commento iniziale", minutes: 3 },
      { text: "Crea il file e imposta i parametri di input e il valore atteso in output", minutes: 5 },
      { text: "Scrivi il primo blocco logico di base per il caso comune (happy path)", minutes: 8 },
      { text: "Verifica subito il funzionamento con un test rapido o log a schermo", minutes: 2 },
    ];
  }

  const clean = title.length > 30 ? title.slice(0, 30) + "..." : title;
  return [
    { text: `Definisci su carta il risultato minimo del primo passo per "${clean}"`, minutes: 3 },
    { text: `Raccogli gli strumenti o apri i file necessari chiudendo ogni altra distrazione`, minutes: 4 },
    { text: `Esegui la prima micro-azione pratica per 7 minuti filati senza cercare la perfezione`, minutes: 7 },
    { text: `Verifica il progresso ottenuto e annota la prima mossa per la sessione successiva`, minutes: 2 },
  ];
}

export async function decomposeTask({ ai, title, signal }) {
  if (ai && ai.isReady) {
    try {
      const schema = {
        type: "object",
        properties: {
          steps: {
            type: "array",
            minItems: 3,
            maxItems: 4,
            items: {
              type: "object",
              properties: {
                text: { type: "string" },
                minutes: { type: "number" },
              },
              required: ["text", "minutes"],
            },
          },
        },
        required: ["steps"],
      };

      const prompt = [
        `Scomponi questo task o obiettivo complesso in esattamente 3 o 4 micro-step pratici, concreti ed eseguibili in meno di 10 minuti ciascuno:`,
        `"${title}"`,
        `Regole tassative:`,
        `- Restituisci tra 3 e 4 micro-step (non di meno, non di più).`,
        `- Ogni micro-step deve essere rapido e richiedere tra 2 e 10 minuti (indica la stima in minuti).`,
        `- Inizia ogni micro-step con un verbo d'azione all'infinito o imperativo (es: "Scrivi...", "Apri...", "Verifica...").`,
        `- Nessuna teoria o frase generica: solo azioni concrete e fattibili subito che sbloccano l'inerzia.`,
        `- Lingua: italiano.`,
      ].join("\n");

      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Timeout AI")), 12000);
      });

      const chatPromise = chatJson({
        ai,
        schema,
        signal,
        temperature: 0.6,
        messages: [
          { role: "system", content: COACH },
          { role: "user", content: prompt },
        ],
      });

      const result = await Promise.race([chatPromise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
      if (result && Array.isArray(result.steps) && result.steps.length >= 2) {
        return result.steps.slice(0, 4).map((step, index) => ({
          id: `step-${Date.now()}-${index}`,
          text: step.text,
          minutes: typeof step.minutes === "number" && step.minutes > 0 ? Math.min(step.minutes, 10) : 5,
          done: false,
        }));
      }
    } catch (error) {
      if (error.name === "AbortError") {
        throw error;
      }
      console.warn("Chiamata Ollama non riuscita o lenta, uso mock API locale:", error.message);
    }
  }

  // Fallback: mock API con simulazione di caricamento (850ms) per mostrare l'animazione
  await new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, 850);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });

  const rawSteps = generateMockMicroSteps(title);
  return rawSteps.map((step, index) => ({
    id: `step-${Date.now()}-${index}`,
    text: step.text,
    minutes: step.minutes || 5,
    done: false,
  }));
}
