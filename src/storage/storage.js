import {
  sampleActivities,
  sampleBlocks,
  sampleCards,
} from "../data/sampleData";
import { defaultSettings } from "../logic/settings";
import { createMandala } from "../logic/mandala";

const STORAGE_KEY = "daily-app-data";

const defaultData = {
  activities: sampleActivities,
  blocks: sampleBlocks,
  cards: sampleCards,
  reminders: [],
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

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return defaultData;
    }
    const saved = JSON.parse(raw);
    return {
      ...defaultData,
      // Chi aveva già dati prima dell'onboarding non deve rifarlo
      onboarded: true,
      ...saved,
      settings: { ...defaultSettings, ...(saved.settings || {}) },
      brainstorm: { ...defaultData.brainstorm, ...(saved.brainstorm || {}) },
    };
  } catch (error) {
    console.error("Could not load data:", error);
    return defaultData;
  }
}

// Lo sfondo personalizzato sta in una chiave a parte: è grande e non serve riscriverlo a ogni modifica.
const BACKGROUND_KEY = "daily-app-background";

export function loadBackgroundImage() {
  try {
    return localStorage.getItem(BACKGROUND_KEY);
  } catch {
    return null;
  }
}

// Restituisce false se il browser non ha spazio per l'immagine.
export function saveBackgroundImage(dataUrl) {
  try {
    if (dataUrl) {
      localStorage.setItem(BACKGROUND_KEY, dataUrl);
    } else {
      localStorage.removeItem(BACKGROUND_KEY);
    }
    return true;
  } catch (error) {
    console.error("Could not save background:", error);
    return false;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Could not save data:", error);
  }
}
