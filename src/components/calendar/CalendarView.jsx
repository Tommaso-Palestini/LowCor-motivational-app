import { useEffect, useState } from "react";
import WeekGrid from "./WeekGrid";
import MonthGrid from "./MonthGrid";
import WeekGoals from "./WeekGoals";
import BlockEditor from "./BlockEditor";
import ExternalCalendars from "./ExternalCalendars";
import SharedSchedule from "../account/SharedSchedule";
import {
  addDays,
  formatDate,
  monthDates,
  parseDate,
  toDateString,
  weekDates,
} from "../../logic/dates";
import { minutesOfDay, minutesToTime } from "../../logic/time";
import { energyLimits, suggestRebalance, weekEnergy } from "../../logic/energy";
import { IconCalendarPlus, IconChevronLeft, IconChevronRight, IconPlus } from "../Icons";
import "./Calendar.css";

function formatWeekTitle(dates) {
  const first = parseDate(dates[0]);
  const last = parseDate(dates[6]);
  const sameMonth = first.getMonth() === last.getMonth();
  const startLabel = formatDate(dates[0], sameMonth ? { day: "numeric" } : { day: "numeric", month: "long" });
  const endLabel = formatDate(dates[6], { day: "numeric", month: "long", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

function isTypingTarget(target) {
  return ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
}

function CalendarView({ data, now, actions, shared = false }) {
  const today = toDateString(now);
  const [mode, setMode] = useState("week");
  const [anchor, setAnchor] = useState(today);
  const [editor, setEditor] = useState(null);
  const [isLinking, setIsLinking] = useState(false);

  const dates = mode === "week" ? weekDates(anchor) : monthDates(anchor);
  const weekStart = weekDates(anchor)[0];
  const canPlan = weekDates(anchor)[6] >= today;
  const limits = energyLimits(data.settings);
  const energy = mode === "week" ? weekEnergy(dates, data.blocks, data.activities, limits) : [];
  const rebalance =
    mode === "week" ? suggestRebalance(dates, data.blocks, data.activities, limits, today) : [];

  function move(direction) {
    if (mode === "week") {
      setAnchor((current) => addDays(current, direction * 7));
    } else {
      setAnchor((current) => {
        const date = parseDate(current);
        return toDateString(new Date(date.getFullYear(), date.getMonth() + direction, 1));
      });
    }
  }

  function openNewBlock(draft) {
    setEditor({ mode: "new", draft });
  }

  function openNextFreeHour() {
    const nextHour = Math.min(Math.ceil((minutesOfDay(new Date()) + 1) / 60) * 60, 22 * 60);
    openNewBlock({ date: today, start: minutesToTime(nextHour), end: minutesToTime(nextHour + 60) });
  }

  useEffect(() => {
    function handleKey(event) {
      if (editor || isLinking || event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) {
        return;
      }
      if (document.querySelector('[aria-modal="true"]')) {
        return;
      }
      if (event.key === "ArrowLeft") {
        move(-1);
      } else if (event.key === "ArrowRight") {
        move(1);
      } else if (event.key.toLowerCase() === "t") {
        setAnchor(toDateString(new Date()));
      } else if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNextFreeHour();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  });

  const editingBlockExists =
    editor && (editor.mode === "new" || data.blocks.some((block) => block.id === editor.blockId));

  return (
    <div className="calendar">
      <header className="calendar-head">
        <div className="calendar-title-group">
          <h1 className="calendar-title">
            {mode === "week"
              ? formatWeekTitle(dates)
              : formatDate(anchor, { month: "long", year: "numeric" })}
          </h1>
          <div className="calendar-nav">
            <button type="button" className="icon-button" onClick={() => move(-1)} aria-label="Precedente">
              <IconChevronLeft />
            </button>
            <button type="button" className="button button--quiet" onClick={() => setAnchor(today)}>
              Oggi
            </button>
            <button type="button" className="icon-button" onClick={() => move(1)} aria-label="Successivo">
              <IconChevronRight />
            </button>
          </div>
        </div>

        <div className="calendar-tools">
          <div className="segmented" role="group" aria-label="Vista">
            <button type="button" aria-pressed={mode === "week"} onClick={() => setMode("week")}>
              Settimana
            </button>
            <button type="button" aria-pressed={mode === "month"} onClick={() => setMode("month")}>
              Mese
            </button>
          </div>
          <button type="button" className="button button--ghost" onClick={() => setIsLinking(true)}>
            <IconCalendarPlus />
            Calendari esterni
            {(data.calendars || []).length > 0 && <span className="ext-count">{data.calendars.length}</span>}
          </button>
          <button type="button" className="button button--primary" onClick={openNextFreeHour}>
            <IconPlus />
            Nuovo blocco
          </button>
        </div>
      </header>

      {mode === "week" ? (
        <div className="calendar-week-layout">
          <WeekGrid
            dates={dates}
            blocks={data.blocks}
            activities={data.activities}
            external={(data.calendars || []).flatMap((calendar) => calendar.events)}
            energy={energy}
            limits={limits}
            now={now}
            onCreateDraft={openNewBlock}
            onOpenBlock={(blockId) => setEditor({ mode: "edit", blockId })}
            onMoveBlock={actions.moveBlock}
          />
          <WeekGoals
            activities={data.activities}
            blocks={data.blocks}
            weekStart={weekStart}
            now={now}
            canPlan={canPlan}
            energy={energy}
            limits={limits}
            rebalance={rebalance}
            onMoveBlock={actions.moveBlock}
            onSetEnergy={actions.setActivityEnergy}
            onPlan={() => actions.planWeek(weekStart)}
            onCopy={() => actions.copyWeek(weekStart)}
          />
        </div>
      ) : (
        <MonthGrid
          dates={dates}
          anchor={anchor}
          blocks={data.blocks}
          activities={data.activities}
          now={now}
          onPickDay={(date) => {
            setAnchor(date);
            setMode("week");
          }}
        />
      )}

      {shared && mode === "week" && <SharedSchedule key={dates[0]} from={dates[0]} to={dates[6]} />}

      <p className="calendar-hint">
        Trascina su uno spazio vuoto per creare un blocco, trascina un blocco per spostarlo e il suo bordo basso per
        allungarlo.
      </p>

      {isLinking && (
        <ExternalCalendars calendars={data.calendars || []} actions={actions.calendars} onClose={() => setIsLinking(false)} />
      )}

      {editingBlockExists && (
        <BlockEditor
          key={editor.mode === "edit" ? editor.blockId : `${editor.draft.date}-${editor.draft.start}`}
          editor={editor}
          blocks={data.blocks}
          activities={data.activities}
          now={now}
          onClose={() => setEditor(null)}
          onCreate={(drafts) => {
            actions.createBlocks(drafts);
            setEditor(null);
          }}
          onSave={(blockId, changes) => {
            actions.updateBlock(blockId, changes);
            setEditor(null);
          }}
          onToggle={(blockId) => {
            actions.toggleBlock(blockId);
            setEditor(null);
          }}
          onDelete={(blockId) => {
            actions.deleteBlock(blockId);
            setEditor(null);
          }}
          onDeleteSeries={(seriesId) => {
            actions.deleteSeries(seriesId);
            setEditor(null);
          }}
          onFocus={(block) => {
            setEditor(null);
            actions.focusBlock(block);
          }}
        />
      )}
    </div>
  );
}

export default CalendarView;
