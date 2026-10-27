import { useEffect, useRef } from "react";
import { IconCheck, IconSparkle } from "./Icons";
import { prefersReducedMotion } from "../logic/motion";

const ADVANCE_DELAY = 450;

function FeedCard({
  card,
  index,
  activityName,
  isFocus,
  answer,
  onActive,
  onView,
  onComplete,
  onSkip,
}) {
  const elementRef = useRef(null);
  const viewedRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }
        onActive(index);
        if (!viewedRef.current) {
          viewedRef.current = true;
          onView(card.id);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [card.id, index, onActive, onView]);

  function advance() {
    const element = elementRef.current;
    const nextCard = element && element.nextElementSibling;
    if (!nextCard) {
      return;
    }
    const reduceMotion = prefersReducedMotion();
    window.setTimeout(() => {
      element.parentElement.scrollTo({
        top: nextCard.offsetTop,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }, ADVANCE_DELAY);
  }

  function handleComplete() {
    onComplete(card.id);
    advance();
  }

  function handleSkip() {
    onSkip(card.id);
    advance();
  }

  const isFact = card.type === "fact";
  const classes = [
    "feed-card",
    isFocus ? "feed-card--focus" : "",
    answer ? "feed-card--answered" : "",
  ].join(" ");

  return (
    <article ref={elementRef} className={classes}>
      <div className="feed-chips">
        <span className="chip">{activityName}</span>
        <span className="chip chip--quiet">{isFact ? "Curiosità" : "Micro-task"}</span>
        {card.source === "ai" && (
          <span className="chip chip--quiet chip--ai" title="Generata dall'AI locale">
            <IconSparkle />
            AI
          </span>
        )}
      </div>

      <p className="feed-text">{card.text}</p>

      {answer ? (
        <p className={`feed-result feed-result--${answer}`}>
          {answer === "completed" && <IconCheck />}
          {answer === "completed" ? (isFact ? "Salvata tra le interessanti" : "Fatto") : "Saltata"}
        </p>
      ) : (
        <div className="feed-actions">
          <button type="button" className="button button--ghost" onClick={handleSkip}>
            Salta
          </button>
          <button type="button" className="button button--primary" onClick={handleComplete}>
            {isFact ? "Interessante" : "Fatto"}
          </button>
        </div>
      )}
    </article>
  );
}

export default FeedCard;
