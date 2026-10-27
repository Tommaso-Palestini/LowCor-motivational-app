import { describe, expect, it } from "vitest";
import { planWeek } from "../planner";
import { dueAlerts } from "../alerts";
import { weekReview, reviewWeekStart, shouldPromptReview } from "../review";
import { evaluateAchievements } from "../achievements";
import { ACTIVITIES, NOW, block } from "./helpers";
import { blocksOverlap } from "../time";

describe("pianifica la settimana", () => {
  it("non supera la soglia di energia, salta le giornate no e gli impegni esterni", () => {
    const gym = [{ ...ACTIVITIES[0], goal: { amount: 6, period: "week" }, preferredStart: "18:00" }];
    const busy = [{ date: "2026-10-28", start: "17:00", end: "20:00" }];
    const { created } = planWeek(gym, [], "2026-10-26", NOW, {
      limits: { maxHigh: 0, maxLoad: 10 },
      skipDates: ["2026-10-29"],
      busy,
    });
    // maxHigh 0: un blocco ad alta energia manderebbe ogni giorno in overload
    expect(created).toHaveLength(0);

    const { created: placed } = planWeek(gym, [], "2026-10-26", NOW, { skipDates: ["2026-10-29"], busy });
    expect(placed.some((item) => item.date === "2026-10-29")).toBe(false);
    expect(placed.some((item) => busy.some((event) => blocksOverlap(event, item)))).toBe(false);
    expect(placed.find((item) => item.date === "2026-10-30").start).toBe("18:00");
  });
});

describe("promemoria", () => {
  it("avvisa prima, all'inizio e alla fine, una volta sola", () => {
    const now = new Date(2026, 9, 27, 17, 58, 30);
    const blocks = [
      block("2026-10-27", "18:00", "19:00", "gym"),
      block("2026-10-27", "17:00", "17:58", "gym"),
      block("2026-10-27", "17:58", "18:30", "gym"),
    ];
    const alerts = dueAlerts({ blocks, activities: ACTIVITIES, now, minutesBefore: 5, sent: new Set() });
    expect(alerts.map((alert) => alert.kind).sort()).toEqual(["end", "soon", "start"]);
    const again = dueAlerts({ blocks, activities: ACTIVITIES, now, minutesBefore: 5, sent: new Set(alerts.map((a) => a.key)) });
    expect(again).toHaveLength(0);
  });
});

describe("rito della settimana", () => {
  it("prima di venerdì rivede la settimana appena finita e si propone solo domenica e lunedì", () => {
    expect(reviewWeekStart(NOW)).toBe("2026-10-19");
    expect(reviewWeekStart(new Date(2026, 9, 30))).toBe("2026-10-26");
    expect(shouldPromptReview(new Date(2026, 10, 1), {})).toBe(true);
    expect(shouldPromptReview(NOW, {})).toBe(false);
    expect(shouldPromptReview(new Date(2026, 10, 1), { "2026-10-26": {} })).toBe(false);
  });

  it("mette prima le vittorie", () => {
    const blocks = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"].map((date) =>
      block(date, "18:00", "19:00", "gym", { done: true })
    );
    const review = weekReview("2026-10-19", ACTIVITIES, blocks, NOW);
    expect(review.wins[0]).toBe("Hai centrato Palestra: 5 su 5.");
    expect(review.done).toBe(5);
  });
});

describe("traguardi", () => {
  it("si sbloccano dai dati e quelli già presi restano", () => {
    const data = {
      activities: ACTIVITIES,
      blocks: [block("2026-10-26", "18:00", "19:00", "gym", { done: true })],
      lowDays: ["2026-10-26"],
      reviews: {},
      counters: { rescued: 1 },
      achievements: { "blocks-100": "2026-01-01" },
    };
    const byId = Object.fromEntries(evaluateAchievements(data, NOW).map((item) => [item.id, item]));
    expect(byId["first-block"].reached).toBe(true);
    expect(byId.gentle.reached).toBe(true);
    expect(byId.rescue.reached).toBe(true);
    expect(byId["blocks-10"]).toMatchObject({ reached: false, value: 1, goal: 10 });
    expect(byId["blocks-100"].unlockedAt).toBe("2026-01-01");
  });
});
