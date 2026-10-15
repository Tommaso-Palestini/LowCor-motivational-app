import {
  sampleActivities,
  sampleBlocks,
  sampleCards,
} from "../data/sampleData";
import { defaultSettings } from "../logic/settings";

const STORAGE_KEY = "daily-app-data";

const defaultData = {
  activities: sampleActivities,
  blocks: sampleBlocks,
  cards: sampleCards,
  reminders: [],
  settings: defaultSettings,
  aura: 0,
  focus: null,
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
      ...saved,
      settings: { ...defaultSettings, ...(saved.settings || {}) },
    };
  } catch (error) {
    console.error("Could not load data:", error);
    return defaultData;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Could not save data:", error);
  }
}
