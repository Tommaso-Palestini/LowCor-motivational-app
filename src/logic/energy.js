import { blocksOverlap, minutesToTime, timeToMinutes } from "./time";
import { freeWindows } from "./calendar";

// Quanta energia chiede ogni tipo di attività. I punti servono a sommare il carico di un giorno.
export const ENERGY = {
  high: { label: "Alta", points: 3 },
  medium: { label: "Media", points: 2 },
  low: { label: "Bassa", points: 1 },
};

const ORDER = ["high", "medium", "low"];
const DAY_START = 8 * 60;
const DAY_END = 22 * 60;

// Le attività create prima di questa funzione non hanno il campo: contano come media.
export function activityEnergy(activity) {
  return activity && ENERGY[activity.energy] ? activity.energy : "medium";
}

export function nextEnergy(level) {
  return ORDER[(ORDER.indexOf(level) + 1) % ORDER.length];
}

export function energyLimits(settings) {
  return { maxHigh: settings.energyMaxHigh, maxLoad: settings.energyMaxLoad };
}

function measureDay(dayBlocks, activitiesById) {
  let load = 0;
  let high = 0;
  dayBlocks.forEach((block) => {
    const level = activityEnergy(activitiesById.get(block.activityId));
    load += ENERGY[level].points;
    if (level === "high") {
      high += 1;
    }
  });
  return { load, high };
}

function isOverloaded({ load, high }, limits) {
  return high > limits.maxHigh || load > limits.maxLoad;
}

// Carico di ogni giorno della settimana: punti totali, blocchi intensi e se si va oltre la soglia.
export function weekEnergy(dates, blocks, activities, limits) {
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  return dates.map((date) => {
    const measure = measureDay(
      blocks.filter((block) => block.date === date),
      activitiesById
    );
    return { date, ...measure, overloaded: isOverloaded(measure, limits) };
  });
}

// Il primo posto libero in un giorno per un blocco di quella durata: prima lo stesso orario, poi tra le 8 e le 22.
function findSlot(dayBlocks, block, date) {
  const start = timeToMinutes(block.start);
  const duration = timeToMinutes(block.end) - start;
  const sameTime = { date, start: block.start, end: block.end };
  if (!dayBlocks.some((other) => blocksOverlap(other, sameTime))) {
    return sameTime;
  }
  const window = freeWindows(dayBlocks, DAY_START, DAY_END, duration)[0];
  return window ? { date, start: minutesToTime(window.start), end: minutesToTime(window.start + duration) } : null;
}

// Per ogni giorno in overload propone di spostare i blocchi più pesanti (non ancora fatti)
// nei giorni più leggeri dei prossimi giorni della settimana, senza mandare in overload anche quelli.
export function suggestRebalance(dates, blocks, activities, limits, today) {
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const weight = (block) => ENERGY[activityEnergy(activitiesById.get(block.activityId))].points;
  const byDay = new Map(dates.map((date) => [date, blocks.filter((block) => block.date === date)]));
  const measure = (date) => measureDay(byDay.get(date), activitiesById);
  const suggestions = [];

  dates
    .filter((date) => date >= today)
    .forEach((date) => {
      const movable = byDay
        .get(date)
        .filter((block) => !block.done)
        .sort((a, b) => weight(b) - weight(a));

      for (const block of movable) {
        if (!isOverloaded(measure(date), limits)) {
          break;
        }
        const targets = dates
          .filter((other) => other !== date && other > today)
          .sort((a, b) => measure(a).load - measure(b).load);

        for (const target of targets) {
          const after = measureDay([...byDay.get(target), block], activitiesById);
          if (isOverloaded(after, limits)) {
            continue;
          }
          const slot = findSlot(byDay.get(target), block, target);
          if (!slot) {
            continue;
          }
          const moved = { ...block, ...slot };
          byDay.set(date, byDay.get(date).filter((item) => item.id !== block.id));
          byDay.set(target, [...byDay.get(target), moved]);
          suggestions.push({ block, activity: activitiesById.get(block.activityId), to: slot });
          break;
        }
      }
    });

  return suggestions;
}
