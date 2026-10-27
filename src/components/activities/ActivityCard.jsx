import { useState } from "react";
import ProgressOrbit from "../ProgressOrbit";
import EnergyChip from "../EnergyChip";
import ActivityEditor from "./ActivityEditor";
import { activityStats } from "../../logic/activityStats";
import { calculateProgress } from "../../logic/progress";
import { formatDate } from "../../logic/dates";

function formatGoal(goal) {
  return goal.period === "day" ? `${goal.amount} al giorno` : `${goal.amount} a settimana`;
}

function formatHours(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = minutes / 60;
  return `${hours < 10 ? hours.toFixed(1).replace(".", ",").replace(",0", "") : Math.round(hours)} h`;
}

function WeekStrip({ weeks, target }) {
  return (
    <div className="act-weeks" role="img" aria-label={`Ultime 8 settimane: ${weeks.map((week) => week.count).join(", ")} sessioni`}>
      {weeks.map((week) => (
        <span
          key={week.start}
          className={`act-week ${week.met ? "act-week--met" : ""} ${week.jolly ? "act-week--jolly" : ""} ${week.current ? "act-week--current" : ""}`}
          title={`Settimana del ${formatDate(week.start, { day: "numeric", month: "short" })}: ${week.count}/${target}${week.jolly ? ", coperta dal jolly" : ""}`}
        >
          <span style={{ height: `${Math.min(week.count / target, 1) * 100}%` }} />
        </span>
      ))}
    </div>
  );
}

function ActivityCard({ activity, blocks, now, actions }) {
  // view, edit, park, delete, release-1, release-2
  const [mode, setMode] = useState("view");
  const [note, setNote] = useState("");

  const stats = activityStats(activity, blocks, now);
  const progress = calculateProgress(activity, blocks, now);
  const isFixed = activity.type === "fixed";
  const isParked = activity.status === "parked";
  const tone = isParked ? "parked" : progress.completed ? "done" : activity.status === "focus" ? "focus" : "planned";

  const classes = [
    "act-card",
    isFixed ? "act-card--fixed" : "act-card--passion",
    isParked ? "act-card--parked" : "",
    activity.status === "focus" ? "act-card--focus" : "",
    mode.startsWith("release") ? "act-card--warning" : "",
  ].join(" ");

  if (mode === "edit") {
    return (
      <li className={classes}>
        <ActivityEditor
          activity={activity}
          submitLabel="Salva modifiche"
          onCancel={() => setMode("view")}
          onSubmit={({ name, description, amount, period, energy }) => {
            actions.updateActivity(activity.id, { name, description, energy, goal: { amount, period } });
            setMode("view");
          }}
        />
      </li>
    );
  }

  return (
    <li className={classes}>
      <div className="act-card-head">
        <ProgressOrbit done={progress.done} target={progress.target} tone={tone} />
        <div className="act-card-title">
          <h3 className="act-card-name">{activity.name}</h3>
          <p className="act-card-goal">
            {isParked ? "In pausa" : `Obiettivo ${formatGoal(activity.goal)}`}
            {activity.status === "focus" && ", la fissa della settimana"}
          </p>
        </div>
        <EnergyChip activity={activity} onChange={actions.setActivityEnergy} />
      </div>

      {activity.description ? (
        <p className="act-card-description">{activity.description}</p>
      ) : (
        <button type="button" className="act-card-description act-card-description--empty" onClick={() => setMode("edit")}>
          Aggiungi una descrizione: perché la fai?
        </button>
      )}

      {isParked && activity.resumeNote && <p className="act-card-note">Riparti da: {activity.resumeNote}</p>}

      <div className="act-card-stats">
        <WeekStrip weeks={stats.weeks} target={stats.target} />
        <dl className="act-stats">
          <div>
            <dt>Serie{stats.jollyUsed ? ", con jolly" : ""}</dt>
            <dd>
              {stats.streak} <span>{stats.streak === 1 ? "settimana" : "settimane"}</span>
            </dd>
          </div>
          <div>
            <dt>Sessioni</dt>
            <dd>{stats.sessions}</dd>
          </div>
          <div>
            <dt>Tempo dato</dt>
            <dd>{formatHours(stats.minutes)}</dd>
          </div>
        </dl>
      </div>

      {stats.next && !isParked && (
        <p className="act-card-next">
          Prossimo blocco {formatDate(stats.next.date, { weekday: "long", day: "numeric", month: "short" })} alle{" "}
          {stats.next.start}
        </p>
      )}

      {mode === "view" && (
        <div className="act-card-actions">
          <button type="button" className="button button--quiet" onClick={() => setMode("edit")}>
            Modifica
          </button>
          {isFixed ? (
            <button type="button" className="button button--quiet" onClick={() => setMode("release-1")}>
              Rendi passione
            </button>
          ) : (
            <button type="button" className="button button--quiet" onClick={() => actions.setActivityType(activity.id, "fixed")}>
              Rendi non negoziabile
            </button>
          )}
          {!isFixed && activity.status === "active" && (
            <button type="button" className="button button--quiet" onClick={() => actions.setFocusActivity(activity.id)}>
              Rendi fissa
            </button>
          )}
          {!isFixed && !isParked && (
            <button type="button" className="button button--quiet" onClick={() => setMode("park")}>
              Parcheggia
            </button>
          )}
          {isParked && (
            <button type="button" className="button button--ghost" onClick={() => actions.resumeActivity(activity.id)}>
              Riprendi
            </button>
          )}
          <button type="button" className="button button--quiet act-card-delete" onClick={() => setMode("delete")}>
            Elimina
          </button>
        </div>
      )}

      {mode === "park" && (
        <form
          className="act-confirm"
          onSubmit={(event) => {
            event.preventDefault();
            actions.parkActivity(activity.id, note.trim());
            setNote("");
            setMode("view");
          }}
        >
          <input
            className="field"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Dove sei arrivato?"
            aria-label={`Dove sei arrivato con ${activity.name}`}
            autoFocus
          />
          <div className="act-confirm-actions">
            <button type="submit" className="button button--primary">
              Parcheggia
            </button>
            <button type="button" className="button button--quiet" onClick={() => setMode("view")}>
              Annulla
            </button>
          </div>
        </form>
      )}

      {mode === "delete" && (
        <div className="act-confirm" role="alertdialog" aria-label={`Eliminare ${activity.name}?`}>
          <p className="act-confirm-title">Eliminare {activity.name}?</p>
          <p className="act-confirm-text">
            {stats.blockCount > 0
              ? `Spariscono anche i suoi ${stats.blockCount} blocchi dal calendario. Potrai annullare subito dopo.`
              : "Potrai annullare subito dopo."}
          </p>
          <div className="act-confirm-actions">
            <button type="button" className="button button--danger" onClick={() => actions.deleteActivity(activity.id)} autoFocus>
              Elimina
            </button>
            <button type="button" className="button button--quiet" onClick={() => setMode("view")}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {mode === "release-1" && (
        <div className="act-confirm act-confirm--warn" role="alertdialog" aria-label="Prima conferma">
          <p className="act-confirm-title">Vuoi lasciar andare {activity.name}?</p>
          <p className="act-confirm-text">
            Una non negoziabile è una promessa fatta a te stesso. Come passione potrai saltarla o parcheggiarla.
          </p>
          <div className="act-confirm-actions">
            <button type="button" className="button button--warn" onClick={() => setMode("release-2")}>
              Sì, rendila una passione
            </button>
            <button type="button" className="button button--primary" onClick={() => setMode("view")} autoFocus>
              Tienila non negoziabile
            </button>
          </div>
        </div>
      )}

      {mode === "release-2" && (
        <div className="act-confirm act-confirm--warn" role="alertdialog" aria-label="Seconda conferma">
          <p className="act-confirm-title">Sicuro davvero?</p>
          <p className="act-confirm-text">
            {stats.streak > 0
              ? `Hai centrato ${activity.name} per ${stats.streak} ${stats.streak === 1 ? "settimana" : "settimane"} di fila. `
              : stats.sessions > 0
                ? `Ci hai già dedicato ${stats.sessions} sessioni. `
                : ""}
            Da adesso non sarà più un impegno fisso.
          </p>
          <div className="act-confirm-actions">
            <button
              type="button"
              className="button button--warn"
              onClick={() => {
                actions.setActivityType(activity.id, "passion");
                setMode("view");
              }}
            >
              Confermo, lasciala andare
            </button>
            <button type="button" className="button button--primary" onClick={() => setMode("view")} autoFocus>
              Ci ho ripensato
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default ActivityCard;
