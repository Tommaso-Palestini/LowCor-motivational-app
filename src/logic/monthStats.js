import { addDays, monthDates, parseDate, toDateString } from "./dates";
import { blockDuration } from "./time";
import { isBlockPast } from "./tone";

// "2026-10" -> primo giorno del mese
export function monthKey(dateString) {
  return dateString.slice(0, 7);
}

// Gli ultimi N mesi, dal più recente: [{ key: "2026-10", label: "ottobre 2026" }, …]
export function recentMonths(now, count = 12) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    return {
      key: toDateString(date).slice(0, 7),
      label: date.toLocaleDateString("it-IT", { month: "long", year: "numeric" }),
    };
  });
}

// Il mese in numeri: giorni con la loro intensità, totali, giorno migliore e contributo di ogni attività.
export function monthStats(key, activities, blocks, now) {
  const first = `${key}-01`;
  const firstDate = parseDate(first);
  const last = toDateString(new Date(firstDate.getFullYear(), firstDate.getMonth() + 1, 0));
  const inMonth = blocks.filter((block) => block.date >= first && block.date <= last);
  const done = inMonth.filter((block) => block.done);
  const due = inMonth.filter((block) => block.done || isBlockPast(block, now));

  const perDay = new Map();
  done.forEach((block) => perDay.set(block.date, (perDay.get(block.date) || 0) + 1));
  const maxPerDay = Math.max(1, ...perDay.values());

  const days = monthDates(first).map((date) => ({
    date,
    inMonth: date >= first && date <= last,
    count: perDay.get(date) || 0,
    intensity: (perDay.get(date) || 0) / maxPerDay,
    isFuture: date > toDateString(now),
  }));
  // Le settimane tutte fuori dal mese (in fondo alla griglia da 42) non servono
  while (days.length > 35 && days.slice(-7).every((day) => !day.inMonth)) {
    days.splice(-7);
  }

  let bestDay = null;
  perDay.forEach((count, date) => {
    if (!bestDay || count > bestDay.count) {
      bestDay = { date, count };
    }
  });

  // Giorni di fila con almeno un blocco fatto, il record del mese
  let bestRun = 0;
  let run = 0;
  for (let date = first; date <= last; date = addDays(date, 1)) {
    run = perDay.has(date) ? run + 1 : 0;
    bestRun = Math.max(bestRun, run);
  }

  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const perActivity = new Map();
  done.forEach((block) => {
    const entry = perActivity.get(block.activityId) || { sessions: 0, minutes: 0 };
    entry.sessions += 1;
    entry.minutes += blockDuration(block);
    perActivity.set(block.activityId, entry);
  });
  const ranking = [...perActivity.entries()]
    .map(([activityId, entry]) => ({ activity: activitiesById.get(activityId), ...entry }))
    .filter((entry) => entry.activity)
    .sort((a, b) => b.minutes - a.minutes);

  return {
    key,
    label: firstDate.toLocaleDateString("it-IT", { month: "long", year: "numeric" }),
    days,
    sessions: done.length,
    minutes: done.reduce((sum, block) => sum + blockDuration(block), 0),
    activeDays: perDay.size,
    completion: due.length > 0 ? done.length / due.length : null,
    bestDay,
    bestRun,
    ranking,
  };
}
