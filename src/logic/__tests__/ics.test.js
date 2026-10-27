import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl } from "../ics";
import { normalizeCalendarUrl, parseIcs } from "../icsImport";
import { NOW } from "./helpers";

const ICS = [
  "BEGIN:VCALENDAR",
  "X-WR-CALNAME:Università",
  "BEGIN:VEVENT",
  "UID:lez",
  "SUMMARY:Lezione di",
  "  Analisi",
  "DTSTART;TZID=Europe/Rome:20261019T100000",
  "DTEND;TZID=Europe/Rome:20261019T120000",
  "RRULE:FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261111T235959Z",
  "EXDATE;TZID=Europe/Rome:20261028T100000",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:call",
  "SUMMARY:Call",
  "DTSTART:20261029T150000Z",
  "DTEND:20261029T153000Z",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:no",
  "STATUS:CANCELLED",
  "DTSTART:20261030T150000Z",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:ferie",
  "DTSTART;VALUE=DATE:20261101",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("import .ics", () => {
  const { name, events } = parseIcs(ICS, NOW);

  it("legge il nome e unisce le righe spezzate", () => {
    expect(name).toBe("Università");
    expect(events[0].title).toBe("Lezione di Analisi");
  });

  it("espande la ricorrenza settimanale rispettando eccezioni e fine", () => {
    const lessons = events.filter((event) => event.title.startsWith("Lezione")).map((event) => event.date);
    expect(lessons).toEqual(["2026-10-19", "2026-10-21", "2026-10-26", "2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11"]);
  });

  it("converte UTC nell'ora locale (dopo il cambio dell'ora) e ignora annullati e giornate intere", () => {
    expect(events.find((event) => event.title === "Call")).toMatchObject({ date: "2026-10-29", start: "16:00", end: "16:30" });
    expect(events).toHaveLength(8);
  });

  it("rifiuta file che non sono calendari e accetta i link webcal", () => {
    expect(() => parseIcs("ciao")).toThrow();
    expect(normalizeCalendarUrl(" webcal://example.com/a.ics ")).toBe("https://example.com/a.ics");
  });
});

describe("scrivere nei calendari", () => {
  const blockA = { id: "b1", date: "2026-10-28", start: "09:30", end: "10:45", activityId: "a1", done: false };
  const activity = { id: "a1", name: "Studio, inglese" };

  it("il file .ics ha l'evento con orari e nome escapati", () => {
    const ics = buildIcs([blockA], [activity]);
    expect(ics).toContain("DTSTART:20261028T093000");
    expect(ics).toContain("DTEND:20261028T104500");
    expect(ics).toContain("SUMMARY:Studio\\, inglese");
    expect(ics).toContain("UID:b1@lowcor");
    expect(ics.startsWith("BEGIN:VCALENDAR")).toBe(true);
  });

  it("il link di Google Calendar è precompilato con orari e fuso", () => {
    const url = new URL(googleCalendarUrl(blockA, activity, "Europe/Rome"));
    expect(url.hostname).toBe("calendar.google.com");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Studio, inglese");
    expect(url.searchParams.get("dates")).toBe("20261028T093000/20261028T104500");
    expect(url.searchParams.get("ctz")).toBe("Europe/Rome");
  });
});
