export const MAX_CARDS = 200;

export function addCard(cards, { activityId, type, text, source = "manual" }) {
  const newCard = {
    id: crypto.randomUUID(),
    activityId,
    type,
    text,
    source,
    views: 0,
    completed: 0,
    skipped: 0,
  };
  return [...cards, newCard];
}

function normalize(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

// Aggiunge le carte nuove saltando i doppioni. Se sono troppe, toglie le più vecchie
// generate dall'AI che hai già visto.
export function addCards(cards, drafts) {
  const known = new Set(cards.map((card) => normalize(card.text)));
  const fresh = drafts.filter((draft) => {
    const key = normalize(draft.text);
    if (key === "" || known.has(key)) {
      return false;
    }
    known.add(key);
    return true;
  });
  let result = fresh.reduce((list, draft) => addCard(list, draft), cards);
  let overflow = result.length - MAX_CARDS;
  if (overflow > 0) {
    result = result.filter((card) => {
      if (overflow > 0 && card.source === "ai" && card.views > 0) {
        overflow -= 1;
        return false;
      }
      return true;
    });
  }
  return { cards: result, added: fresh.length };
}

export function incrementCardStat(cards, cardId, stat) {
  return cards.map((card) =>
    card.id === cardId ? { ...card, [stat]: card[stat] + 1 } : card
  );
}
