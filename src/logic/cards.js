export function addCard(cards, { activityId, type, text }) {
  const newCard = {
    id: crypto.randomUUID(),
    activityId,
    type,
    text,
    views: 0,
    completed: 0,
    skipped: 0,
  };
  return [...cards, newCard];
}

export function incrementCardStat(cards, cardId, stat) {
  return cards.map((card) =>
    card.id === cardId ? { ...card, [stat]: card[stat] + 1 } : card
  );
}