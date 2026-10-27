export const DEFAULT_AI_URL = "http://localhost:11434";

export const defaultSettings = {
  language: "it",
  // Aspetto: stile del testo, dimensione, contrasto, movimento
  font: "morbido",
  textSize: "medium",
  contrast: "normal",
  motion: "full",
  wave: true,
  waveSeconds: 90,
  hue: 290,
  lava: true,
  // "lava" o "image" (la foto scelta dall'utente); backgroundDim è quanto la scuriamo, in %
  background: "lava",
  backgroundDim: 55,
  // Nome per la copertina e la firma del PDF da condividere
  userName: "",
  // Cosa mostra "Mentre aspetti": "all", "micro-task" o "fact"
  feedFilter: "all",
  // Promemoria dei blocchi: prima dell'inizio, all'inizio e alla fine
  blockAlerts: true,
  alertMinutes: 5,
  fullGas: true,
  aiUrl: DEFAULT_AI_URL,
  aiModel: "",
  aiAutoCards: true,
  // Oltre queste soglie un giorno è in "Rischio overload"
  energyMaxHigh: 3,
  energyMaxLoad: 10,
};

export const WAVE_START_HUE = 25;
