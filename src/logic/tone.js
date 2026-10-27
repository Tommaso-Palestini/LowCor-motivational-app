import { toDateString } from "./dates";
import { minutesOfDay, timeToMinutes } from "./time";

export function isBlockPast(block, now) {
  const today = toDateString(now);
  if (block.date !== today) {
    return block.date < today;
  }
  return timeToMinutes(block.end) <= minutesOfDay(now);
}

export function getBlockTone(block, activity, now) {
  if (block.done) {
    return "done";
  }
  // Lasciato andare (o in pausa per la giornata no): grigio come i saltati, ma senza chiedere niente
  if (block.released || isBlockPast(block, now)) {
    return "missed";
  }
  if (activity && activity.status === "focus") {
    return "focus";
  }
  return "planned";
}
