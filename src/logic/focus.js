import { toDateString } from "./dates";
import { minutesOfDay, minutesToTime } from "./time";
import { AURA } from "./aura";
import { addBlock, setBlockDone } from "./blocks";

export const MIN_SAVED_MINUTES = 5;

export function createFocus({ activityId, blockId, minutes }) {
  return {
    activityId,
    blockId,
    startedAt: Date.now(),
    durationMs: minutes * 60 * 1000,
    pausedAt: null,
    pausedMs: 0,
  };
}

export function getFocusElapsedMs(focus, nowMs) {
  const end = focus.pausedAt ?? nowMs;
  return Math.max(end - focus.startedAt - focus.pausedMs, 0);
}

export function pauseFocus(focus) {
  return focus.pausedAt ? focus : { ...focus, pausedAt: Date.now() };
}

export function resumeFocus(focus) {
  if (!focus.pausedAt) {
    return focus;
  }
  return {
    ...focus,
    pausedMs: focus.pausedMs + (Date.now() - focus.pausedAt),
    pausedAt: null,
  };
}

// Trasforma la sessione finita in un blocco fatto, così conta per gli obiettivi.
export function settleFocus(focus, blocks, nowMs) {
  const elapsedMs = Math.min(getFocusElapsedMs(focus, nowMs), focus.durationMs);
  const minutes = Math.round(elapsedMs / 60000);

  if (minutes < MIN_SAVED_MINUTES) {
    return { saved: false, minutes, blocks, aura: 0 };
  }

  const linked = focus.blockId && blocks.find((block) => block.id === focus.blockId);
  const aura = minutes * AURA.focusMinute + AURA.block;

  if (linked) {
    return {
      saved: true,
      minutes,
      aura: linked.done ? minutes * AURA.focusMinute : aura,
      blocks: setBlockDone(blocks, linked.id, true),
    };
  }

  const startedAt = new Date(focus.startedAt);
  const start = minutesOfDay(startedAt);
  const end = Math.min(start + minutes, 24 * 60 - 1);
  return {
    saved: true,
    minutes,
    aura,
    blocks: addBlock(blocks, {
      date: toDateString(startedAt),
      start: minutesToTime(start),
      end: minutesToTime(end),
      activityId: focus.activityId,
      done: true,
    }),
  };
}
