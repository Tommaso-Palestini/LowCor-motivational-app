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
import "./FocusMode.css";

const PRESETS = [25, 50, 90];
const RING_RADIUS = 140;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function getStage(progress) {
  if (progress < 0.34) {
    return "L'aura si accende";
  }
  if (progress < 0.67) {
    return "Aura in carica";
  }
  return "Aura al massimo";
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
      <button type="button" className="icon-button focus-corner" onClick={onClose} aria-label="Chiudi">
        <IconClose />
      </button>

      <h2 className="focus-heading">Entra in focus</h2>
      <p className="focus-lead">
        Il resto sparisce. Alla fine la sessione diventa un blocco fatto e ti fa guadagnare aura.
      </p>

      {available.length === 0 ? (
        <p className="focus-lead">Riprendi o crea un'attività per iniziare una sessione.</p>
      ) : (
        <>
          <label className="focus-field">
            <span>Su cosa</span>
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
            <legend>Per quanto</legend>
            <div className="focus-presets">
              {options.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="focus-preset"
                  aria-pressed={minutes === value}
                  onClick={() => setMinutes(value)}
                >
                  {value === untilEnd ? `Fino alle ${current.end}` : `${value} min`}
                </button>
              ))}
            </div>
          </fieldset>

          <button type="submit" className="button button--primary focus-start">
            <IconPlay />
            Inizia {minutes} minuti
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

  return (
    <div className="focus-running" style={{ "--progress": progress }}>
      <button type="button" className="icon-button focus-corner" onClick={onMinimize} aria-label="Riduci a icona">
        <IconMinimize />
      </button>

      <div className={`focus-stage ${isPaused ? "focus-stage--paused" : ""}`}>
        <span className="aura aura--outer" aria-hidden="true" />
        <span className="aura aura--middle" aria-hidden="true" />
        <span className="aura aura--inner" aria-hidden="true" />

        <svg className="focus-ring" viewBox="0 0 320 320" aria-hidden="true">
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
          <p className="focus-clock" role="timer" aria-label="Tempo rimanente">
            {formatClock(remainingMs / 1000)}
          </p>
          <p className="focus-aura-earned">
            {isPaused ? "In pausa" : `${getStage(progress)}, +${elapsedMinutes * AURA.focusMinute}`}
          </p>
        </div>
      </div>

      <div className="focus-controls">
        {isPaused ? (
          <button type="button" className="button button--primary" onClick={onResume}>
            <IconPlay />
            Riprendi
          </button>
        ) : (
          <button type="button" className="button button--ghost" onClick={onPause}>
            <IconPause />
            Pausa
          </button>
        )}
        <button type="button" className="button button--ghost" onClick={() => onFinish(false)}>
          Termina e salva
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>
          Annulla sessione
        </button>
      </div>
      {elapsedMinutes < MIN_SAVED_MINUTES && (
        <p className="focus-note">Sotto i {MIN_SAVED_MINUTES} minuti la sessione non viene salvata.</p>
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
        aria-label={`Torna al focus su ${activityName}`}
      >
        <IconTarget />
        <span className="focus-pill-time">{formatClock(remainingMs / 1000)}</span>
        <span className="focus-pill-name">{activityName}</span>
      </button>
    );
  }

  return (
    <div ref={overlayRef} className="focus-overlay" role="dialog" aria-modal="true" aria-label="Focus">
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
