import { useEffect, useRef, useState } from "react";
import { sortFeed } from "../logic/feed";
import FeedCard from "./FeedCard";
import { IconShuffle, IconSparkle } from "./Icons";
import "./Feed.css";

function Feed({ cards, activities, onView, onComplete, onSkip, aiReady, isGenerating, autoMore, onGenerate }) {
  const [order, setOrder] = useState(() =>
    sortFeed(cards, activities).map((card) => card.id)
  );
  const [answers, setAnswers] = useState({});
  const [activeIndex, setActiveIndex] = useState(0);
  const feedRef = useRef(null);
  const askedAtRef = useRef(-1);

  // Le carte arrivate dopo l'ultimo rimescolo (per esempio quelle appena generate)
  // si accodano in fondo, così il feed non salta in cima mentre scorri.
  const known = new Set(order);
  const appended = sortFeed(
    cards.filter((card) => !known.has(card.id)),
    activities
  ).map((card) => card.id);

  const visibleCards = [...order, ...appended]
    .map((cardId) => cards.find((card) => card.id === cardId))
    .filter(Boolean);

  const isAtEnd = visibleCards.length > 0 && activeIndex >= visibleCards.length - 1;

  // Carte infinite: quando arrivi all'ultima ne chiede altre, una volta sola per giro.
  useEffect(() => {
    if (autoMore && aiReady && !isGenerating && isAtEnd && askedAtRef.current !== visibleCards.length) {
      askedAtRef.current = visibleCards.length;
      onGenerate({ silent: true });
    }
  }, [autoMore, aiReady, isGenerating, isAtEnd, visibleCards.length, onGenerate]);

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
          {aiReady && (
            <button
              type="button"
              className={`icon-button ${isGenerating ? "feed-generate--busy" : ""}`}
              onClick={() => onGenerate({ silent: false })}
              disabled={isGenerating}
              aria-label="Genera nuove carte con l'AI"
              title="Genera nuove carte con l'AI"
            >
              <IconSparkle />
            </button>
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
        aria-busy={isGenerating}
      >
        {visibleCards.length === 0 && !isGenerating ? (
          <div className="feed-empty">
            <p>Nessuna carta da mostrare. Le carte arrivano dalle attività che non hai parcheggiato.</p>
            {aiReady && (
              <button type="button" className="button button--primary" onClick={() => onGenerate({ silent: false })}>
                <IconSparkle />
                Genera le prime carte
              </button>
            )}
          </div>
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

        {isGenerating && (
          <div className="feed-card feed-card--loading" role="status">
            <div className="feed-loading-orb" aria-hidden="true" />
            <p className="feed-text">Sto pescando nuove carte…</p>
            <p className="feed-loading-note">L'AI gira sul tuo computer: può volerci qualche decina di secondi.</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;
