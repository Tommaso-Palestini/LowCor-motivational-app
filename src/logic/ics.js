// Crea un file .ics (lo standard dei calendari): si importa in Google Calendar,
// nel calendario del telefono o in Thunderbird.

function formatIcsDate(date, time) {
  return `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;
}

function escapeText(text) {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(blocks, activities) {
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const events = blocks.map((block) => {
    const activity = activitiesById.get(block.activityId);
    const name = activity ? activity.name : "Blocco";
    return [
      "BEGIN:VEVENT",
      `UID:${block.id}@daily-app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsDate(block.date, block.start)}`,
      `DTEND:${formatIcsDate(block.date, block.end)}`,
      `SUMMARY:${escapeText(block.done ? `✓ ${name}` : name)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Daily//IT", ...events, "END:VCALENDAR"].join("\r\n");
}

export function downloadIcs(blocks, activities, fileName) {
  const blob = new Blob([buildIcs(blocks, activities)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
