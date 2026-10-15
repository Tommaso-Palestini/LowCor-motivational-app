import { formatDate, parseDate, toDateString } from "../../logic/dates";
import { getBlockTone } from "../../logic/tone";
import { blockDuration } from "../../logic/time";

const WEEKDAYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const VISIBLE_PER_DAY = 3;
const FULL_DAY_MINUTES = 240;

function MonthGrid({ dates, anchor, blocks, activities, now, onPickDay }) {
  const today = toDateString(now);
  const month = parseDate(anchor).getMonth();
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));

  return (
    <div className="month">
      <div className="month-head" aria-hidden="true">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>
      <div className="month-grid">
        {dates.map((date) => {
          const dayBlocks = blocks
            .filter((block) => block.date === date)
            .sort((a, b) => a.start.localeCompare(b.start));
          const doneMinutes = dayBlocks
            .filter((block) => block.done)
            .reduce((sum, block) => sum + blockDuration(block), 0);
          const heat = Math.min(doneMinutes / FULL_DAY_MINUTES, 1);
          const isOtherMonth = parseDate(date).getMonth() !== month;
          const classes = [
            "month-day",
            date === today ? "month-day--today" : "",
            isOtherMonth ? "month-day--other" : "",
          ].join(" ");

          return (
            <button
              key={date}
              type="button"
              className={classes}
              style={{ "--heat": heat }}
              onClick={() => onPickDay(date)}
              aria-label={`${formatDate(date, { weekday: "long", day: "numeric", month: "long" })}, ${dayBlocks.length} blocchi`}
            >
              <span className="month-day-number">{formatDate(date, { day: "numeric" })}</span>
              <span className="month-day-blocks">
                {dayBlocks.slice(0, VISIBLE_PER_DAY).map((block) => {
                  const activity = activitiesById.get(block.activityId);
                  const tone = getBlockTone(block, activity, now);
                  return (
                    <span key={block.id} className={`month-chip month-chip--${tone}`}>
                      {activity ? activity.name : "Attività"}
                    </span>
                  );
                })}
                {dayBlocks.length > VISIBLE_PER_DAY && (
                  <span className="month-more">+{dayBlocks.length - VISIBLE_PER_DAY}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MonthGrid;
