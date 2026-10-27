import { energyLimits } from "../logic/energy";
import { formatDate, toDateString } from "../logic/dates";
import { blockDuration } from "../logic/time";
import { MINIMUM_MINUTES, missedBlocks, suggestSlot } from "../logic/rescue";
import { isBlockPast } from "../logic/tone";
import { externalBusy } from "../logic/icsImport";
import { IconCheck, IconRepeat } from "./Icons";
import "./FlexPlan.css";

function dayLabel(date, today) {
  const diff = Math.round((new Date(`${date}T12:00`) - new Date(`${today}T12:00`)) / 86400000);
  if (diff === 0) {
    return "oggi";
  }
  if (diff === -1) {
    return "ieri";
  }
  if (diff === 1) {
    return "domani";
  }
  return formatDate(date, { weekday: "long", day: "numeric" });
}

// Piano flessibile: recupera i blocchi saltati e, nei giorni storti, riduci tutto al minimo.
function FlexPlan({ data, now, actions }) {
  const today = toDateString(now);
  const limits = energyLimits(data.settings);
  const activitiesById = new Map(data.activities.map((activity) => [activity.id, activity]));
  const isLowDay = (data.lowDays || []).includes(today);
  const missed = missedBlocks(data.blocks, now)
    .slice(0, 4)
    .map((block) => ({
      block,
      slot: suggestSlot(block, data.blocks, data.activities, now, limits, externalBusy(data.calendars)),
    }));
  const fixedToday = data.blocks.filter((block) => {
    const activity = activitiesById.get(block.activityId);
    return (
      block.date === today &&
      !block.done &&
      !isBlockPast(block, now) &&
      activity &&
      activity.type === "fixed" &&
      blockDuration(block) > MINIMUM_MINUTES
    );
  });

  if (!isLowDay && missed.length === 0) {
    return (
      <div className="flex-quiet">
        <p>Oggi non è giornata?</p>
        <button type="button" className="button button--quiet" onClick={() => actions.setLowDay(today, true)}>
          Attiva la giornata no
        </button>
      </div>
    );
  }

  return (
    <section className={`panel flex ${isLowDay ? "flex--low" : ""}`} aria-label="Piano flessibile">
      {isLowDay ? (
        <div className="flex-low">
          <h2 className="flex-title">Giornata no</h2>
          <p className="flex-text">
            Oggi conta solo il minimo. Le passioni sono in pausa e non risultano saltate; le non negoziabili restano, anche
            in versione corta.
          </p>
          {fixedToday.length > 0 && (
            <ul className="flex-list">
              {fixedToday.map((block) => (
                <li key={block.id} className="flex-item">
                  <span>
                    <strong>{activitiesById.get(block.activityId).name}</strong> alle {block.start}
                  </span>
                  <button type="button" className="button button--ghost" onClick={() => actions.shortenBlock(block.id)}>
                    Fanne {MINIMUM_MINUTES} minuti
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="button button--quiet flex-off" onClick={() => actions.setLowDay(today, false)}>
            Torna alla giornata normale
          </button>
        </div>
      ) : (
        <div className="flex-quiet flex-quiet--inline">
          <p>Oggi non è giornata?</p>
          <button type="button" className="button button--quiet" onClick={() => actions.setLowDay(today, true)}>
            Attiva la giornata no
          </button>
        </div>
      )}

      {missed.length > 0 && (
        <div className="flex-rescue">
          <h2 className="flex-title">Si riparte</h2>
          <p className="flex-text">Un blocco saltato non è un fallimento: scegli se rimetterlo in agenda o lasciarlo andare.</p>
          <ul className="flex-list">
            {missed.map(({ block, slot }) => {
              const activity = activitiesById.get(block.activityId);
              return (
                <li key={block.id} className="flex-item">
                  <span className="flex-item-text">
                    <span>
                      <strong>{activity ? activity.name : "Blocco"}</strong>, {dayLabel(block.date, today)} alle {block.start}
                    </span>
                    {slot && (
                      <span className="flex-item-slot">
                        Posto libero: {dayLabel(slot.date, today)} alle {slot.start}
                      </span>
                    )}
                  </span>
                  <span className="flex-item-actions">
                    {slot && (
                      <button type="button" className="button button--ghost" onClick={() => actions.moveBlock(block.id, slot)}>
                        <IconRepeat />
                        Ripiazza
                      </button>
                    )}
                    <button type="button" className="button button--quiet" onClick={() => actions.releaseBlock(block.id)}>
                      <IconCheck />
                      Lascia andare
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export default FlexPlan;
