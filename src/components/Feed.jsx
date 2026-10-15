import { useRef, useState } from "react";
import { sortFeed } from "../logic/feed";
import FeedCard from "./FeedCard";
import { IconShuffle } from "./Icons";
import "./Feed.css";

function Feed({ cards, activities, onView, onComplete, onSkip }) {
  const [order, setOrder] = useState(() =>
    sortFeed(cards, activities).map((card) => card.id)
  );
  const [answers, setAnswers] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef(null);

  function handleComplete(cardId) {
    setAnswers((current) => ({ ...current, [cardId]: "completed" }));
    onComplete(cardId);
  }

  function handleSkip(cardId) {
    setAnswers((current) => ({ ...current, [cardId]: "skipped" }));
    onSkip(cardId);
  }

  function reshuffle() {
    setOrder(sortFeed(cards, activities).map((card) => card.id));
    setAnswers({});
    setActiveIndex(0);
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: 0 });
    }
  }

  const activitiesById = new Map(
    activities.map((activity) => [activity.id, activity])
  );

  const visibleCards = order
    .map((cardId) => cards.find((card) => card.id === cardId))
    .filter(Boolean);

  return (
    <section className="feed-shell" aria-labelledby="feed-title">
      <div className="feed-head">
        <h2 id="feed-title" className="section-title">
          Mentre aspetti
        </h2>
        <div className="feed-tools">
          {visibleCards.length > 0 && (
            <span className="feed-counter">
              {activeIndex + 1} di {visibleCards.length}
            </span>
          )}
          <button
            type="button"
            className="icon-button"
            onClick={reshuffle}
            aria-label="Rimescola le carte"
            title="Rimescola le carte"
          >
            <IconShuffle />
          </button>
        </div>
      </div>

      <div
        ref={feedRef}
        className="feed"
        tabIndex={0}
        aria-label="Carte: scorri per passare alla successiva"
      >
        {visibleCards.length === 0 ? (
          <p className="feed-empty">
            Nessuna carta da mostrare. Le carte arrivano dalle attività che non hai parcheggiato.
          </p>
        ) : (
          visibleCards.map((card, index) => {
            const activity = activitiesById.get(card.activityId);
            return (
              <FeedCard
                key={card.id}
                card={card}
                index={index}
                activityName={activity ? activity.name : ""}
                isFocus={Boolean(activity) && activity.status === "focus"}
                answer={answers[card.id]}
                onActive={setActiveIndex}
                onView={onView}
                onComplete={handleComplete}
                onSkip={handleSkip}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

export default Feed;