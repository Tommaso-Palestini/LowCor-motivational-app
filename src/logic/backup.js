// Backup dei dati in un file JSON: l'unico modo, finché non c'è un account, per passare a un altro
// telefono o non perdere tutto se il browser cancella i dati del sito.
export const BACKUP_APP = "lowcor";
export const BACKUP_VERSION = 1;

// Le chiavi senza le quali un file non è un backup di LowCor
const REQUIRED_LISTS = ["activities", "blocks"];

export function createBackup(data, backgroundImage, now = new Date()) {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data,
    backgroundImage: backgroundImage || null,
  };
}

export function backupFilename(date) {
  return `lowcor-backup-${date}.json`;
}

// Legge il testo di un file di backup. Lancia un errore con un messaggio da mostrare all'utente.
export function parseBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error("Il file non è un backup valido");
  }
  if (!backup || backup.app !== BACKUP_APP || typeof backup.data !== "object" || backup.data === null) {
    throw new Error("Il file non è un backup di LowCor");
  }
  if (typeof backup.version !== "number" || backup.version > BACKUP_VERSION) {
    throw new Error("Backup creato da una versione più nuova dell'app: aggiornala e riprova");
  }
  if (REQUIRED_LISTS.some((key) => !Array.isArray(backup.data[key]))) {
    throw new Error("Il backup è incompleto");
  }
  const image = typeof backup.backgroundImage === "string" && backup.backgroundImage.startsWith("data:image/")
    ? backup.backgroundImage
    : null;
  return { data: backup.data, backgroundImage: image, exportedAt: backup.exportedAt || null };
}

// Due righe di riepilogo per chiedere conferma prima di sostituire i dati
export function backupSummary(data) {
  return {
    activities: data.activities.length,
    blocks: data.blocks.length,
  };
}
