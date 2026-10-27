import { useEffect, useRef, useState } from "react";
import { useNow } from "../hooks/useNow";
import { toDateString } from "../logic/dates";
import { getBlocksForDate } from "../logic/blocks";
import { AURA } from "../logic/aura";
import { getFocusElapsedMs, MIN_SAVED_MINUTES } from "../logic/focus";
import {
  formatClock,
  getCurrentAndNext,
  minutesOfDay,
  timeToMinutes,
} from "../logic/time";
import { IconClose, IconMinimize, IconPause, IconPlay, IconTarget } from "./Icons";
import { vibrate } from "../logic/haptics";
import "./FocusMode.css";
import { t } from "../i18n";

const PRESETS = [25, 50, 90];
const RING_RADIUS = 140;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

// Settore del "time timer": il disco colorato è il tempo che resta e si restringe in senso orario.
function remainingWedge(fraction, radius) {
  if (fraction >= 0.9999) {
    return `M 160 ${160 - radius} A ${radius} ${radius} 0 1 1 159.99 ${160 - radius} Z`;
  }
  if (fraction <= 0) {
    return "";
  }
  const startAngle = -90 + (1 - fraction) * 360;
  const toPoint = (deg) => {
    const rad = (deg * Math.PI) / 180;
    return `${(160 + radius * Math.cos(rad)).toFixed(2)} ${(160 + radius * Math.sin(rad)).toFixed(2)}`;
  };
  const large = fraction > 0.5 ? 1 : 0;
  return `M 160 160 L ${toPoint(startAngle)} A ${radius} ${radius} 0 ${large} 1 ${toPoint(270)} Z`;
}

// Una tacca ogni 5 minuti (ogni 15 per sessioni lunghe): il tempo si legge come su un quadrante.
function minuteTicks(totalMinutes) {
  const step = totalMinutes > 60 ? 15 : 5;
  const count = Math.floor(totalMinutes / step);
  return Array.from({ length: count }, (_, index) => {
    const deg = -90 + ((index * step) / totalMinutes) * 360;
    const rad = (deg * Math.PI) / 180;
    const major = (index * step) % 15 === 0;
    const inner = major ? 104 : 110;
    return {
      key: index,
      major,
      x1: 160 + inner * Math.cos(rad),
      y1: 160 + inner * Math.sin(rad),
      x2: 160 + 118 * Math.cos(rad),
      y2: 160 + 118 * Math.sin(rad),
    };
  });
}

function getStage(progress) {
  if (progress < 0.34) {
    return t("L'aura si accende");
  }
  if (progress < 0.67) {
    return t("Aura in carica");
  }
  return t("Aura al massimo");
}

function FocusSetup({ activities, blocks, now, onStart, onClose }) {
  const today = toDateString(now);
  const openBlocks = getBlocksForDate(blocks, today).filter((block) => !block.done);
  const { current } = getCurrentAndNext(openBlocks, minutesOfDay(now));
  const available = activities.filter((activity) => activity.status !== "parked");
  const focusActivity = available.find((activity) => activity.status === "focus");
  const fallbackId = focusActivity ? focusActivity.id : available[0] ? available[0].id : "";
  const untilEnd = current ? timeToMinutes(current.end) - minutesOfDay(now) : null;

  const [activityId, setActivityId] = useState(current ? current.activityId : fallbackId);
  const [minutes, setMinutes] = useState(untilEnd && untilEnd >= 5 ? untilEnd : 25);

  const options = [...PRESETS];
  if (untilEnd && untilEnd >= 5 && !options.includes(untilEnd)) {
    options.unshift(untilEnd);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (activityId === "") {
      return;
    }
    const linkedBlockId = current && current.activityId === activityId ? current.id : null;
    onStart({ activityId, blockId: linkedBlockId, minutes });
  }

  return (
    <form className="focus-setup" onSubmit={handleSubmit}>
      <button type="button" className="icon-button focus-corner" onClick={onClose} aria-label={t("Chiudi")}>
        <IconClose />
      </button>

      <h2 className="focus-heading">{t("Entra in focus")}</h2>
      <p className="focus-lead">
        {t("Il resto sparisce. Alla fine la sessione diventa un blocco fatto e ti fa guadagnare aura.")}
      </p>

      {available.length === 0 ? (
        <p className="focus-lead">{t("Riprendi o crea un'attività per iniziare una sessione.")}</p>
      ) : (
        <>
          <label className="focus-field">
            <span>{t("Su cosa")}</span>
            <select
              className="field"
              value={activityId}
              onChange={(event) => setActivityId(event.target.value)}
            >
              {available.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="focus-field">
            <legend>{t("Per quanto")}</legend>
            <div className="focus-presets">
              {options.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="focus-preset"
                  aria-pressed={minutes === value}
                  onClick={() => setMinutes(value)}
                >
                  {value === untilEnd ? t("Fino alle {time}", { time: current.end }) : `${value} min`}
                </button>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="button button--primary focus-start">
            <IconPlay />
            {t("Inizia {n} minuti", { n: minutes })}
          </button>
        </>
      )}
    </form>
  );
}

function FocusRunning({ focus, activityName, nowMs, onPause, onResume, onFinish, onCancel, onMinimize }) {
  const elapsedMs = getFocusElapsedMs(focus, nowMs);
  const remainingMs = Math.max(focus.durationMs - elapsedMs, 0);
  const progress = Math.min(elapsedMs / focus.durationMs, 1);
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  const isPaused = Boolean(focus.pausedAt);
  const totalMinutes = Math.round(focus.durationMs / 60000);
  const milestoneRef = useRef({ startedAt: focus.startedAt, halfway: progress >= 0.5, lastMinute: remainingMs <= 60000 });

  // Vibrazione a metà e all'ultimo minuto, una volta sola per sessione
  useEffect(() => {
    const seen = milestoneRef.current;
    if (seen.startedAt !== focus.startedAt) {
      milestoneRef.current = { startedAt: focus.startedAt, halfway: false, lastMinute: false };
      return;
    }
    if (isPaused) {
      return;
    }
    if (!seen.halfway && progress >= 0.5) {
      seen.halfway = true;
      vibrate("halfway");
    }
    if (!seen.lastMinute && remainingMs <= 60000 && remainingMs > 0 && totalMinutes > 2) {
      seen.lastMinute = true;
      vibrate("lastMinute");
    }
  }, [focus.startedAt, progress, remainingMs, isPaused, totalMinutes]);

  const phase = remainingMs <= 60000 ? "last" : progress >= 0.5 ? "second" : "first";

  return (
    <div className="focus-running" style={{ "--progress": progress }}>
      <button type="button" className="icon-button focus-corner" onClick={onMinimize} aria-label={t("Riduci a icona")}>
        <IconMinimize />
      </button>

      <div className={`focus-stage ${isPaused ? "focus-stage--paused" : ""}`}>
        <span className="aura aura--outer" aria-hidden="true" />
        <span className="aura aura--middle" aria-hidden="true" />
        <span className="aura aura--inner" aria-hidden="true" />

        <svg className={`focus-ring focus-ring--${phase}`} viewBox="0 0 320 320" aria-hidden="true">
          <circle className="focus-timer-face" cx="160" cy="160" r="118" />
          <path className="focus-timer-wedge" d={remainingWedge(1 - progress, 118)} />
          {minuteTicks(totalMinutes).map((tick) => (
            <line
              key={tick.key}
              className={`focus-timer-tick ${tick.major ? "focus-timer-tick--major" : ""}`}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
            />
          ))}
          <circle className="focus-ring-track" cx="160" cy="160" r={RING_RADIUS} />
          <circle
            className="focus-ring-fill"
            cx="160"
            cy="160"
            r={RING_RADIUS}
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
            transform="rotate(-90 160 160)"
          />
        </svg>

        <div className="focus-center">
          <p className="focus-activity">{activityName}</p>
          <p className="focus-clock" role="timer" aria-label={t("Tempo rimanente")}>
            {formatClock(remainingMs / 1000)}
          </p>
          <p className="focus-aura-earned">
            {isPaused ? t("In pausa") : `${getStage(progress)}, +${elapsedMinutes * AURA.focusMinute}`}
          </p>
        </div>
      </div>

      <div className="focus-controls">
        {isPaused ? (
          <button type="button" className="button button--primary" onClick={onResume}>
            <IconPlay />
            {t("Riprendi")}
          </button>
        ) : (
          <button type="button" className="button button--ghost" onClick={onPause}>
            <IconPause />
            {t("Pausa")}
          </button>
        )}
        <button type="button" className="button button--ghost" onClick={() => onFinish(false)}>
          {t("Termina e salva")}
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>
          {t("Annulla sessione")}
        </button>
      </div>
      {elapsedMinutes < MIN_SAVED_MINUTES && (
        <p className="focus-note">{t("Sotto i {n} minuti la sessione non viene salvata.", { n: MIN_SAVED_MINUTES })}</p>
      )}
    </div>
  );
}

function FocusMode({
  focus,
  isOpen,
  activities,
  blocks,
  onStart,
  onPause,
  onResume,
  onFinish,
  onCancel,
  onOpen,
  onClose,
}) {
  const now = useNow(focus ? 500 : 30000);
  const nowMs = now.getTime();
  const finishedRef = useRef(null);
  const overlayRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const activity = focus ? activities.find((item) => item.id === focus.activityId) : null;
  const activityName = activity ? activity.name : "Focus";
  const remainingMs = focus ? focus.durationMs - getFocusElapsedMs(focus, nowMs) : null;

  // Quando il tempo finisce chiude la sessione da sola, anche se è ridotta a icona.
  useEffect(() => {
    if (focus && !focus.pausedAt && remainingMs <= 0 && finishedRef.current !== focus.startedAt) {
      finishedRef.current = focus.startedAt;
      vibrate("done");
      onFinish(true);
    }
  }, [focus, remainingMs, onFinish]);

  useEffect(() => {
    document.title = focus ? `${formatClock(remainingMs / 1000)} – ${activityName}` : "LowCor";
  }, [focus, remainingMs, activityName]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    document.body.style.overflow = "hidden";
    const firstControl = overlayRef.current && overlayRef.current.querySelector("select, button");
    if (firstControl) {
      firstControl.focus();
    }
    function handleKey(event) {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  if (!isOpen) {
    if (!focus) {
      return null;
    }
    const progress = Math.min(getFocusElapsedMs(focus, nowMs) / focus.durationMs, 1);
    return (
      <button
        type="button"
        className="focus-pill"
        onClick={onOpen}
        style={{ "--progress": progress }}
        aria-label={t("Torna al focus su {name}", { name: activityName })}
      >
        <IconTarget />
        <span className="focus-pill-time">{formatClock(remainingMs / 1000)}</span>
        <span className="focus-pill-name">{activityName}</span>
      </button>
    );
  }

  return (
    <div ref={overlayRef} className="focus-overlay" role="dialog" aria-modal="true" aria-label={t("Focus")}>
      {focus ? (
        <FocusRunning
          focus={focus}
          activityName={activityName}
          nowMs={nowMs}
          onPause={onPause}
          onResume={onResume}
          onFinish={onFinish}
          onCancel={onCancel}
          onMinimize={onClose}
        />
      ) : (
        <FocusSetup
          activities={activities}
          blocks={blocks}
          now={now}
          onStart={onStart}
          onClose={onClose}
        />
      )}
    </div>
  );
}

export default FocusMode;
