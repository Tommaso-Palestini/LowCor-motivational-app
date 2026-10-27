import { addDays, toDateString, weekDates } from "./dates";
import { blockDuration } from "./time";

const WEEKS = 8;

export function weeklyTarget(activity) {
  return activity.goal.period === "week" ? activity.goal.amount : activity.goal.amount * 7;
}

// Il quadro di un'attività: quanto l'hai fatta in totale, le ultime 8 settimane
// e da quante settimane di fila centri l'obiettivo.
export function activityStats(activity, blocks, now) {
  const today = toDateString(now);
  const own = blocks.filter((block) => block.activityId === activity.id);
  const done = own.filter((block) => block.done);
  const target = weeklyTarget(activity);
  const thisMonday = weekDates(today)[0];

  const weeks = Array.from({ length: WEEKS }, (_, index) => {
    const start = addDays(thisMonday, -7 * (WEEKS - 1 - index));
    const end = addDays(start, 6);
    const count = done.filter((block) => block.date >= start && block.date <= end).length;
    return { start, count, met: count >= target, current: index === WEEKS - 1 };
  });

  // La settimana in corso conta solo se è già centrata: non ti rompe la serie a metà settimana.
  // Il jolly: una settimana saltata nelle ultime 8 non azzera la serie, se prima e dopo l'avevi centrata.
  let streak = 0;
  let jollyUsed = false;
  const history = weeks[WEEKS - 1].met ? weeks : weeks.slice(0, -1);
  for (let index = history.length - 1; index >= 0; index -= 1) {
    if (history[index].met) {
      streak += 1;
    } else if (!jollyUsed && streak > 0 && index > 0 && history[index - 1].met) {
      jollyUsed = true;
      history[index].jolly = true;
    } else {
      break;
    }
  }

  const next =
    own
      .filter((block) => !block.done && block.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))[0] || null;

  return {
    sessions: done.length,
    minutes: done.reduce((sum, block) => sum + blockDuration(block), 0),
    blockCount: own.length,
    target,
    weeks,
    thisWeek: weeks[WEEKS - 1].count,
    streak,
    jollyUsed,
    next,
    firstDate: done.length > 0 ? done.reduce((min, block) => (block.date < min ? block.date : min), done[0].date) : null,
  };
}
