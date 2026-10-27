import { toDateString, weekDates } from "./dates";
import { blockDuration, minutesOfDay, minutesToTime, timeToMinutes } from "./time";
import { isBlockPast } from "./tone";
import { weekEnergy } from "./energy";

const DAY_START = 8 * 60;
const DAY_END = 22 * 60;
const STEP = 30;
const DEFAULT_DURATION = 60;

export function getWeekSummary(activities, blocks, weekStart, now) {
  const dates = weekDates(weekStart);
  const inWeek = blocks.filter((block) => block.date >= dates[0] && block.date <= dates[6]);

  return activities
    .filter((activity) => activity.status !== "parked")
    .map((activity) => {
      const own = inWeek.filter((block) => block.activityId === activity.id);
      const done = own.filter((block) => block.done).length;
      const planned = own.filter((block) => !block.done && !isBlockPast(block, now)).length;
      const target =
        activity.goal.period === "week" ? activity.goal.amount : activity.goal.amount * 7;
      return {
        activity,
        done,
        planned,
        target,
        missing: Math.max(target - done - planned, 0),
        minutesDone: own.filter((block) => block.done).reduce((sum, block) => sum + blockDuration(block), 0),
      };
    });
}

// L'orario a cui di solito fai questa attività: quello più frequente tra i blocchi completati.
export function preferredStart(activity, blocks) {
  const counts = new Map();
  blocks
    .filter((block) => block.activityId === activity.id && block.done)
    .forEach((block) => counts.set(block.start, (counts.get(block.start) || 0) + 1));
  let best = null;
  let bestCount = 0;
  counts.forEach((count, start) => {
    if (count > bestCount) {
      best = start;
      bestCount = count;
    }
  });
  return best === null ? null : timeToMinutes(best);
}

function typicalDuration(activity, blocks) {
  const durations = blocks
    .filter((block) => block.activityId === activity.id)
    .map(blockDuration)
    .sort((a, b) => a - b);
  if (durations.length === 0) {
    return DEFAULT_DURATION;
  }
  return durations[Math.floor(durations.length / 2)];
}

function isFree(dayBlocks, start, duration) {
  const end = start + duration;
  return dayBlocks.every(
    (block) => end <= timeToMinutes(block.start) || start >= timeToMinutes(block.end)
  );
}

function findFreeSlot(dayBlocks, preferred, earliest, duration) {
  if (preferred !== null && preferred >= earliest && preferred + duration <= DAY_END) {
    if (isFree(dayBlocks, preferred, duration)) {
      return preferred;
    }
  }
  const first = Math.ceil(Math.max(DAY_START, earliest) / STEP) * STEP;
  for (let start = first; start + duration <= DAY_END; start += STEP) {
    if (isFree(dayBlocks, start, duration)) {
      return start;
    }
  }
  return null;
}

function priority(activity) {
  if (activity.status === "focus") {
    return 0;
  }
  return activity.type === "fixed" ? 1 : 2;
}

// limits: soglie di energia (un giorno non viene riempito oltre); skipDates: giornate no da lasciare in pace
export function planWeek(activities, blocks, weekStart, now, { limits = null, skipDates = [], busy = [] } = {}) {
  const today = toDateString(now);
  const dates = weekDates(weekStart).filter((date) => date >= today && !skipDates.includes(date));
  const created = [];
  let unplaced = 0;

  if (dates.length === 0) {
    return { created, unplaced };
  }

  const allBlocks = () => [...blocks, ...created];
  const summary = getWeekSummary(activities, blocks, weekStart, now).sort(
    (a, b) => priority(a.activity) - priority(b.activity)
  );

  summary.forEach(({ activity, missing }) => {
    const isDaily = activity.goal.period === "day";
    const maxPerDay = isDaily ? activity.goal.amount : 1;
    const duration = typicalDuration(activity, blocks);
    const preferred = preferredStart(activity, blocks);
    let remaining = isDaily ? Infinity : missing;

    for (let round = 0; round < maxPerDay && remaining > 0; round += 1) {
      const candidates = dates
        .map((date) => {
          const dayBlocks = allBlocks().filter((block) => block.date === date);
          return {
            date,
            dayBlocks,
            own: dayBlocks.filter((block) => block.activityId === activity.id).length,
            load: dayBlocks.reduce((sum, block) => sum + blockDuration(block), 0),
          };
        })
        .filter((candidate) => candidate.own <= round)
        .sort((a, b) => a.own - b.own || a.load - b.load || a.date.localeCompare(b.date));

      for (const candidate of candidates) {
        if (remaining <= 0) {
          break;
        }
        const earliest = candidate.date === today ? minutesOfDay(now) : 0;
        const occupied = [...candidate.dayBlocks, ...busy.filter((event) => event.date === candidate.date)];
        const start = findFreeSlot(occupied, preferred, earliest, duration);
        if (start === null) {
          continue;
        }
        const draft = {
          date: candidate.date,
          start: minutesToTime(start),
          end: minutesToTime(start + duration),
          activityId: activity.id,
        };
        if (limits && weekEnergy([candidate.date], [...candidate.dayBlocks, draft], activities, limits)[0].overloaded) {
          continue;
        }
        created.push(draft);
        remaining -= 1;
      }
    }

    if (!isDaily && remaining > 0) {
      unplaced += remaining;
    }
  });

  return { created, unplaced };
}
