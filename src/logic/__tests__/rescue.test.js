import { describe, expect, it } from "vitest";
import { applyLowDay, minimumVersion, missedBlocks, suggestSlot } from "../rescue";
import { ACTIVITIES, NOW, block } from "./helpers";

const LIMITS = { maxHigh: 3, maxLoad: 10 };

describe("recupero dei blocchi saltati", () => {
  it("trova i saltati degli ultimi 3 giorni, esclusi fatti e lasciati andare", () => {
    const blocks = [
      block("2026-10-26", "18:00", "19:00", "gym"),
      block("2026-10-27", "08:00", "09:00", "diet"),
      block("2026-10-26", "09:00", "10:00", "eng", { done: true }),
      block("2026-10-25", "09:00", "10:00", "eng", { released: true }),
      block("2026-10-20", "09:00", "10:00", "eng"),
      block("2026-10-27", "18:00", "19:00", "gym"),
    ];
    expect(missedBlocks(blocks, NOW).map((item) => item.date)).toEqual(["2026-10-27", "2026-10-26"]);
  });

  it("propone il primo spazio libero da adesso, saltando impegni esterni", () => {
    const missed = block("2026-10-26", "18:00", "19:00", "gym");
    const busy = [{ date: "2026-10-27", start: "12:00", end: "15:00" }];
    const slot = suggestSlot(missed, [missed], ACTIVITIES, NOW, LIMITS, busy);
    expect(slot).toEqual({ date: "2026-10-27", start: "15:00", end: "16:00" });
  });

  it("la giornata no mette in pausa solo le passioni di quel giorno e si può annullare", () => {
    const blocks = [block("2026-10-27", "18:00", "19:00", "eng"), block("2026-10-27", "20:00", "21:00", "gym")];
    const low = applyLowDay(blocks, ACTIVITIES, "2026-10-27", true);
    expect(low[0].released).toBe("low-day");
    expect(low[1].released).toBeUndefined();
    expect(applyLowDay(low, ACTIVITIES, "2026-10-27", false)[0].released).toBe(false);
  });

  it("la versione minima dura 15 minuti", () => {
    expect(minimumVersion(block("2026-10-27", "18:50", "20:00", "gym"))).toEqual({ end: "19:05" });
  });
});
