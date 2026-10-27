import { afterEach, describe, expect, it } from "vitest";
import { locale, setLanguage, t } from "../../i18n";
import en from "../../i18n/en";

afterEach(() => setLanguage("it"));

describe("traduzioni", () => {
  it("in italiano restituisce il testo con i segnaposto sostituiti", () => {
    expect(t("Inizia {n} minuti", { n: 25 })).toBe("Inizia 25 minuti");
    expect(locale()).toBe("it-IT");
  });

  it("in inglese traduce, e una frase non tradotta resta leggibile in italiano", () => {
    setLanguage("en");
    expect(t("Inizia {n} minuti", { n: 25 })).toBe("Start 25 minutes");
    expect(t("Frase che non esiste")).toBe("Frase che non esiste");
    expect(locale()).toBe("en-GB");
  });

  it("ogni traduzione inglese mantiene gli stessi segnaposto dell'italiano", () => {
    const placeholders = (text) => (text.match(/\{\w+\}/g) || []).sort().join();
    const broken = Object.entries(en).filter(([key, value]) => placeholders(key) !== placeholders(value));
    expect(broken).toEqual([]);
  });
});
