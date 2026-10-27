import { getWeekSummary } from "../../logic/planner";
import { formatDuration } from "../../logic/time";
import { formatDate, weekDates } from "../../logic/dates";
import { downloadIcs } from "../../logic/ics";
import { IconBatteryLow, IconCopy, IconDownload, IconWand } from "../Icons";
import EnergyChip from "../EnergyChip";

function shortDay(date) {
  return formatDate(date, { weekday: "short", day: "numeric" });
}

function WeekEnergy({ energy, limits, rebalance, onMoveBlock }) {
  const scale = Math.max(limits.maxLoad, ...energy.map((day) => day.load), 1);
  const overloaded = energy.filter((day) => day.overloaded);

  return (
    <div className="energy">
      <div className="energy-head">
        <h3 className="energy-title">Energia della settimana</h3>
        <span className="energy-legend">soglia {limits.maxLoad} punti</span>
      </div>

      <ol className="energy-bars" style={{ "--limit": `${(limits.maxLoad / scale) * 100}%` }}>
        {energy.map((day) => (
          <li
            key={day.date}
            className={`energy-day ${day.overloaded ? "energy-day--over" : ""}`}
            title={`${shortDay(day.date)}: ${day.load} punti, ${day.high} blocchi intensi`}
          >
            <span className="energy-bar">
              <span style={{ height: `${(day.load / scale) * 100}%` }} />
            </span>
            <span className="energy-load">{day.load}</span>
            <span className="energy-day-name">{formatDate(day.date, { weekday: "narrow" })}</span>
          </li>
        ))}
      </ol>

      {overloaded.length === 0 ? (
        <p className="goal-hint">Nessun giorno oltre la soglia: il carico è distribuito bene.</p>
      ) : (
        <div className="energy-warnings">
          {overloaded.map((day) => {
            const moves = rebalance.filter((move) => move.block.date === day.date);
            return (
              <div key={day.date} className="energy-warning">
                <p className="energy-warning-title">
                  <IconBatteryLow />
                  {shortDay(day.date)}: rischio overload
                </p>
                <p className="goal-hint">
                  {day.load} punti e {day.high} {day.high === 1 ? "blocco intenso" : "blocchi intensi"}
                  {moves.length > 0 ? ". Prova a spostare:" : ". Nessun giorno libero dove spostare i blocchi: accorciane o togline uno."}
                </p>
                {moves.length > 0 && (
                  <ul className="energy-moves">
                    {moves.map(({ block, activity, to }) => (
                      <li key={block.id} className="energy-move">
                        <span>
                          <strong>{activity ? activity.name : "Blocco"}</strong> {block.start} a {shortDay(to.date)}{" "}
                          {to.start}
                        </span>
                        <button
                          type="button"
                          className="button button--quiet energy-move-button"
                          onClick={() => onMoveBlock(block.id, to)}
                        >
                          Sposta
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WeekGoals({
  activities,
  blocks,
  weekStart,
  now,
  canPlan,
  energy,
  limits,
  rebalance,
  onMoveBlock,
  onSetEnergy,
  onPlan,
  onCopy,
}) {
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
                <EnergyChip activity={activity} onChange={onSetEnergy} />
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

      <WeekEnergy energy={energy} limits={limits} rebalance={rebalance} onMoveBlock={onMoveBlock} />

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
