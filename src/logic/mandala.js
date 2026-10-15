// Lo schema 9×9 (metodo Harada, quello che Shohei Ohtani ha compilato al liceo):
// un obiettivo al centro, 8 pilastri intorno, 8 azioni concrete per ogni pilastro.

export const PILLAR_COUNT = 8;
export const ACTION_COUNT = 8;

export const AURA_MANDALA = {
  action: 15,
  pillar: 150,
  complete: 500,
};

// Posizione nella griglia 3×3 (da 0 a 8) di ogni pilastro o azione, in senso orario
// partendo da in alto a sinistra. Il 4 è il centro.
export const RING_POSITIONS = [0, 1, 2, 5, 8, 7, 6, 3];

export function createMandala() {
  return {
    goal: "",
    pillars: Array.from({ length: PILLAR_COUNT }, () => ({
      title: "",
      actions: Array.from({ length: ACTION_COUNT }, () => ({ text: "", done: false })),
    })),
  };
}

function updatePillar(mandala, pillarIndex, update) {
  return {
    ...mandala,
    pillars: mandala.pillars.map((pillar, index) => (index === pillarIndex ? update(pillar) : pillar)),
  };
}

function updateAction(mandala, pillarIndex, actionIndex, update) {
  return updatePillar(mandala, pillarIndex, (pillar) => ({
    ...pillar,
    actions: pillar.actions.map((action, index) => (index === actionIndex ? update(action) : action)),
  }));
}

export function setGoal(mandala, goal) {
  return { ...mandala, goal };
}

export function setPillarTitle(mandala, pillarIndex, title) {
  return updatePillar(mandala, pillarIndex, (pillar) => ({ ...pillar, title }));
}

export function setActionText(mandala, pillarIndex, actionIndex, text) {
  return updateAction(mandala, pillarIndex, actionIndex, (action) => ({
    ...action,
    text,
    done: text === "" ? false : action.done,
  }));
}

export function pillarProgress(pillar) {
  const written = pillar.actions.filter((action) => action.text !== "");
  return {
    done: written.filter((action) => action.done).length,
    written: written.length,
    completed: written.length === ACTION_COUNT && written.every((action) => action.done),
  };
}

export function mandalaProgress(mandala) {
  const perPillar = mandala.pillars.map(pillarProgress);
  return {
    perPillar,
    done: perPillar.reduce((sum, item) => sum + item.done, 0),
    written: perPillar.reduce((sum, item) => sum + item.written, 0),
    pillarsDone: perPillar.filter((item) => item.completed).length,
    completed: perPillar.every((item) => item.completed),
  };
}

// Spunta o toglie la spunta a un'azione e calcola aura e annunci, come per i blocchi.
export function resolveActionToggle(mandala, pillarIndex, actionIndex) {
  const action = mandala.pillars[pillarIndex].actions[actionIndex];
  if (action.text === "") {
    return { next: mandala, auraDelta: 0, announcements: [] };
  }

  const next = updateAction(mandala, pillarIndex, actionIndex, (item) => ({ ...item, done: !item.done }));
  const pillarBefore = pillarProgress(mandala.pillars[pillarIndex]);
  const pillarAfter = pillarProgress(next.pillars[pillarIndex]);
  const wholeBefore = mandalaProgress(mandala).completed;
  const wholeAfter = mandalaProgress(next).completed;
  const done = !action.done;
  const sign = done ? 1 : -1;
  const pillarName = mandala.pillars[pillarIndex].title || `Pilastro ${pillarIndex + 1}`;

  let auraDelta = sign * AURA_MANDALA.action;
  const announcements = [];

  if (pillarBefore.completed !== pillarAfter.completed) {
    auraDelta += sign * AURA_MANDALA.pillar;
  }
  if (wholeBefore !== wholeAfter) {
    auraDelta += sign * AURA_MANDALA.complete;
  }

  if (done && wholeAfter) {
    announcements.push({
      title: "Schema completo",
      sub: mandala.goal || "64 azioni su 64",
      aura: AURA_MANDALA.complete + AURA_MANDALA.pillar + AURA_MANDALA.action,
      tone: "focus",
    });
  } else if (done && pillarAfter.completed) {
    announcements.push({
      title: "Pilastro completato",
      sub: pillarName,
      aura: AURA_MANDALA.pillar + AURA_MANDALA.action,
      tone: "done",
    });
  } else if (done) {
    announcements.push({
      title: "Azione fatta",
      sub: `${pillarName}, ${pillarAfter.done} su ${ACTION_COUNT}`,
      aura: AURA_MANDALA.action,
      size: "small",
      tone: "done",
    });
  }

  return { next, auraDelta, announcements };
}

// Riempie solo le caselle vuote: quello che hai scritto tu non viene mai toccato.
export function fillPillarTitles(mandala, titles) {
  const queue = titles.map((title) => title.trim()).filter(Boolean);
  return {
    ...mandala,
    pillars: mandala.pillars.map((pillar) =>
      pillar.title === "" && queue.length > 0 ? { ...pillar, title: queue.shift() } : pillar
    ),
  };
}

export function fillPillarActions(mandala, pillarIndex, texts) {
  const existing = new Set(mandala.pillars[pillarIndex].actions.map((action) => action.text.toLowerCase()));
  const queue = texts
    .map((text) => text.trim())
    .filter((text) => text !== "" && !existing.has(text.toLowerCase()));
  return updatePillar(mandala, pillarIndex, (pillar) => ({
    ...pillar,
    actions: pillar.actions.map((action) =>
      action.text === "" && queue.length > 0 ? { text: queue.shift(), done: false } : action
    ),
  }));
}

export function emptyActionCount(pillar) {
  return pillar.actions.filter((action) => action.text === "").length;
}
