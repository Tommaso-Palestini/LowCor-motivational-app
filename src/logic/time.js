export const MINUTES_IN_DAY = 24 * 60;

export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
  const clamped = Math.min(Math.max(Math.round(totalMinutes), 0), MINUTES_IN_DAY - 1);
  const hours = String(Math.floor(clamped / 60)).padStart(2, "0");
  const minutes = String(clamped % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function blockDuration(block) {
  return timeToMinutes(block.end) - timeToMinutes(block.start);
}

export function blocksOverlap(a, b) {
  return (
    a.date === b.date &&
    timeToMinutes(a.start) < timeToMinutes(b.end) &&
    timeToMinutes(b.start) < timeToMinutes(a.end)
  );
}

export function getCurrentAndNext(blocks, nowMinutes) {
  const current = blocks.find(
    (block) =>
      timeToMinutes(block.start) <= nowMinutes &&
      nowMinutes < timeToMinutes(block.end)
  );
  const next = blocks.find((block) => timeToMinutes(block.start) > nowMinutes);
  return { current, next };
}

export function formatDuration(totalMinutes) {
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function formatClock(totalSeconds) {
  const safe = Math.max(Math.ceil(totalSeconds), 0);
  const minutes = String(Math.floor(safe / 60)).padStart(2, "0");
  const seconds = String(safe % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
