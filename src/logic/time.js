export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
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