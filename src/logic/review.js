import { addDays, toDateString, weekDates, weekdayIndex } from "./dates";
import { getWeekSummary } from "./planner";
import { activityStats } from "./activityStats";
import { blockDuration } from "./time";

// Quale settimana rivedere: da venerdì in poi quella in corso, prima di venerdì quella appena finita.
export function reviewWeekStart(now) {
  const today = toDateString(now);
  const monday = weekDates(today)[0];
  return weekdayIndex(today) >= 4 ? monday : addDays(monday, -7);
}

// La card del rito compare la domenica e il lunedì, finché la settimana non è stata chiusa.
export function shouldPromptReview(now, reviews) {
  const day = weekdayIndex(toDateString(now));
  return (day === 6 || day === 0) && !reviews[reviewWeekStart(now)];
}

// Le vittorie prima di tutto: frasi brevi su cosa è andato bene, poi i numeri.
export function weekReview(weekStart, activities, blocks, now) {
  const dates = weekDates(weekStart);
  const inWeek = blocks.filter((block) => block.date >= dates[0] && block.date <= dates[6]);
  const done = inWeek.filter((block) => block.done);
  const reference = new Date(`${dates[6]}T23:59`) < now ? new Date(`${dates[6]}T23:59`) : now;
  const summary = getWeekSummary(activities, blocks, weekStart, reference);

  const wins = [];
  summary
    .filter((row) => row.done >= row.target)
    .forEach((row) => wins.push(`Hai centrato ${row.activity.name}: ${row.done} su ${row.target}.`));
  summary
    .filter((row) => row.done > 0 && row.done < row.target)
    .sort((a, b) => b.done / b.target - a.done / a.target)
    .slice(0, 2)
    .forEach((row) => wins.push(`${row.activity.name} è andata avanti: ${row.done} ${row.done === 1 ? "sessione" : "sessioni"}.`));

  const perDay = new Map();
  done.forEach((block) => perDay.set(block.date, (perDay.get(block.date) || 0) + 1));
  let bestDay = null;
  perDay.forEach((count, date) => {
    if (!bestDay || count > bestDay.count) {
      bestDay = { date, count };
    }
  });

  const streaks = activities
    .filter((activity) => activity.status !== "parked")
    .map((activity) => ({ activity, streak: activityStats(activity, blocks, reference).streak }))
    .filter((entry) => entry.streak >= 2)
    .sort((a, b) => b.streak - a.streak);
  if (streaks[0]) {
    wins.push(`${streaks[0].activity.name} è a ${streaks[0].streak} settimane di fila.`);
  }

  return {
    weekStart,
    dates,
    wins,
    summary,
    done: done.length,
    total: inWeek.filter((block) => !block.released).length,
    minutes: done.reduce((sum, block) => sum + blockDuration(block), 0),
    bestDay,
  };
}
