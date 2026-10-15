import { useState } from "react";
import ProgressOrbit from "./ProgressOrbit";

function formatGoal(goal) {
  return goal.period === "day"
    ? `${goal.amount} al giorno`
    : `${goal.amount} a settimana`;
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
    return "In pausa";
  }
  if (progress.completed) {
    return "Obiettivo raggiunto";
  }
  if (activity.status === "focus") {
    return `Fissa della settimana, obiettivo ${formatGoal(activity.goal)}`;
  }
  return `Obiettivo ${formatGoal(activity.goal)}`;
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
            {progress.done} su {progress.target} completati
          </span>
        )}
      </div>

      {!isParking && (
        <div className="activity-actions">
          {isPassion && activity.status === "active" && (
            <button type="button" className="button button--quiet" onClick={() => onFocus(activity.id)}>
              Rendi fissa
            </button>
          )}
          {isPassion && !isParked && (
            <button type="button" className="button button--quiet" onClick={() => setIsParking(true)}>
              Parcheggia
            </button>
          )}
          {isParked && (
            <button type="button" className="button button--ghost" onClick={() => onResume(activity.id)}>
              Riprendi
            </button>
          )}
        </div>
      )}

      {isParked && activity.resumeNote && (
        <p className="activity-note">Riparti da: {activity.resumeNote}</p>
      )}

      {isParking && (
        <form className="park-form" onSubmit={handleParkSubmit}>
          <input
            className="field park-form-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Dove sei arrivato?"
            aria-label={`Dove sei arrivato con ${activity.name}`}
            autoFocus
          />
          <button type="submit" className="button button--primary">
            Parcheggia
          </button>
          <button type="button" className="button button--quiet" onClick={() => setIsParking(false)}>
            Annulla
          </button>
        </form>
      )}
    </li>
  );
}

export default ActivityItem;
