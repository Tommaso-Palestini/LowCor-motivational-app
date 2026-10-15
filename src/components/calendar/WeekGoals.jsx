import { getWeekSummary } from "../../logic/planner";
import { formatDuration } from "../../logic/time";
import { weekDates } from "../../logic/dates";
import { downloadIcs } from "../../logic/ics";
import { IconCopy, IconDownload, IconWand } from "../Icons";

function WeekGoals({ activities, blocks, weekStart, now, canPlan, onPlan, onCopy }) {
  const summary = getWeekSummary(activities, blocks, weekStart, now);
  const totalMissing = summary.reduce((sum, row) => sum + row.missing, 0);
  const minutesDone = summary.reduce((sum, row) => sum + row.minutesDone, 0);

  function exportWeek() {
    const dates = weekDates(weekStart);
    const weekBlocks = blocks.filter((block) => block.date >= dates[0] && block.date <= dates[6]);
    downloadIcs(weekBlocks, activities, `settimana-${weekStart}.ics`);
  }

  return (
    <section className="panel goals" aria-labelledby="goals-title">
      <h2 id="goals-title" className="section-title">
        Obiettivi della settimana
      </h2>

      <p className="goals-total">
        {minutesDone > 0 ? `${formatDuration(minutesDone)} fatte` : "Ancora niente di fatto"}
        {totalMissing > 0 ? `, ${totalMissing} sessioni da piazzare` : ", tutto in programma"}
      </p>

      <ul className="goals-list">
        {summary.map(({ activity, done, planned, target, missing }) => {
          const donePercent = Math.min(done / target, 1) * 100;
          const plannedPercent = Math.min(planned / target, 1 - donePercent / 100) * 100;
          const tone = activity.status === "focus" ? "focus" : "planned";
          return (
            <li key={activity.id} className="goal">
              <div className="goal-line">
                <span className="goal-name">{activity.name}</span>
                <span className="goal-count">
                  {done}/{target}
                </span>
              </div>
              <div
                className={`goal-bar goal-bar--${tone}`}
                role="img"
                aria-label={`${done} fatti, ${planned} in programma su ${target}`}
              >
                <span className="goal-done" style={{ width: `${donePercent}%` }} />
                <span className="goal-planned" style={{ width: `${plannedPercent}%` }} />
              </div>
              <p className="goal-hint">
                {missing > 0
                  ? `Ne ${missing === 1 ? "manca" : "mancano"} ${missing} da piazzare`
                  : done >= target
                    ? "Obiettivo centrato"
                    : "Tutto in programma"}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="goals-actions">
        <button
          type="button"
          className="button button--primary"
          onClick={onPlan}
          disabled={!canPlan || totalMissing === 0}
        >
          <IconWand />
          Pianifica la settimana
        </button>
        <button type="button" className="button button--ghost" onClick={onCopy}>
          <IconCopy />
          Copia la settimana prima
        </button>
        <button type="button" className="button button--quiet" onClick={exportWeek}>
          <IconDownload />
          Esporta in .ics
        </button>
      </div>
      <p className="goals-note">
        Pianifica mette le sessioni mancanti nei buchi liberi tra le 8 e le 22, all'orario in cui di solito completi
        quell'attività.
      </p>
    </section>
  );
}

export default WeekGoals;
