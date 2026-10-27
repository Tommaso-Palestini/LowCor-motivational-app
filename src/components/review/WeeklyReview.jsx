import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { addDays, formatDate } from "../../logic/dates";
import { formatDuration } from "../../logic/time";
import { weekReview } from "../../logic/review";
import ShareDialog from "../share/ShareDialog";
import { IconCheck, IconChevronLeft, IconChevronRight, IconClose, IconSend, IconWand } from "../Icons";
import "./WeeklyReview.css";

const STEPS = ["Com'è andata", "Rifletti", "La fissa", "Prepara"];

// Il rito della domenica: cinque minuti guidati per chiudere una settimana e preparare la prossima.
function WeeklyReview({ data, now, weekStart, actions, onClose }) {
  const [step, setStep] = useState(0);
  const [proud, setProud] = useState("");
  const [change, setChange] = useState("");
  const passions = data.activities.filter((activity) => activity.type === "passion" && activity.status !== "parked");
  const currentFocus = passions.find((activity) => activity.status === "focus");
  const [focusId, setFocusId] = useState(currentFocus ? currentFocus.id : "");
  const [planned, setPlanned] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const headingRef = useRef(null);

  const review = weekReview(weekStart, data.activities, data.blocks, now);
  const nextWeek = addDays(weekStart, 7);
  const range = `${formatDate(review.dates[0], { day: "numeric", month: "long" })} – ${formatDate(review.dates[6], {
    day: "numeric",
    month: "long",
  })}`;

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(event) {
      if (event.key === "Escape" && !isSharing) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose, isSharing]);

  function finish() {
    if (focusId && focusId !== (currentFocus && currentFocus.id)) {
      actions.setFocusActivity(focusId);
    }
    actions.completeReview(weekStart, { proud: proud.trim(), change: change.trim(), focusId });
    onClose();
  }

  return createPortal(
    <div className="review" role="dialog" aria-modal="true" aria-labelledby="review-heading">
      <header className="review-bar">
        <ol className="review-steps" aria-label={`Passo ${step + 1} di ${STEPS.length}`}>
          {STEPS.map((label, index) => (
            <li key={label} className={index === step ? "is-current" : index < step ? "is-done" : ""}>
              <span className="review-step-dot" />
              <span className="review-step-label">{label}</span>
            </li>
          ))}
        </ol>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi il rito">
          <IconClose />
        </button>
      </header>

      <div className="review-body">
        <p className="review-kicker">Settimana {range}</p>

        {step === 0 && (
          <section className="review-step">
            <h2 ref={headingRef} tabIndex={-1} id="review-heading" className="review-title">
              Com'è andata
            </h2>
            {review.wins.length > 0 ? (
              <ul className="review-wins">
                {review.wins.map((win, index) => (
                  <li key={win} style={{ "--i": index }}>
                    {win}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="review-lead">
                Una settimana tranquilla. Va bene così: il rito serve proprio a ripartire con un piano chiaro.
              </p>
            )}
            <dl className="review-numbers">
              <div>
                <dt>Blocchi chiusi</dt>
                <dd>
                  {review.done}
                  <span> su {review.total}</span>
                </dd>
              </div>
              <div>
                <dt>Tempo dedicato</dt>
                <dd>{review.minutes > 0 ? formatDuration(review.minutes) : "0"}</dd>
              </div>
              {review.bestDay && (
                <div>
                  <dt>Giorno migliore</dt>
                  <dd className="review-numbers-day">{formatDate(review.bestDay.date, { weekday: "long" })}</dd>
                </div>
              )}
            </dl>
            <ul className="review-bars">
              {review.summary.map((row) => (
                <li key={row.activity.id}>
                  <span className="review-bar-name">{row.activity.name}</span>
                  <span className="review-bar-track">
                    <span style={{ width: `${Math.min(row.done / row.target, 1) * 100}%` }} />
                  </span>
                  <span className="review-bar-count">
                    {row.done}/{row.target}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {step === 1 && (
          <section className="review-step">
            <h2 ref={headingRef} tabIndex={-1} id="review-heading" className="review-title">
              Rifletti un attimo
            </h2>
            <p className="review-lead">Due righe bastano. Puoi anche saltare.</p>
            <label className="review-field">
              <span>Una cosa di cui vai fiero</span>
              <textarea
                className="field"
                rows={3}
                value={proud}
                onChange={(event) => setProud(event.target.value)}
                placeholder="Anche piccola: mi sono alzato presto martedì"
              />
            </label>
            <label className="review-field">
              <span>Una cosa da cambiare la prossima settimana</span>
              <textarea
                className="field"
                rows={3}
                value={change}
                onChange={(event) => setChange(event.target.value)}
                placeholder="Per esempio: niente blocchi dopo le 21"
              />
            </label>
          </section>
        )}

        {step === 2 && (
          <section className="review-step">
            <h2 ref={headingRef} tabIndex={-1} id="review-heading" className="review-title">
              La fissa della prossima settimana
            </h2>
            <p className="review-lead">Una passione su cui puntare. Le altre restano, ma questa viene prima.</p>
            {passions.length === 0 ? (
              <p className="review-lead">Non hai passioni attive: puoi aggiungerne una dalla sezione Attività.</p>
            ) : (
              <div className="review-choices" role="group" aria-label="Scegli la fissa">
                {passions.map((activity) => (
                  <button
                    key={activity.id}
                    type="button"
                    className="review-choice"
                    aria-pressed={focusId === activity.id}
                    onClick={() => setFocusId(activity.id)}
                  >
                    <span className="review-choice-name">{activity.name}</span>
                    {activity.description && <span className="review-choice-why">{activity.description}</span>}
                    {focusId === activity.id && <IconCheck />}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {step === 3 && (
          <section className="review-step">
            <h2 ref={headingRef} tabIndex={-1} id="review-heading" className="review-title">
              Prepara la settimana
            </h2>
            <p className="review-lead">
              Dal {formatDate(nextWeek, { day: "numeric", month: "long" })}: metti in agenda le sessioni che mancano,
              rispettando energia e giornate libere.
            </p>
            <div className="review-actions">
              <button
                type="button"
                className={`button ${planned ? "button--ghost" : "button--primary"}`}
                onClick={() => {
                  actions.planWeek(nextWeek);
                  setPlanned(true);
                }}
                disabled={planned}
              >
                {planned ? <IconCheck /> : <IconWand />}
                {planned ? "Settimana pianificata" : "Pianifica la prossima settimana"}
              </button>
              <button type="button" className="button button--ghost" onClick={() => setIsSharing(true)}>
                <IconSend />
                Crea il PDF del patto
              </button>
            </div>
          </section>
        )}
      </div>

      <footer className="review-foot">
        <button
          type="button"
          className="button button--quiet"
          onClick={() => setStep((current) => current - 1)}
          disabled={step === 0}
        >
          <IconChevronLeft />
          Indietro
        </button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="button button--primary" onClick={() => setStep((current) => current + 1)}>
            Avanti
            <IconChevronRight />
          </button>
        ) : (
          <button type="button" className="button button--primary" onClick={finish}>
            <IconCheck />
            Chiudi la settimana
          </button>
        )}
      </footer>

      {isSharing && (
        <ShareDialog
          data={data}
          now={now}
          userName={data.settings.userName}
          onUserNameChange={(name) => actions.setSetting("userName", name)}
          onClose={() => setIsSharing(false)}
          onError={actions.notify}
        />
      )}
    </div>,
    document.body
  );
}

export default WeeklyReview;
