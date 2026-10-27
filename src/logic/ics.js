// Crea un file .ics (lo standard dei calendari): si importa in Google Calendar,
// nel calendario del telefono o in Thunderbird.
// Senza un server non si può scrivere direttamente nei calendari: si passa da un file
// (Apple, Outlook) o da un link precompilato (Google), e l'utente conferma.
import { shareFile } from "./pdfExport";

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
      `UID:${block.id}@lowcor`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsDate(block.date, block.start)}`,
      `DTEND:${formatIcsDate(block.date, block.end)}`,
      `SUMMARY:${escapeText(block.done ? `✓ ${name}` : name)}`,
      "DESCRIPTION:Da LowCor",
      "END:VEVENT",
    ].join("\r\n");
  });

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//LowCor//IT", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
}

// Sul telefono apre il pannello di condivisione (il calendario di iOS importa il file), altrove lo scarica
export function shareIcs(blocks, activities, fileName) {
  const blob = new Blob([buildIcs(blocks, activities)], { type: "text/calendar;charset=utf-8" });
  return shareFile(blob, fileName, fileName);
}

// Link che apre Google Calendar con l'evento già compilato: basta premere Salva
export function googleCalendarUrl(block, activity, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: activity ? activity.name : "Blocco",
    dates: `${formatIcsDate(block.date, block.start)}/${formatIcsDate(block.date, block.end)}`,
    details: "Da LowCor",
  });
  if (timeZone) {
    params.set("ctz", timeZone);
  }
  return `https://calendar.google.com/calendar/render?${params}`;
}
