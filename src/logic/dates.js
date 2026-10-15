export function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getWeekRange(date) {
  const start = new Date(date);
  const dayIndex = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayIndex);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateString(start), end: toDateString(end) };
}

export function addDays(dateString, amount) {
  const date = parseDate(dateString);
  date.setDate(date.getDate() + amount);
  return toDateString(date);
}

export function weekDates(dateString) {
  const { start } = getWeekRange(parseDate(dateString));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function monthDates(dateString) {
  const date = parseDate(dateString);
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const { start } = getWeekRange(firstOfMonth);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function weekdayIndex(dateString) {
  return (parseDate(dateString).getDay() + 6) % 7;
}

export function formatDate(dateString, options) {
  return parseDate(dateString).toLocaleDateString("it-IT", options);
}
