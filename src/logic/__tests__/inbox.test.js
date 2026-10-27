import { describe, expect, it } from "vitest";
import { addThought, removeThought, thoughtToActivityName } from "../inbox";

describe("scatola dei pensieri", () => {
  it("aggiunge in cima, ignora i pensieri vuoti e li toglie", () => {
    let inbox = addThought([], "  chiamare il dentista ", new Date("2026-10-27T10:00:00Z"));
    inbox = addThought(inbox, "idea per il weekend");
    expect(inbox.map((thought) => thought.text)).toEqual(["idea per il weekend", "chiamare il dentista"]);
    expect(inbox[1].createdAt).toBe("2026-10-27T10:00:00.000Z");
    expect(addThought(inbox, "   ")).toBe(inbox);
    expect(removeThought(inbox, inbox[0].id)).toHaveLength(1);
  });

  it("da un pensiero lungo ricava un nome di attività corto", () => {
    expect(thoughtToActivityName("Imparare il giapponese\ncon le flashcard")).toBe("Imparare il giapponese");
    const name = thoughtToActivityName("Organizzare finalmente tutte le foto delle vacanze in album divisi per anno e per luogo");
    expect(name.length).toBeLessThanOrEqual(61);
    expect(name.endsWith("…")).toBe(true);
    expect(name).not.toMatch(/\s…$/);
  });
});
