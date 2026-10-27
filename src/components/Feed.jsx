import { useEffect, useRef, useState } from "react";
import { sortFeed } from "../logic/feed";
import FeedCard from "./FeedCard";
import { IconShuffle, IconSparkle } from "./Icons";
import "./Feed.css";
import { t } from "../i18n";

const FILTERS = [
  { id: "all", label: "Tutte", empty: "Nessuna carta da mostrare. Le carte arrivano dalle attività che non hai parcheggiato." },
  { id: "micro-task", label: "Micro-task", empty: "Nessun micro-task per ora: piccole cose da fare in pochi minuti." },
  { id: "fact", label: "Curiosità", empty: "Nessuna curiosità per ora: fatti sorprendenti sulle tue attività." },
  // le etichette passano da t() al momento di disegnarle
];

function Feed({
  cards,
  activities,
  onView,
  onComplete,
  onSkip,
  aiReady,
  isGenerating,
  autoMore,
  onGenerate,
  filter = "all",
  onFilterChange,
}) {
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

  const allCards = [...order, ...appended]
    .map((cardId) => cards.find((card) => card.id === cardId))
    .filter(Boolean);
  const visibleCards = filter === "all" ? allCards : allCards.filter((card) => card.type === filter);
  const counts = {
    all: allCards.length,
    "micro-task": allCards.filter((card) => card.type === "micro-task").length,
    fact: allCards.filter((card) => card.type === "fact").length,
  };
  const only = filter === "all" ? null : filter;
  const currentFilter = FILTERS.find((item) => item.id === filter) || FILTERS[0];

  const isAtEnd = visibleCards.length > 0 && activeIndex >= visibleCards.length - 1;

  // Carte infinite: quando arrivi all'ultima ne chiede altre, una volta sola per giro.
  useEffect(() => {
    if (autoMore && aiReady && !isGenerating && isAtEnd && askedAtRef.current !== visibleCards.length) {
      askedAtRef.current = visibleCards.length;
      onGenerate({ silent: true, only });
    }
  }, [autoMore, aiReady, isGenerating, isAtEnd, visibleCards.length, onGenerate, only]);

  function changeFilter(value) {
    if (value === filter) {
      return;
    }
    onFilterChange(value);
    setActiveIndex(0);
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: 0 });
    }
  }

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
          {t("Mentre aspetti")}
        </h2>
        <div className="feed-tools">
          {visibleCards.length > 0 && (
            <span className="feed-counter">
              {t("{n} di {total}", { n: activeIndex + 1, total: visibleCards.length })}
            </span>
          )}
          {aiReady && (
            <button
              type="button"
              className={`icon-button ${isGenerating ? "feed-generate--busy" : ""}`}
              onClick={() => onGenerate({ silent: false, only })}
              disabled={isGenerating}
              aria-label={t("Genera nuove carte con l'AI")}
              title={only === "fact" ? t("Genera nuove curiosità con l'AI") : only ? t("Genera nuovi micro-task con l'AI") : t("Genera nuove carte con l'AI")}
            >
              <IconSparkle />
            </button>
          )}
          <button
            type="button"
            className="icon-button"
            onClick={reshuffle}
            aria-label={t("Rimescola le carte")}
            title={t("Rimescola le carte")}
          >
            <IconShuffle />
          </button>
        </div>
      </div>

      <div className="feed-filters" role="group" aria-label={t("Cosa vuoi vedere")}>
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            className={`feed-filter feed-filter--${item.id}`}
            onClick={() => changeFilter(item.id)}
          >
            {t(item.label)}
            <span className="feed-filter-count">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      <div
        ref={feedRef}
        className="feed"
        tabIndex={0}
        aria-label={t("Carte: scorri per passare alla successiva")}
        aria-busy={isGenerating}
      >
        {visibleCards.length === 0 && !isGenerating ? (
          <div className="feed-empty">
            <p>{t(currentFilter.empty)}</p>
            {aiReady && (
              <button type="button" className="button button--primary" onClick={() => onGenerate({ silent: false, only })}>
                <IconSparkle />
                {only === "fact" ? t("Genera curiosità") : only ? t("Genera micro-task") : t("Genera le prime carte")}
              </button>
            )}
            {!aiReady && filter !== "all" && (
              <button type="button" className="button button--ghost" onClick={() => changeFilter("all")}>
                {t("Mostra tutte le carte")}
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
            <p className="feed-text">{t("Sto pescando nuove carte…")}</p>
            <p className="feed-loading-note">{t("L'AI gira sul tuo computer: può volerci qualche decina di secondi.")}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default Feed;
