import { describe, expect, it } from "vitest";
import { activityStats } from "../activityStats";
import { monthStats } from "../monthStats";
import { ACTIVITIES, NOW, block } from "./helpers";

const gym = { ...ACTIVITIES[0], goal: { amount: 2, period: "week" } };
const twoDone = (monday) => [block(monday, "18:00", "19:00", "gym", { done: true }), block(monday, "20:00", "21:00", "gym", { done: true })];

describe("statistiche di un'attività", () => {
  it("conta la serie e non la rompe a metà della settimana in corso", () => {
    const blocks = [...twoDone("2026-10-12"), ...twoDone("2026-10-19")];
    const stats = activityStats(gym, blocks, NOW);
    expect(stats.streak).toBe(2);
    expect(stats.sessions).toBe(4);
    expect(stats.minutes).toBe(240);
  });

  it("il jolly copre una settimana saltata tra due centrate", () => {
    const blocks = [...twoDone("2026-09-28"), ...twoDone("2026-10-12"), ...twoDone("2026-10-19")];
    const stats = activityStats(gym, blocks, NOW);
    expect(stats.jollyUsed).toBe(true);
    expect(stats.streak).toBe(3);
    expect(stats.weeks.find((week) => week.start === "2026-10-05").jolly).toBe(true);
  });

  it("due settimane saltate fermano la serie", () => {
    const blocks = [...twoDone("2026-09-21"), ...twoDone("2026-10-19")];
    expect(activityStats(gym, blocks, NOW).streak).toBe(1);
  });
});

describe("statistiche del mese", () => {
  it("non conta i blocchi futuri nella percentuale e trova il record di giorni di fila", () => {
    const blocks = [
      block("2026-10-01", "18:00", "19:00", "gym", { done: true }),
      block("2026-10-02", "18:00", "19:00", "gym", { done: true }),
      block("2026-10-03", "18:00", "19:00", "gym", { done: true }),
      block("2026-10-10", "18:00", "19:00", "gym"),
      block("2026-10-30", "18:00", "19:00", "gym"),
    ];
    const stats = monthStats("2026-10", ACTIVITIES, blocks, NOW);
    expect(stats.sessions).toBe(3);
    expect(stats.completion).toBe(0.75);
    expect(stats.bestRun).toBe(3);
    expect(stats.days[0].date).toBe("2026-09-28");
  });
});
