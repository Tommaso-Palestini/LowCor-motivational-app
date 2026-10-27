let counter = 0;

export function block(date, start, end, activityId, extra = {}) {
  counter += 1;
  return { id: `b${counter}`, date, start, end, activityId, done: false, seriesId: null, ...extra };
}

export const ACTIVITIES = [
  { id: "gym", name: "Palestra", type: "fixed", status: "active", energy: "high", goal: { amount: 5, period: "week" } },
  { id: "diet", name: "Dieta", type: "fixed", status: "active", energy: "low", goal: { amount: 1, period: "day" } },
  { id: "eng", name: "Inglese", type: "passion", status: "focus", energy: "medium", goal: { amount: 4, period: "week" } },
  { id: "art", name: "Disegno", type: "passion", status: "active", energy: "medium", goal: { amount: 2, period: "week" } },
];

// Martedì 27 ottobre 2026, ore 12
export const NOW = new Date(2026, 9, 27, 12, 0);
export const WEEK = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"];
