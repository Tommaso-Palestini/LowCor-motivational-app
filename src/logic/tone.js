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
  if (isBlockPast(block, now)) {
    return "missed";
  }
  if (activity && activity.status === "focus") {
    return "focus";
  }
  return "planned";
}
