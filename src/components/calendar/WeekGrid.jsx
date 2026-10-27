import { useEffect, useRef, useState } from "react";
import { formatDate, toDateString } from "../../logic/dates";
import { layoutDay } from "../../logic/calendar";
import { getBlockTone } from "../../logic/tone";
import {
  MINUTES_IN_DAY,
  minutesOfDay,
  minutesToTime,
  timeToMinutes,
} from "../../logic/time";
import { IconBatteryLow, IconCheck, IconRepeat } from "../Icons";

const HOUR_HEIGHT = 52;
const SNAP = 15;
const DRAG_THRESHOLD = 4;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function snap(minutes) {
  return Math.round(minutes / SNAP) * SNAP;
}

function minutesToPixels(minutes) {
  return (minutes / 60) * HOUR_HEIGHT;
}

function overloadReason(day, limits) {
  const parts = [`${day.load} punti di energia (soglia ${limits.maxLoad})`, `${day.high} blocchi intensi (max ${limits.maxHigh})`];
  return `Rischio overload: ${parts.join(", ")}. Sposta qualche blocco in un giorno più leggero.`;
}

function WeekGrid({ dates, blocks, activities, energy, limits, now, onCreateDraft, onOpenBlock, onMoveBlock }) {
  const scrollRef = useRef(null);
  const columnsRef = useRef(null);
  const dragRef = useRef(null);
  const [drag, setDrag] = useState(null);

  const today = toDateString(now);
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));

  // All'apertura scorre fino a un'ora prima di adesso, così non parti dalla mezzanotte.
  useEffect(() => {
    const startHour = Math.max(minutesOfDay(new Date()) / 60 - 1.5, 6);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = startHour * HOUR_HEIGHT;
    }
  }, []);

  function pointerPosition(event) {
    const rect = columnsRef.current.getBoundingClientRect();
    const day = clamp(Math.floor((event.clientX - rect.left) / (rect.width / 7)), 0, 6);
    const minute = clamp(((event.clientY - rect.top) / HOUR_HEIGHT) * 60, 0, MINUTES_IN_DAY);
    return { day, minute };
  }

  function handlePointerDown(event) {
    if (event.button !== 0) {
      return;
    }
    const { day, minute } = pointerPosition(event);
    const blockElement = event.target.closest("[data-block-id]");
    const base = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      isTouch: event.pointerType === "touch",
    };

    if (blockElement) {
      const block = blocks.find((item) => item.id === blockElement.dataset.blockId);
      if (!block) {
        return;
      }
      const start = timeToMinutes(block.start);
      dragRef.current = {
        ...base,
        type: event.target.closest("[data-resize]") ? "resize" : "move",
        block,
        offset: minute - start,
        preview: { date: block.date, start, end: timeToMinutes(block.end) },
      };
    } else {
      const anchor = Math.floor(minute / SNAP) * SNAP;
      dragRef.current = {
        ...base,
        type: "create",
        anchor,
        preview: { date: dates[day], start: anchor, end: Math.min(anchor + 60, MINUTES_IN_DAY) },
      };
    }

    // Col dito lasciamo scorrere la pagina: niente trascinamento, solo tocco.
    if (!base.isTouch) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function handlePointerMove(event) {
    const current = dragRef.current;
    if (!current || current.pointerId !== event.pointerId || current.isTouch) {
      return;
    }
    const distance = Math.hypot(event.clientX - current.startX, event.clientY - current.startY);
    if (!current.moved && distance < DRAG_THRESHOLD) {
      return;
    }

    const { day, minute } = pointerPosition(event);
    let preview;

    if (current.type === "move") {
      const duration = timeToMinutes(current.block.end) - timeToMinutes(current.block.start);
      const start = clamp(snap(minute - current.offset), 0, MINUTES_IN_DAY - duration);
      preview = { date: dates[day], start, end: start + duration };
    } else if (current.type === "resize") {
      const start = timeToMinutes(current.block.start);
      preview = {
        date: current.block.date,
        start,
        end: clamp(snap(minute), start + SNAP, MINUTES_IN_DAY),
      };
    } else {
      const point = snap(minute);
      const start = Math.min(current.anchor, point);
      const end = Math.max(current.anchor, point);
      preview = {
        date: current.preview.date,
        start,
        end: Math.max(end, start + SNAP),
      };
    }

    dragRef.current = { ...current, moved: true, preview };
    setDrag(dragRef.current);
  }

  function finishDrag(event, cancelled) {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (cancelled || !current || current.pointerId !== event.pointerId) {
      return;
    }

    const { date, start, end } = current.preview;

    if (!current.moved) {
      if (current.type === "create") {
        onCreateDraft({ date, start: minutesToTime(start), end: minutesToTime(end) });
      } else {
        onOpenBlock(current.block.id);
      }
      return;
    }

    if (current.type === "create") {
      onCreateDraft({ date, start: minutesToTime(start), end: minutesToTime(end) });
    } else {
      onMoveBlock(current.block.id, { date, start: minutesToTime(start), end: minutesToTime(end) });
    }
  }

  const renderedBlocks = blocks.map((block) => {
    if (drag && drag.block && drag.block.id === block.id) {
      return {
        ...block,
        date: drag.preview.date,
        start: minutesToTime(drag.preview.start),
        end: minutesToTime(drag.preview.end),
        isDragging: true,
      };
    }
    return block;
  });

  return (
    <div className="week" ref={scrollRef}>
      <div className="week-head">
        <span className="week-corner" aria-hidden="true" />
        {dates.map((date, index) => {
          const dayBlocks = blocks.filter((block) => block.date === date);
          const doneCount = dayBlocks.filter((block) => block.done).length;
          const day = energy[index];
          return (
            <div
              key={date}
              className={`week-day ${date === today ? "week-day--today" : ""} ${day.overloaded ? "week-day--overload" : ""}`}
            >
              <span className="week-day-name">{formatDate(date, { weekday: "short" })}</span>
              <span className="week-day-number">{formatDate(date, { day: "numeric" })}</span>
              {dayBlocks.length > 0 && (
                <span className="week-day-count">
                  {doneCount}/{dayBlocks.length}
                </span>
              )}
              {day.overloaded && (
                <span className="energy-badge" role="img" aria-label={overloadReason(day, limits)} title={overloadReason(day, limits)}>
                  <IconBatteryLow />
                  <span className="energy-badge-text">Overload</span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="week-body" style={{ height: HOUR_HEIGHT * 24 }}>
        <div className="week-gutter" aria-hidden="true">
          {HOURS.map((hour) => (
            <span key={hour} className="week-hour" style={{ top: hour * HOUR_HEIGHT }}>
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        <div
          ref={columnsRef}
          className={`week-columns ${drag ? "week-columns--dragging" : ""}`}
          style={{ "--hour": `${HOUR_HEIGHT}px` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishDrag(event, false)}
          onPointerCancel={(event) => finishDrag(event, true)}
        >
          {dates.map((date) => {
            const dayBlocks = renderedBlocks.filter((block) => block.date === date);
            const isToday = date === today;
            return (
              <div
                key={date}
                className={`week-column ${isToday ? "week-column--today" : ""}`}
              >
                {layoutDay(dayBlocks).map(({ block, column, columns }) => {
                  const activity = activitiesById.get(block.activityId);
                  const start = timeToMinutes(block.start);
                  const duration = timeToMinutes(block.end) - start;
                  const height = Math.max(minutesToPixels(duration) - 3, 20);
                  const tone = getBlockTone(block, activity, now);
                  const name = activity ? activity.name : "Attività eliminata";
                  const classes = [
                    "cal-block",
                    `cal-block--${tone}`,
                    block.isDragging ? "cal-block--dragging" : "",
                    height < 42 ? "cal-block--compact" : "",
                  ].join(" ");
                  return (
                    <button
                      key={block.id}
                      type="button"
                      data-block-id={block.id}
                      className={classes}
                      style={{
                        top: minutesToPixels(start) + 1,
                        height,
                        left: `calc(${(column / columns) * 100}% + 2px)`,
                        width: `calc(${100 / columns}% - 4px)`,
                      }}
                      onClick={(event) => {
                        if (event.detail === 0) {
                          onOpenBlock(block.id);
                        }
                      }}
                      aria-label={`${name}, ${block.start}–${block.end}${block.done ? ", fatto" : ""}`}
                    >
                      <span className="cal-block-name">
                        {block.done && <IconCheck />}
                        {name}
                        {block.seriesId && (
                          <span className="cal-block-repeat">
                            <IconRepeat />
                          </span>
                        )}
                      </span>
                      <span className="cal-block-time">
                        {block.start} – {block.end}
                      </span>
                      <span className="cal-block-resize" data-resize="true" aria-hidden="true" />
                    </button>
                  );
                })}

                {drag && drag.type === "create" && drag.moved && drag.preview.date === date && (
                  <div
                    className="cal-ghost"
                    style={{
                      top: minutesToPixels(drag.preview.start),
                      height: minutesToPixels(drag.preview.end - drag.preview.start),
                    }}
                  >
                    {minutesToTime(drag.preview.start)} – {minutesToTime(drag.preview.end)}
                  </div>
                )}

                {isToday && (
                  <div
                    className="week-now"
                    style={{ top: minutesToPixels(minutesOfDay(now)) }}
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default WeekGrid;
