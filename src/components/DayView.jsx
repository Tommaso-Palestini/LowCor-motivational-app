import { useState } from "react";
import DayRing from "./DayRing";
import { IconClose, IconPlus } from "./Icons";
import { getCurrentAndNext, minutesOfDay } from "../logic/time";
import { getBlockTone } from "../logic/tone";
import "./DayView.css";

function DayView({ now, date, blocks, activities, onAdd, onToggle, onDelete, onFocusBlock }) {
  const [activityId, setActivityId] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [error, setError] = useState("");

  const activitiesById = new Map(
    activities.map((activity) => [activity.id, activity])
  );
  const availableActivities = activities.filter(
    (activity) => activity.status !== "parked"
  );

  const decoratedBlocks = blocks.map((block) => {
    const activity = activitiesById.get(block.activityId);
    return {
      ...block,
      name: activity ? activity.name : "Attività eliminata",
      tone: getBlockTone(block, activity, now),
    };
  });

  const nowMinutes = minutesOfDay(now);
  const { current, next } = getCurrentAndNext(decoratedBlocks, nowMinutes);

  function handleSubmit(event) {
    event.preventDefault();
    if (activityId === "") {
      setError("Scegli un'attività per il blocco.");
      return;
    }
    if (start >= end) {
      setError("L'orario di fine deve venire dopo quello di inizio.");
      return;
    }
    setError("");
    onAdd({ date, start, end, activityId });
  }

  return (
    <section className="day" aria-labelledby="day-title">
      <h2 id="day-title" className="sr-only">
        La tua giornata
      </h2>

      <DayRing
        blocks={decoratedBlocks}
        nowMinutes={nowMinutes}
        current={current}
        next={next}
        onFocusBlock={onFocusBlock}
      />

      <div className="day-panel">
        {decoratedBlocks.length > 0 && (
          <ul className="day-list">
            {decoratedBlocks.map((block) => {
              const classes = [
                "day-item",
                `day-item--${block.tone}`,
                current && current.id === block.id ? "day-item--now" : "",
              ].join(" ");
              return (
                <li key={block.id} className={classes}>
                  <span className="day-swatch" aria-hidden="true" />
                  <label className="day-label">
                    <input
                      type="checkbox"
                      className="check"
                      checked={block.done}
                      onChange={() => onToggle(block.id)}
                    />
                    <span className="day-time">
                      {block.start} – {block.end}
                    </span>
                    <span className="day-name">{block.name}</span>
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => onDelete(block.id)}
                    aria-label={`Elimina il blocco ${block.name} delle ${block.start}`}
                  >
                    <IconClose />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form className="day-form" onSubmit={handleSubmit} noValidate>
          <select
            className="field day-form-activity"
            value={activityId}
            onChange={(event) => setActivityId(event.target.value)}
            aria-label="Attività del blocco"
          >
            <option value="">Scegli attività</option>
            {availableActivities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
          <div className="day-form-times">
            <input
              type="time"
              className="field"
              value={start}
              onChange={(event) => setStart(event.target.value)}
              aria-label="Inizio"
            />
            <span className="day-form-dash" aria-hidden="true">
              –
            </span>
            <input
              type="time"
              className="field"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              aria-label="Fine"
            />
          </div>
          <button type="submit" className="button button--primary">
            <IconPlus />
            Aggiungi blocco
          </button>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

export default DayView;
