export const DEFAULT_AI_URL = "http://localhost:11434";

export const defaultSettings = {
  wave: true,
  waveSeconds: 90,
  hue: 290,
  lava: true,
  fullGas: true,
  aiUrl: DEFAULT_AI_URL,
  aiModel: "",
  aiAutoCards: true,
  // Oltre queste soglie un giorno è in "Rischio overload"
  energyMaxHigh: 3,
  energyMaxLoad: 10,
};

export const WAVE_START_HUE = 25;
