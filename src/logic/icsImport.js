import { toDateString } from "./dates";
import { minutesToTime } from "./time";

// Eventi espansi da 30 giorni fa a 120 giorni avanti: abbastanza per pianificare, senza esplodere con le ricorrenze.
const PAST_DAYS = 30;
const FUTURE_DAYS = 120;
const MAX_OCCURRENCES = 400;
const WEEKDAYS = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 0 };

// Le righe lunghe nei file .ics continuano sulla riga dopo, che inizia con uno spazio.
function unfold(text) {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescape(value) {
  return value.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
}

// 20261027T180000Z (UTC), 20261027T180000 (ora locale o TZID: la trattiamo come locale), 20261027 (giornata intera)
function parseDateValue(value, params) {
  const allDay = params.includes("VALUE=DATE") || /^\d{8}$/.test(value);
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!match) {
    return null;
  }
  const [, y, mo, d, h = "0", mi = "0", s = "0", utc] = match;
  const date = utc
    ? new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
    : new Date(+y, +mo - 1, +d, +h, +mi, +s);
  return { date, allDay };
}

function parseRule(value) {
  return Object.fromEntries(value.split(";").map((part) => part.split("=")));
}

function readEvents(lines) {
  const events = [];
  let current = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = { exdates: [] };
    } else if (line === "END:VEVENT") {
      if (current && current.start) {
        events.push(current);
      }
      current = null;
    } else if (current) {
      const colon = line.indexOf(":");
      if (colon === -1) {
        continue;
      }
      const [name, ...params] = line.slice(0, colon).split(";");
      const value = line.slice(colon + 1);
      const paramText = params.join(";");
      if (name === "SUMMARY") {
        current.title = unescape(value);
      } else if (name === "UID") {
        current.uid = value;
      } else if (name === "DTSTART") {
        current.start = parseDateValue(value, paramText);
      } else if (name === "DTEND") {
        current.end = parseDateValue(value, paramText);
      } else if (name === "RRULE") {
        current.rule = parseRule(value);
      } else if (name === "EXDATE") {
        value.split(",").forEach((item) => {
          const parsed = parseDateValue(item, paramText);
          if (parsed) {
            current.exdates.push(toDateString(parsed.date));
          }
        });
      } else if (name === "STATUS" && value === "CANCELLED") {
        current.cancelled = true;
      }
    }
  }
  return events.filter((event) => !event.cancelled && !event.start.allDay);
}

// Le date in cui cade un evento (ricorrenze settimanali e giornaliere, le più comuni nelle routine).
function occurrences(event, from, to) {
  const first = event.start.date;
  const rule = event.rule;
  if (!rule) {
    return [first];
  }
  const until = rule.UNTIL ? parseDateValue(rule.UNTIL, "").date : null;
  const count = rule.COUNT ? Number(rule.COUNT) : Infinity;
  const interval = Number(rule.INTERVAL || 1);
  const byDay = rule.BYDAY ? rule.BYDAY.split(",").map((day) => WEEKDAYS[day.slice(-2)]) : null;
  const dates = [];
  let produced = 0;
  const cursor = new Date(first);

  for (let step = 0; step < 3000 && produced < count && dates.length < MAX_OCCURRENCES; step += 1) {
    if (until && cursor > until) {
      break;
    }
    if (cursor > to) {
      break;
    }
    let matches = true;
    if (rule.FREQ === "WEEKLY") {
      const weeks = Math.floor((cursor - first) / (7 * 86400000));
      const days = byDay || [first.getDay()];
      matches = days.includes(cursor.getDay()) && weeks % interval === 0;
    } else if (rule.FREQ === "DAILY") {
      const days = Math.round((cursor - first) / 86400000);
      matches = days % interval === 0 && (!byDay || byDay.includes(cursor.getDay()));
    } else if (rule.FREQ === "MONTHLY") {
      matches = cursor.getDate() === first.getDate();
    } else {
      return [first];
    }
    if (matches && cursor >= first) {
      produced += 1;
      if (cursor >= from) {
        dates.push(new Date(cursor));
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

// Dal testo di un file .ics agli impegni esterni: { id, date, start, end, title }
export function parseIcs(text, now = new Date()) {
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new Error("Questo file non sembra un calendario .ics");
  }
  const from = new Date(now);
  from.setDate(from.getDate() - PAST_DAYS);
  const to = new Date(now);
  to.setDate(to.getDate() + FUTURE_DAYS);

  const nameLine = unfold(text).find((line) => line.startsWith("X-WR-CALNAME:"));
  const items = [];
  readEvents(unfold(text)).forEach((event, index) => {
    const startDate = event.start.date;
    const endDate = event.end ? event.end.date : new Date(startDate.getTime() + 60 * 60000);
    const duration = Math.max(15, Math.round((endDate - startDate) / 60000));
    occurrences(event, from, to).forEach((date) => {
      const day = toDateString(date);
      if (event.exdates.includes(day)) {
        return;
      }
      const startMinutes = date.getHours() * 60 + date.getMinutes();
      // Gli eventi che passano la mezzanotte si fermano alle 24 di quel giorno
      const endMinutes = Math.min(startMinutes + duration, 24 * 60);
      items.push({
        id: `${event.uid || index}-${day}-${startMinutes}`,
        date: day,
        start: minutesToTime(startMinutes),
        end: endMinutes >= 24 * 60 ? "23:59" : minutesToTime(endMinutes),
        title: event.title || "Impegno",
      });
    });
  });
  return { name: nameLine ? unescape(nameLine.slice(13)) : null, events: items };
}

// I link "webcal://" sono normali https
export function normalizeCalendarUrl(url) {
  return url.trim().replace(/^webcal:\/\//i, "https://");
}

// Tutti gli impegni esterni di un giorno, da tutti i calendari collegati
export function externalForDate(calendars, date) {
  return (calendars || []).flatMap((calendar) =>
    calendar.events.filter((event) => event.date === date).map((event) => ({ ...event, calendarId: calendar.id }))
  );
}

export function externalBusy(calendars) {
  return (calendars || []).flatMap((calendar) => calendar.events);
}
