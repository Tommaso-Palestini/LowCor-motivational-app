import en from "./en";

// Traduzioni in stile gettext: il testo italiano è la chiave, così il codice resta leggibile
// e una frase non ancora tradotta compare in italiano invece di rompersi.
const DICTIONARIES = { en };
let language = "it";

export const LANGUAGES = [
  { id: "it", label: "Italiano" },
  { id: "en", label: "English" },
];

export function setLanguage(next) {
  language = DICTIONARIES[next] || next === "it" ? next : "it";
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }
}

export function getLanguage() {
  return language;
}

// Locale per date e numeri
export function locale() {
  return language === "en" ? "en-GB" : "it-IT";
}

// t("Ciao {name}", { name }) -> testo tradotto con i segnaposto sostituiti
export function t(text, vars) {
  const translated = (language !== "it" && DICTIONARIES[language]?.[text]) || text;
  if (!vars) {
    return translated;
  }
  return translated.replace(/\{(\w+)\}/g, (match, key) => (key in vars ? String(vars[key]) : match));
}

// Singolare o plurale: plural(n, "blocco", "blocchi")
export function plural(count, one, many) {
  return t(count === 1 ? one : many);
}
