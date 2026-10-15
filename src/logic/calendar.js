import { addDays, weekDates, weekdayIndex } from "./dates";
import { blocksOverlap, timeToMinutes } from "./time";

// Mette i blocchi che si sovrappongono uno accanto all'altro, in colonne.
export function layoutDay(blocks) {
  const sorted = [...blocks].sort(
    (a, b) =>
      timeToMinutes(a.start) - timeToMinutes(b.start) ||
      timeToMinutes(b.end) - timeToMinutes(a.end)
  );
  const result = [];
  let cluster = [];
  let clusterEnd = -1;

  function placeCluster() {
    const columnEnds = [];
    const placed = cluster.map((block) => {
      const start = timeToMinutes(block.start);
      let column = columnEnds.findIndex((end) => end <= start);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(0);
      }
      columnEnds[column] = timeToMinutes(block.end);
      return { block, column };
    });
    placed.forEach((item) => result.push({ ...item, columns: columnEnds.length }));
    cluster = [];
    clusterEnd = -1;
  }

  sorted.forEach((block) => {
    if (cluster.length > 0 && timeToMinutes(block.start) >= clusterEnd) {
      placeCluster();
    }
    cluster.push(block);
    clusterEnd = Math.max(clusterEnd, timeToMinutes(block.end));
  });
  if (cluster.length > 0) {
    placeCluster();
  }
  return result;
}

export function findConflicts(blocks, draft, ignoreId) {
  return blocks.filter((block) => block.id !== ignoreId && blocksOverlap(block, draft));
}

// Crea le date di una serie: i giorni scelti, per N settimane, a partire dalla data del blocco.
export function buildSeries(draft, weekdays, weeks) {
  const seriesId = crypto.randomUUID();
  const firstMonday = weekDates(draft.date)[0];
  const drafts = [];
  for (let week = 0; week < weeks; week += 1) {
    weekdays.forEach((weekday) => {
      const date = addDays(firstMonday, week * 7 + weekday);
      if (date >= draft.date) {
        drafts.push({ ...draft, date, seriesId });
      }
    });
  }
  return drafts.sort((a, b) => a.date.localeCompare(b.date));
}

export function copyPreviousWeek(blocks, weekStart) {
  const previousDates = weekDates(addDays(weekStart, -7));
  const copies = [];
  blocks
    .filter((block) => block.date >= previousDates[0] && block.date <= previousDates[6])
    .forEach((block) => {
      const copy = {
        date: addDays(block.date, 7),
        start: block.start,
        end: block.end,
        activityId: block.activityId,
      };
      const taken = [...blocks, ...copies].some((other) => blocksOverlap(other, copy));
      if (!taken) {
        copies.push(copy);
      }
    });
  return copies;
}

export function defaultWeekdays(dateString) {
  return [weekdayIndex(dateString)];
}

// I buchi liberi di un giorno tra "from" e "to" (in minuti), lunghi almeno minLength.
export function freeWindows(dayBlocks, from, to, minLength = 30) {
  const busy = dayBlocks
    .map((block) => [timeToMinutes(block.start), timeToMinutes(block.end)])
    .sort((a, b) => a[0] - b[0]);
  const windows = [];
  let cursor = from;
  busy.forEach(([start, end]) => {
    if (start - cursor >= minLength) {
      windows.push({ start: cursor, end: Math.min(start, to) });
    }
    cursor = Math.max(cursor, end);
  });
  if (to - cursor >= minLength) {
    windows.push({ start: cursor, end: to });
  }
  return windows.filter((window) => window.end - window.start >= minLength);
}
