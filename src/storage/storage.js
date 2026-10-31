import {
  sampleActivities,
  sampleBlocks,
  sampleCards,
} from "../data/sampleData";
import { defaultSettings } from "../logic/settings";
import { createMandala } from "../logic/mandala";

const STORAGE_KEY = "daily-app-data";
// Lo sfondo personalizzato sta in una chiave a parte: è grande e non serve riscriverlo a ogni modifica.
const BACKGROUND_KEY = "daily-app-background";

const defaultData = {
  activities: sampleActivities,
  blocks: sampleBlocks,
  cards: sampleCards,
  reminders: [],
  // Cose da fare una volta sola: { id, title, notes, date, time, minutes, energy, done, doneAt, createdAt }
  jobs: [],
  // Pensieri catturati al volo, da smistare: { id, text, createdAt }
  inbox: [],
  settings: defaultSettings,
  aura: 0,
  focus: null,
  mandala: createMandala(),
  brainstorm: { fit: [], explore: [] },
  // Date delle "giornate no"
  lowDays: [],
  // Rito della settimana chiuso: { [lunedì]: { doneAt, proud, change, focusId } }
  reviews: {},
  // Calendari esterni importati (.ics): { id, name, url, importedAt, events: [{ id, date, start, end, title }] }
  calendars: [],
  // Traguardi sbloccati: { [id]: data ISO } e contatori che servono a sbloccarli
  achievements: {},
  counters: {},
  // false solo al primissimo avvio: mostra l'onboarding
  onboarded: false,
};

// Completa dei dati salvati (o arrivati da un backup) con i campi aggiunti nelle versioni successive
export function normalizeData(saved) {
  return {
    ...defaultData,
    // Chi aveva già dati prima dell'onboarding non deve rifarlo
    onboarded: true,
    ...saved,
    settings: { ...defaultSettings, ...(saved.settings || {}) },
    brainstorm: { ...defaultData.brainstorm, ...(saved.brainstorm || {}) },
  };
}

// Dove stanno i dati: nel browser in localStorage; nell'app desktop in file nella cartella dati,
// letti una volta all'avvio (initStorage) e poi tenuti in memoria. Le funzioni di lettura restano
// sincrone, così l'interfaccia non cambia; le scritture su disco partono in background.
let backend = browserBackend();

function browserBackend() {
  return {
    read: () => localStorage.getItem(STORAGE_KEY),
    readBackground: () => localStorage.getItem(BACKGROUND_KEY),
    write: (json) => localStorage.setItem(STORAGE_KEY, json),
    writeBackground: (dataUrl) =>
      dataUrl ? localStorage.setItem(BACKGROUND_KEY, dataUrl) : localStorage.removeItem(BACKGROUND_KEY),
    clear: async () => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(BACKGROUND_KEY);
    },
  };
}

// Scrive sempre l'ultima versione, una scrittura per volta: se ne arrivano tante di fila
// (si trascina un blocco) quelle intermedie si saltano.
export function latestWriter(write) {
  let running = null;
  let pending;
  let hasPending = false;
  async function drain() {
    while (hasPending) {
      const value = pending;
      hasPending = false;
      try {
        await write(value);
      } catch (error) {
        console.error("Could not save data:", error);
      }
    }
    running = null;
  }
  return {
    push(value) {
      pending = value;
      hasPending = true;
      running = running || drain();
      return running;
    },
    // Aspetta che sia tutto su disco (prima di cancellare o di chiudere)
    flush: () => running || Promise.resolve(),
  };
}

// Il backend dei file: `invoke` chiama i comandi Rust (load_state, save_state, save_background, clear_state).
// Al primo avvio dell'app desktop sposta sul disco quello che trova in localStorage.
export async function diskBackend(invoke, storage = globalThis.localStorage) {
  const file = await invoke("load_state");
  let data = file.data ?? null;
  let background = file.background ?? null;

  if (data === null && storage) {
    const oldData = storage.getItem(STORAGE_KEY);
    const oldBackground = storage.getItem(BACKGROUND_KEY);
    if (oldData !== null) {
      await invoke("save_state", { json: oldData });
      data = oldData;
    }
    if (oldBackground) {
      await invoke("save_background", { dataUrl: oldBackground });
      background = oldBackground;
    }
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(BACKGROUND_KEY);
  }

  const dataWriter = latestWriter((json) => invoke("save_state", { json }));
  const backgroundWriter = latestWriter((dataUrl) => invoke("save_background", { dataUrl }));
  return {
    read: () => data,
    readBackground: () => background,
    write(json) {
      data = json;
      dataWriter.push(json);
    },
    writeBackground(dataUrl) {
      background = dataUrl || null;
      backgroundWriter.push(background);
    },
    async clear() {
      await Promise.all([dataWriter.flush(), backgroundWriter.flush()]);
      await invoke("clear_state");
      data = null;
      background = null;
    },
  };
}

// Da chiamare prima di disegnare l'app
export async function initStorage() {
  const { isDesktop, invoke } = await import("../desktop");
  if (isDesktop) {
    backend = await diskBackend(invoke);
  }
}

export function loadData() {
  try {
    const raw = backend.read();
    if (raw === null) {
      return defaultData;
    }
    return normalizeData(JSON.parse(raw));
  } catch (error) {
    console.error("Could not load data:", error);
    return defaultData;
  }
}

export function loadBackgroundImage() {
  try {
    return backend.readBackground();
  } catch {
    return null;
  }
}

// Restituisce false se il browser non ha spazio per l'immagine.
export function saveBackgroundImage(dataUrl) {
  try {
    backend.writeBackground(dataUrl);
    return true;
  } catch (error) {
    console.error("Could not save background:", error);
    return false;
  }
}

// Diritto alla cancellazione: via tutto quello che l'app ha salvato su questo dispositivo
export function clearAllData() {
  return backend.clear();
}

export function saveData(data) {
  try {
    backend.write(JSON.stringify(data));
  } catch (error) {
    console.error("Could not save data:", error);
  }
}
