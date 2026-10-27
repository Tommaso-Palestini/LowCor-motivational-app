import { describe, expect, it } from "vitest";
import { backupFilename, backupSummary, createBackup, parseBackup } from "../backup";

const DATA = { activities: [{ id: "a" }], blocks: [{ id: "b1" }, { id: "b2" }], settings: { hue: 10 } };

describe("backup", () => {
  it("un backup appena creato si rilegge identico", () => {
    const backup = createBackup(DATA, "data:image/jpeg;base64,AAAA", new Date("2026-10-27T10:00:00Z"));
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.data).toEqual(DATA);
    expect(parsed.backgroundImage).toBe("data:image/jpeg;base64,AAAA");
    expect(parsed.exportedAt).toBe("2026-10-27T10:00:00.000Z");
    expect(backupSummary(parsed.data)).toEqual({ activities: 1, blocks: 2 });
  });

  it("dà il nome del file dalla data", () => {
    expect(backupFilename("2026-10-27")).toBe("lowcor-backup-2026-10-27.json");
  });

  it("rifiuta file che non sono backup di LowCor", () => {
    expect(() => parseBackup("non json")).toThrow("non è un backup valido");
    expect(() => parseBackup(JSON.stringify({ app: "altro", version: 1, data: DATA }))).toThrow("non è un backup di LowCor");
    expect(() => parseBackup(JSON.stringify({ app: "lowcor", version: 1, data: { activities: [] } }))).toThrow("incompleto");
    expect(() => parseBackup(JSON.stringify({ app: "lowcor", version: 99, data: DATA }))).toThrow("più nuova");
  });

  it("ignora uno sfondo che non è un'immagine", () => {
    const backup = { ...createBackup(DATA, null), backgroundImage: "javascript:alert(1)" };
    expect(parseBackup(JSON.stringify(backup)).backgroundImage).toBeNull();
  });
});
