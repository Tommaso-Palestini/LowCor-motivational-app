import { describe, expect, it } from "vitest";
import { activityEnergy, suggestRebalance, weekEnergy } from "../energy";
import { ACTIVITIES, WEEK, block } from "./helpers";

const LIMITS = { maxHigh: 3, maxLoad: 10 };

describe("energia", () => {
  it("le attività senza livello contano come media", () => {
    expect(activityEnergy({ id: "x" })).toBe("medium");
    expect(activityEnergy(null)).toBe("medium");
  });

  it("somma i punti del giorno e segnala l'overload oltre la soglia", () => {
    const blocks = ["08:00", "10:00", "12:00", "16:00"].map((start, index) =>
      block("2026-10-28", start, `${String(9 + index * 2).padStart(2, "0")}:00`, "gym")
    );
    const days = weekEnergy(WEEK, blocks, ACTIVITIES, LIMITS);
    expect(days[2]).toMatchObject({ load: 12, high: 4, overloaded: true });
    expect(days[3]).toMatchObject({ load: 0, overloaded: false });
  });

  it("propone di spostare solo quanto basta, nei giorni futuri e senza creare nuovi overload", () => {
    const blocks = ["08:00", "10:00", "12:00", "16:00"].map((start) => block("2026-10-28", start, start.replace(/^(\d\d)/, (h) => String(+h + 1).padStart(2, "0")), "gym"));
    const moves = suggestRebalance(WEEK, blocks, ACTIVITIES, LIMITS, "2026-10-27");
    expect(moves).toHaveLength(1);
    expect(moves[0].to.date > "2026-10-27").toBe(true);
    expect(moves[0].to.date).not.toBe("2026-10-28");
  });
});
