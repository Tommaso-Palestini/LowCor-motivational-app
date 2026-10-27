import { useState } from "react";
import ProgressOrbit from "./ProgressOrbit";
import { t } from "../i18n";

function formatGoal(goal) {
  return goal.period === "day"
    ? t("{n} al giorno", { n: goal.amount })
    : t("{n} a settimana", { n: goal.amount });
}

function getTone(activity, progress) {
  if (activity.status === "parked") {
    return "parked";
  }
  if (progress.completed) {
    return "done";
  }
  if (activity.status === "focus") {
    return "focus";
  }
  return "planned";
}

function getMeta(activity, progress) {
  if (activity.status === "parked") {
    return t("In pausa");
  }
  if (progress.completed) {
    return t("Obiettivo raggiunto");
  }
  if (activity.status === "focus") {
    return t("Fissa della settimana, obiettivo {goal}", { goal: formatGoal(activity.goal) });
  }
  return t("Obiettivo {goal}", { goal: formatGoal(activity.goal) });
}

function ActivityItem({ activity, progress, onPark, onResume, onFocus }) {
  const [isParking, setIsParking] = useState(false);
  const [note, setNote] = useState("");

  const tone = getTone(activity, progress);
  const isParked = activity.status === "parked";
  const isPassion = activity.type === "passion";

  function handleParkSubmit(event) {
    event.preventDefault();
    onPark(activity.id, note.trim());
    setIsParking(false);
    setNote("");
  }

  return (
    <li className={`activity activity--${tone}`}>
      <ProgressOrbit done={progress.done} target={progress.target} tone={tone} />

      <div className="activity-body">
        <p className="activity-name">{activity.name}</p>
        <p className="activity-meta">{getMeta(activity, progress)}</p>
        {!isParked && (
          <span className="sr-only">
            {t("{done} su {total} completati", { done: progress.done, total: progress.target })}
          </span>
        )}
      </div>

      {!isParking && (
        <div className="activity-actions">
          {isPassion && activity.status === "active" && (
            <button type="button" className="button button--quiet" onClick={() => onFocus(activity.id)}>
              {t("Rendi fissa")}
            </button>
          )}
          {isPassion && !isParked && (
            <button type="button" className="button button--quiet" onClick={() => setIsParking(true)}>
              {t("Parcheggia")}
            </button>
          )}
          {isParked && (
            <button type="button" className="button button--ghost" onClick={() => onResume(activity.id)}>
              {t("Riprendi")}
            </button>
          )}
        </div>
      )}

      {isParked && activity.resumeNote && (
        <p className="activity-note">{t("Riparti da: {note}", { note: activity.resumeNote })}</p>
      )}

      {isParking && (
        <form className="park-form" onSubmit={handleParkSubmit}>
          <input
            className="field park-form-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t("Dove sei arrivato?")}
            aria-label={t("Dove sei arrivato con {name}", { name: activity.name })}
            autoFocus
          />
          <button type="submit" className="button button--primary">
            {t("Parcheggia")}
          </button>
          <button type="button" className="button button--quiet" onClick={() => setIsParking(false)}>
            {t("Annulla")}
          </button>
        </form>
      )}
    </li>
  );
}

export default ActivityItem;
