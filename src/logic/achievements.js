import { activityStats } from "./activityStats";
import { blockDuration } from "./time";

// Traguardi: premiano la costanza e soprattutto la capacità di ripartire. Nessuno si perde una volta preso.
// progress(data) restituisce [fatto, obiettivo]; il traguardo è sbloccato quando fatto >= obiettivo.
export const ACHIEVEMENTS = [
  {
    id: "first-block",
    title: "Si comincia",
    text: "Il primo blocco chiuso. Il più difficile.",
    progress: ({ done }) => [done.length, 1],
  },
  {
    id: "blocks-10",
    title: "Doppia cifra",
    text: "Dieci blocchi chiusi: sta diventando un'abitudine.",
    progress: ({ done }) => [done.length, 10],
  },
  {
    id: "blocks-50",
    title: "Mezzo cento",
    text: "Cinquanta blocchi chiusi.",
    progress: ({ done }) => [done.length, 50],
  },
  {
    id: "blocks-100",
    title: "Cento promesse",
    text: "Cento blocchi chiusi. Cento promesse mantenute.",
    progress: ({ done }) => [done.length, 100],
  },
  {
    id: "week-met",
    title: "Settimana centrata",
    text: "Hai raggiunto l'obiettivo settimanale di un'attività.",
    progress: ({ stats }) => [Math.max(0, ...stats.map((entry) => entry.weeks.filter((week) => week.met).length)), 1],
  },
  {
    id: "streak-4",
    title: "Un mese di fila",
    text: "Quattro settimane di fila centrate su una stessa attività.",
    progress: ({ stats }) => [Math.max(0, ...stats.map((entry) => entry.streak)), 4],
  },
  {
    id: "passion-10h",
    title: "Dieci ore di passione",
    text: "Dieci ore dedicate a una passione. Si vede.",
    progress: ({ data, done }) => {
      const passions = new Set(data.activities.filter((a) => a.type === "passion").map((a) => a.id));
      const perActivity = new Map();
      done
        .filter((block) => passions.has(block.activityId))
        .forEach((block) => perActivity.set(block.activityId, (perActivity.get(block.activityId) || 0) + blockDuration(block)));
      return [Math.floor(Math.max(0, ...perActivity.values()) / 60), 10];
    },
  },
  {
    id: "rescue",
    title: "Ripartenza",
    text: "Hai rimesso in agenda un blocco saltato invece di lasciar perdere.",
    progress: ({ data }) => [data.counters?.rescued || 0, 1],
  },
  {
    id: "gentle",
    title: "Gentile con te",
    text: "Una giornata no, e hai chiuso comunque il minimo.",
    progress: ({ data, done }) => {
      const lowDays = new Set(data.lowDays || []);
      return [done.some((block) => lowDays.has(block.date)) ? 1 : 0, 1];
    },
  },
  {
    id: "ritual",
    title: "Il rito",
    text: "La prima settimana chiusa con il rito della domenica.",
    progress: ({ data }) => [Object.keys(data.reviews || {}).length, 1],
  },
  {
    id: "ritual-4",
    title: "Rito di famiglia",
    text: "Quattro settimane chiuse con il rito.",
    progress: ({ data }) => [Object.keys(data.reviews || {}).length, 4],
  },
];

export function evaluateAchievements(data, now) {
  const done = data.blocks.filter((block) => block.done);
  const stats = data.activities.map((activity) => activityStats(activity, data.blocks, now));
  const context = { data, done, stats };
  return ACHIEVEMENTS.map((achievement) => {
    const [value, goal] = achievement.progress(context);
    const unlockedAt = data.achievements?.[achievement.id] || null;
    return {
      ...achievement,
      value: Math.min(value, goal),
      goal,
      reached: value >= goal,
      unlockedAt,
    };
  });
}
