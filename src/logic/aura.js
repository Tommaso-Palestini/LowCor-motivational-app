import { calculateProgress } from "./progress";
import { setBlockDone } from "./blocks";

export const AURA = {
  block: 25,
  goal: 100,
  focusMinute: 10,
  review: 50,
};

const COMBOS = {
  2: "Doppietta",
  3: "Tripletta",
  4: "Poker",
  5: "Manita",
};

// Calcola cosa cambia quando segni un blocco come fatto o non fatto:
// i nuovi blocchi, quanta aura guadagni o perdi e quali annunci mostrare.
export function resolveBlockDone({ blocks, activities, blockId, done, today, now }) {
  const block = blocks.find((item) => item.id === blockId);
  const nextBlocks = setBlockDone(blocks, blockId, done);
  const announcements = [];

  if (!block || block.done === done) {
    return { nextBlocks: blocks, auraDelta: 0, announcements };
  }

  const activity = activities.find((item) => item.id === block.activityId);
  let auraDelta = done ? AURA.block : -AURA.block;

  if (activity) {
    const before = calculateProgress(activity, blocks, now);
    const after = calculateProgress(activity, nextBlocks, now);
    if (!before.completed && after.completed) {
      auraDelta += AURA.goal;
      announcements.push({
        title: "Obiettivo centrato",
        sub: `${activity.name}, ${after.done} su ${after.target}`,
        aura: AURA.goal + AURA.block,
        tone: "done",
      });
    }
    if (before.completed && !after.completed) {
      auraDelta -= AURA.goal;
    }
  }

  if (done && block.date === today) {
    const todayBlocks = nextBlocks.filter((item) => item.date === today);
    const doneToday = todayBlocks.filter((item) => item.done).length;
    if (doneToday === todayBlocks.length && todayBlocks.length >= 3) {
      announcements.push({
        title: "Giornata perfetta",
        sub: `${doneToday} blocchi su ${todayBlocks.length}`,
        tone: "focus",
      });
    } else if (doneToday >= 6) {
      announcements.push({ title: "Inarrestabile", sub: `${doneToday} blocchi chiusi oggi`, tone: "focus" });
    } else if (COMBOS[doneToday]) {
      announcements.push({ title: COMBOS[doneToday], sub: `${doneToday} blocchi chiusi oggi`, tone: "planned" });
    }
  }

  if (done && announcements.length === 0) {
    announcements.push({
      title: "Blocco chiuso",
      sub: activity ? activity.name : "",
      aura: AURA.block,
      size: "small",
      tone: "done",
    });
  }

  return { nextBlocks, auraDelta, announcements };
}
