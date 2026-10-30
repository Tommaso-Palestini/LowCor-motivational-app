import { useState } from "react";
import { ENERGY } from "../../logic/energy";
import { JOB_MINUTES_MAX, JOB_TITLE_MAX, groupJobs } from "../../logic/jobs";
import { addDays, parseDate } from "../../logic/dates";
import { formatDuration } from "../../logic/time";
import { IconClose, IconPlus } from "../Icons";
import { locale, plural, t } from "../../i18n";
import "./Jobs.css";

const GROUPS = [
  { id: "overdue", label: "Rimaste indietro" },
  { id: "today", label: "Oggi" },
  { id: "someday", label: "Quando capita" },
  { id: "upcoming", label: "Prossimamente" },
  { id: "done", label: "Fatte oggi" },
];

function formatWhen(job, today) {
  if (!job.date) {
    return "";
  }
  let day;
  if (job.date === today) {
    day = t("oggi");
  } else if (job.date === addDays(today, 1)) {
    day = t("domani");
  } else {
    day = parseDate(job.date).toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" });
  }
  return job.time ? `${day} · ${job.time}` : day;
}

function JobForm({ onAdd }) {
  const [title, setTitle] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [minutes, setMinutes] = useState("");
  const [energy, setEnergy] = useState("medium");

  function handleSubmit(event) {
    event.preventDefault();
    if (title.trim() === "") {
      return;
    }
    onAdd({ title, date, time, minutes, energy });
    setTitle("");
    setDate("");
    setTime("");
    setMinutes("");
    setEnergy("medium");
    setShowDetails(false);
  }

  return (
    <form className="job-form" onSubmit={handleSubmit}>
      <div className="job-form-main">
        <input
          className="field"
          value={title}
          maxLength={JOB_TITLE_MAX}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("Per esempio: rinnovare la carta d'identità")}
          aria-label={t("Cosa c'è da fare")}
        />
        <button type="submit" className="icon-button icon-button--filled" aria-label={t("Aggiungi la cosa da fare")}>
          <IconPlus />
        </button>
      </div>
      {showDetails ? (
        <div className="job-form-details">
          <label className="job-field">
            <span>{t("Giorno")}</span>
            <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="job-field">
            <span>{t("Ora")}</span>
            <input
              className="field"
              type="time"
              value={time}
              disabled={!date}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>
          <label className="job-field">
            <span>{t("Minuti")}</span>
            <input
              className="field"
              type="number"
              min="5"
              max={JOB_MINUTES_MAX}
              step="5"
              inputMode="numeric"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>
          <label className="job-field">
            <span>{t("Energia")}</span>
            <select className="field" value={energy} onChange={(event) => setEnergy(event.target.value)}>
              {Object.entries(ENERGY).map(([id, level]) => (
                <option key={id} value={id}>
                  {t(level.label)}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <button type="button" className="button button--quiet job-form-more" onClick={() => setShowDetails(true)}>
          {t("Giorno, ora e durata")}
        </button>
      )}
    </form>
  );
}

function JobItem({ job, today, onToggle, onDelete, onPostpone }) {
  const when = formatWhen(job, today);
  const meta = [when, job.minutes ? formatDuration(job.minutes) : "", job.energy !== "medium" ? t(ENERGY[job.energy].label) : ""]
    .filter(Boolean)
    .join(" · ");
  const overdue = !job.done && job.date && job.date < today;

  return (
    <li className={`job ${job.done ? "job--done" : ""}`}>
      <label className="job-label">
        <input type="checkbox" className="check" checked={job.done} onChange={() => onToggle(job.id)} />
        <span className="job-body">
          <span className="job-title">{job.title}</span>
          {meta && <span className="job-meta">{meta}</span>}
        </span>
      </label>
      {overdue && (
        <button type="button" className="button button--quiet" onClick={() => onPostpone(job.id, today)}>
          {t("A oggi")}
        </button>
      )}
      <button
        type="button"
        className="icon-button"
        onClick={() => onDelete(job.id)}
        aria-label={t("Elimina {name}", { name: job.title })}
      >
        <IconClose />
      </button>
    </li>
  );
}

// Cose da fare una volta sola: si aggiungono in un attimo, si spuntano e spariscono
function Jobs({ jobs, today, onAdd, onToggle, onDelete, onPostpone, onClearDone }) {
  const groups = groupJobs(jobs, today);
  const open = jobs.filter((job) => !job.done).length;

  return (
    <section className="panel jobs" aria-labelledby="jobs-title">
      <div className="jobs-head">
        <h2 id="jobs-title" className="section-title">
          {t("Da fare una volta")}
        </h2>
        {open > 0 && (
          <span className="jobs-count">
            {open} {plural(open, "aperta", "aperte")}
          </span>
        )}
      </div>

      {jobs.length === 0 ? (
        <p className="jobs-empty">{t("Le commissioni e le cose da fare una volta sola: si spuntano e spariscono.")}</p>
      ) : (
        GROUPS.filter((group) => groups[group.id].length > 0).map((group) => (
          <div key={group.id} className={`job-group job-group--${group.id}`}>
            <h3 className="job-group-title">{t(group.label)}</h3>
            <ul className="job-list">
              {groups[group.id].map((job) => (
                <JobItem
                  key={job.id}
                  job={job}
                  today={today}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onPostpone={onPostpone}
                />
              ))}
            </ul>
            {group.id === "done" && (
              <button type="button" className="button button--quiet" onClick={onClearDone}>
                {t("Togli le fatte")}
              </button>
            )}
          </div>
        ))
      )}

      <JobForm onAdd={onAdd} />
    </section>
  );
}

export default Jobs;
