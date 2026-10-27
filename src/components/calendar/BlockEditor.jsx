import { useEffect, useRef, useState } from "react";
import { buildSeries, defaultWeekdays, findConflicts } from "../../logic/calendar";
import { toDateString } from "../../logic/dates";
import { minutesOfDay, timeToMinutes } from "../../logic/time";
import { IconCalendarPlus, IconClose, IconRepeat, IconTarget } from "../Icons";
import { googleCalendarUrl, shareIcs } from "../../logic/ics";

const WEEKDAY_LABELS = [
  ["L", "lunedì"],
  ["M", "martedì"],
  ["M", "mercoledì"],
  ["G", "giovedì"],
  ["V", "venerdì"],
  ["S", "sabato"],
  ["D", "domenica"],
];

function pickDefaultActivity(activities) {
  const available = activities.filter((activity) => activity.status !== "parked");
  const focus = available.find((activity) => activity.status === "focus");
  if (focus) {
    return focus.id;
  }
  return available[0] ? available[0].id : "";
}

function BlockEditor({
  editor,
  blocks,
  activities,
  now,
  onClose,
  onCreate,
  onSave,
  onToggle,
  onDelete,
  onDeleteSeries,
  onFocus,
}) {
  const dialogRef = useRef(null);
  const existing = editor.mode === "edit" ? blocks.find((block) => block.id === editor.blockId) : null;
  const initial = existing || editor.draft;

  const [activityId, setActivityId] = useState(initial.activityId || pickDefaultActivity(activities));
  const [date, setDate] = useState(initial.date);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [repeat, setRepeat] = useState(false);
  const [weekdays, setWeekdays] = useState(() => defaultWeekdays(initial.date));
  const [weeks, setWeeks] = useState(8);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  if (editor.mode === "edit" && !existing) {
    return null;
  }

  const selectable = activities.filter(
    (activity) => activity.status !== "parked" || activity.id === activityId
  );
  const conflicts = start < end ? findConflicts(blocks, { date, start, end }, existing ? existing.id : null) : [];
  const activityName = (id) => {
    const activity = activities.find((item) => item.id === id);
    return activity ? activity.name : "un blocco";
  };
  const canFocus =
    existing &&
    !existing.done &&
    existing.date === toDateString(now) &&
    timeToMinutes(existing.end) > minutesOfDay(now);

  function toggleWeekday(index) {
    setWeekdays((current) =>
      current.includes(index) ? current.filter((value) => value !== index) : [...current, index].sort()
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (activityId === "") {
      setError("Scegli un'attività.");
      return;
    }
    if (start >= end) {
      setError("L'orario di fine deve venire dopo quello di inizio.");
      return;
    }
    if (repeat && weekdays.length === 0) {
      setError("Scegli almeno un giorno per la ripetizione.");
      return;
    }
    const draft = { activityId, date, start, end };
    if (existing) {
      onSave(existing.id, draft);
    } else if (repeat) {
      onCreate(buildSeries(draft, weekdays, Math.max(Number(weeks) || 1, 1)));
    } else {
      onCreate([draft]);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="editor"
      aria-labelledby="editor-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <form className="editor-form" onSubmit={handleSubmit} noValidate>
        <div className="editor-head">
          <h2 id="editor-title" className="section-title">
            {existing ? "Modifica blocco" : "Nuovo blocco"}
          </h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi">
            <IconClose />
          </button>
        </div>

        <label className="editor-field">
          <span>Attività</span>
          <select className="field" value={activityId} onChange={(event) => setActivityId(event.target.value)}>
            <option value="">Scegli attività</option>
            {selectable.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
        </label>

        <div className="editor-row">
          <label className="editor-field">
            <span>Giorno</span>
            <input
              type="date"
              className="field"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                if (!repeat) {
                  setWeekdays(defaultWeekdays(event.target.value));
                }
              }}
              required
            />
          </label>
          <label className="editor-field">
            <span>Dalle</span>
            <input type="time" className="field" value={start} onChange={(event) => setStart(event.target.value)} />
          </label>
          <label className="editor-field">
            <span>Alle</span>
            <input type="time" className="field" value={end} onChange={(event) => setEnd(event.target.value)} />
          </label>
        </div>

        {conflicts.length > 0 && (
          <p className="editor-warning" role="status">
            Si sovrappone a{" "}
            {conflicts
              .map((block) => `${activityName(block.activityId)} (${block.start}–${block.end})`)
              .join(", ")}
            . Puoi salvarlo lo stesso: nel calendario li vedrai affiancati.
          </p>
        )}

        {!existing && (
          <div className="editor-repeat">
            <label className="editor-check">
              <input type="checkbox" className="check" checked={repeat} onChange={(event) => setRepeat(event.target.checked)} />
              <IconRepeat />
              Ripeti ogni settimana
            </label>
            {repeat && (
              <div className="editor-repeat-options">
                <div className="editor-weekdays" role="group" aria-label="Giorni della settimana">
                  {WEEKDAY_LABELS.map(([letter, name], index) => (
                    <button
                      key={name}
                      type="button"
                      className="editor-weekday"
                      aria-pressed={weekdays.includes(index)}
                      aria-label={name}
                      onClick={() => toggleWeekday(index)}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
                <label className="editor-weeks">
                  per
                  <input
                    type="number"
                    min="1"
                    max="52"
                    className="field field--narrow"
                    value={weeks}
                    onChange={(event) => setWeeks(event.target.value)}
                  />
                  settimane
                </label>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="editor-actions">
          <button type="submit" className="button button--primary">
            {existing ? "Salva" : repeat ? "Crea la serie" : "Crea blocco"}
          </button>
          {existing && (
            <button type="button" className="button button--ghost" onClick={() => onToggle(existing.id)}>
              {existing.done ? "Segna da fare" : "Segna come fatto"}
            </button>
          )}
          {canFocus && (
            <button type="button" className="button button--ghost" onClick={() => onFocus(existing)}>
              <IconTarget />
              Entra in focus
            </button>
          )}
        </div>

        {existing && (
          <div className="editor-export">
            <p className="editor-export-label">
              <IconCalendarPlus />
              Aggiungi al tuo calendario
            </p>
            <div className="editor-export-actions">
              <a
                className="button button--quiet"
                href={googleCalendarUrl(existing, activities.find((activity) => activity.id === existing.activityId))}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Calendar
              </a>
              <button
                type="button"
                className="button button--quiet"
                onClick={() => shareIcs([existing], activities, `lowcor-${existing.date}-${existing.start.replace(":", "")}.ics`).catch(() => {})}
              >
                Apple, Outlook (.ics)
              </button>
              {existing.seriesId && (
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() =>
                    shareIcs(
                      blocks.filter((block) => block.seriesId === existing.seriesId),
                      activities,
                      `lowcor-serie-${existing.date}.ics`
                    ).catch(() => {})
                  }
                >
                  Tutta la serie (.ics)
                </button>
              )}
            </div>
          </div>
        )}

        {existing && (
          <div className="editor-danger">
            <button type="button" className="button button--danger" onClick={() => onDelete(existing.id)}>
              {existing.seriesId ? "Elimina solo questo" : "Elimina blocco"}
            </button>
            {existing.seriesId && (
              <button
                type="button"
                className="button button--danger"
                onClick={() => onDeleteSeries(existing.seriesId)}
              >
                Elimina tutta la serie
              </button>
            )}
          </div>
        )}
      </form>
    </dialog>
  );
}

export default BlockEditor;
