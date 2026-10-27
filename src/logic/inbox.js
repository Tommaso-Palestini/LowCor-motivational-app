// Scatola dei pensieri: si butta dentro un'idea in due secondi, senza decidere niente,
// e la si smista dopo (promemoria, attività o cestino). Svuotare la testa prima, organizzare poi.
export const ACTIVITY_NAME_MAX = 60;

export function addThought(inbox, text, now = new Date()) {
  const trimmed = text.trim();
  if (trimmed === "") {
    return inbox;
  }
  return [{ id: crypto.randomUUID(), text: trimmed, createdAt: now.toISOString() }, ...inbox];
}

export function removeThought(inbox, thoughtId) {
  return inbox.filter((thought) => thought.id !== thoughtId);
}

// Un pensiero lungo diventa un nome di attività leggibile: prima riga, tagliata a parola intera
export function thoughtToActivityName(text) {
  const firstLine = text.split("\n")[0].trim();
  if (firstLine.length <= ACTIVITY_NAME_MAX) {
    return firstLine;
  }
  const cut = firstLine.slice(0, ACTIVITY_NAME_MAX);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}
