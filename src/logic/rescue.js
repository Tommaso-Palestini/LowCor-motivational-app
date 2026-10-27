import { addDays, toDateString } from "./dates";
import { freeWindows } from "./calendar";
import { weekEnergy } from "./energy";
import { blockDuration, minutesOfDay, minutesToTime } from "./time";
import { isBlockPast } from "./tone";

const DAY_END = 22 * 60;
const DAY_START = 8 * 60;
const LOOK_BACK = 3;
const LOOK_AHEAD = 6;
export const MINIMUM_MINUTES = 15;

// Blocchi saltati negli ultimi giorni che non hai già ripiazzato o lasciato andare.
export function missedBlocks(blocks, now) {
  const today = toDateString(now);
  const from = addDays(today, -LOOK_BACK);
  return blocks
    .filter((block) => !block.done && !block.released && block.date >= from && isBlockPast(block, now))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start.localeCompare(a.start));
}

// Il primo spazio libero, da adesso in avanti, che non manda il giorno in overload.
// busy: impegni esterni (calendari importati), occupano tempo ma non contano per l'energia
export function suggestSlot(block, blocks, activities, now, limits, busy = []) {
  const today = toDateString(now);
  const duration = blockDuration(block);
  const others = blocks.filter((item) => item.id !== block.id);
  const nowMinutes = Math.ceil((minutesOfDay(now) + 10) / 15) * 15;

  for (let offset = 0; offset <= LOOK_AHEAD; offset += 1) {
    const date = addDays(today, offset);
    const from = offset === 0 ? Math.max(DAY_START, nowMinutes) : DAY_START;
    if (from + duration > DAY_END) {
      continue;
    }
    const dayBlocks = others.filter((item) => item.date === date);
    const occupied = [...dayBlocks, ...busy.filter((event) => event.date === date)];
    const window = freeWindows(occupied, from, DAY_END, duration)[0];
    if (!window) {
      continue;
    }
    const slot = { date, start: minutesToTime(window.start), end: minutesToTime(window.start + duration) };
    const [day] = weekEnergy([date], [...dayBlocks, { ...block, ...slot }], activities, limits);
    if (!day.overloaded) {
      return slot;
    }
  }
  return null;
}

// Giornata no: le passioni di oggi vanno in pausa (senza contare come saltate), le non negoziabili restano.
export function applyLowDay(blocks, activities, date, on) {
  const passions = new Set(activities.filter((activity) => activity.type === "passion").map((activity) => activity.id));
  return blocks.map((block) => {
    if (block.date !== date || block.done || !passions.has(block.activityId)) {
      return block;
    }
    if (on) {
      return { ...block, released: "low-day" };
    }
    return block.released === "low-day" ? { ...block, released: false } : block;
  });
}

// La versione minima di un blocco: stessi inizio e attività, 15 minuti.
export function minimumVersion(block) {
  const [hours, minutes] = block.start.split(":").map(Number);
  return { end: minutesToTime(hours * 60 + minutes + MINIMUM_MINUTES) };
}
