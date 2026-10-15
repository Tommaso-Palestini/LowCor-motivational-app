export function scoreCard(card, activity) {
  const engagement = (card.completed + 1) / (card.completed + card.skipped + 2);
  const focusBonus = activity.status === "focus" ? 1.5 : 1;
  const freshness = 1 / (1 + card.views * 0.05);
  const randomness = 0.8 + Math.random() * 0.4;
  return engagement * focusBonus * freshness * randomness;
}

export function sortFeed(cards, activities) {
  const activitiesById = new Map(
    activities.map((activity) => [activity.id, activity])
  );

  return cards
    .filter((card) => {
      const activity = activitiesById.get(card.activityId);
      return activity && activity.status !== "parked";
    })
    .map((card) => ({
      card,
      score: scoreCard(card, activitiesById.get(card.activityId)),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.card);
}