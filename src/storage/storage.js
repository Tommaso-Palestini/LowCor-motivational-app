import {
  sampleActivities,
  sampleBlocks,
  sampleCards,
} from "../data/sampleData";

const STORAGE_KEY = "daily-app-data";

const defaultData = {
  activities: sampleActivities,
  blocks: sampleBlocks,
  cards: sampleCards,
  reminders: [],
};

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return defaultData;
    }
    return { ...defaultData, ...JSON.parse(raw) };
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