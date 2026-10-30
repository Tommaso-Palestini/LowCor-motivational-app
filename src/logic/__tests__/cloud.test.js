import { describe, expect, it } from "vitest";
import {
  cloudErrorMessage,
  groupShared,
  initialSync,
  inviteFromText,
  inviteLink,
  isValidEmail,
  passwordProblems,
  scheduleItems,
  stableStringify,
  syncPayload,
} from "../cloud";

describe("sincronizzazione", () => {
  it("non manda il focus in corso, che è del dispositivo", () => {
    expect(syncPayload({ blocks: [], focus: { startedAt: 1 } })).toEqual({ blocks: [] });
  });

  it("confronta i dati ignorando l'ordine delle chiavi", () => {
    expect(stableStringify({ b: 1, a: [{ y: 2, x: null }] })).toBe(stableStringify({ a: [{ x: null, y: 2 }], b: 1 }));
    expect(stableStringify({ a: 1, skip: undefined })).toBe('{"a":1}');
  });

  it("al primo login decide se caricare, scaricare o chiedere", () => {
    const local = { onboarded: true, blocks: [{ id: "b1" }], focus: null };
    expect(initialSync(local, null)).toBe("upload");
    expect(initialSync({ ...local, onboarded: false }, { onboarded: true, blocks: [] })).toBe("download");
    expect(initialSync(local, { blocks: [{ id: "b1" }], onboarded: true })).toBe("same");
    expect(initialSync(local, { onboarded: true, blocks: [] })).toBe("ask");
  });
});

describe("impegni condivisi", () => {
  const data = {
    activities: [{ id: "a1", name: "Palestra" }],
    blocks: [
      { id: "b1", date: "2026-11-02", start: "18:00", end: "19:30", activityId: "a1" },
      { id: "b2", date: "2026-11-01", start: "09:00", end: "10:00", activityId: "gone" },
      { id: "b3", date: "2026-10-20", start: "09:00", end: "10:00", activityId: "a1" },
      { id: "b4", date: "2026-11-03", start: "10:00", end: "09:00", activityId: "a1" },
    ],
    jobs: [
      { id: "j1", title: "Dentista", date: "2026-11-01", time: "17:00", minutes: 45, done: false, notes: "segreto" },
      { id: "j2", title: "Senza ora", date: "2026-11-01", time: null, done: false },
      { id: "j3", title: "Fatta", date: "2026-11-01", time: "08:00", done: true },
    ],
  };

  it("pubblica solo giorno, ora e titolo dei blocchi e delle cose con un orario, nell'intervallo", () => {
    expect(scheduleItems(data, "2026-10-30", "2026-11-27")).toEqual([
      { day: "2026-11-01", start_min: 540, end_min: 600, title: "", kind: "block" },
      { day: "2026-11-01", start_min: 1020, end_min: 1065, title: "Dentista", kind: "job" },
      { day: "2026-11-02", start_min: 1080, end_min: 1170, title: "Palestra", kind: "block" },
    ]);
  });

  it("raggruppa per giorno", () => {
    const groups = groupShared([
      { day: "2026-11-01", title: "a" },
      { day: "2026-11-01", title: "b" },
      { day: "2026-11-02", title: "c" },
    ]);
    expect(groups.map((group) => [group.day, group.items.length])).toEqual([
      ["2026-11-01", 2],
      ["2026-11-02", 1],
    ]);
  });
});

describe("account", () => {
  it("spiega cosa manca alla password", () => {
    expect(passwordProblems("abc")).toEqual(["almeno 10 caratteri", "una maiuscola", "un numero"]);
    expect(passwordProblems("Lunga-abbastanza-1")).toEqual([]);
  });

  it("riconosce le email plausibili", () => {
    expect(isValidEmail("giulia@example.com")).toBe(true);
    expect(isValidEmail("giulia@example")).toBe(false);
    expect(isValidEmail("a b@c.it")).toBe(false);
  });

  it("estrae il codice d'invito dal link o dal testo incollato", () => {
    const token = "Ab3_dEf-GhIjKlMnOpQrStUv";
    expect(inviteFromText(token)).toBe(token);
    expect(inviteFromText(`  ${inviteLink("https://lowcor.app", token)} `)).toBe(token);
    expect(inviteFromText("ciao")).toBeNull();
    expect(inviteFromText(`${token}x`)).toBeNull();
  });

  it("traduce gli errori in frasi, senza dettagli interni", () => {
    expect(cloudErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" })).toBe(
      "Email o password non corretti."
    );
    expect(cloudErrorMessage({ message: "too_many_open_invites", code: "P0001" })).toMatch(/5 inviti/);
    expect(cloudErrorMessage({ message: "Database error saving new user" })).toMatch(/consensi/);
    expect(cloudErrorMessage({ message: "TypeError: Failed to fetch" })).toMatch(/connessione/);
    expect(cloudErrorMessage({ status: 429, message: "x" })).toMatch(/Troppi tentativi/);
    expect(cloudErrorMessage({ message: "relation public.secret does not exist" })).toBe(
      "Qualcosa non ha funzionato. Riprova tra poco."
    );
    expect(cloudErrorMessage("rate_limited")).toMatch(/un'ora/);
  });
});
