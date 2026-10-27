export const sampleActivities = [
  {
    id: "a1",
    name: "Palestra",
    energy: "high",
    type: "fixed",
    status: "active",
    goal: { amount: 5, period: "week" },
    resumeNote: "",
  },
  {
    id: "a2",
    name: "Dieta",
    energy: "low",
    type: "fixed",
    status: "active",
    goal: { amount: 1, period: "day" },
    resumeNote: "",
  },
  {
    id: "a3",
    name: "Inglese",
    energy: "medium",
    type: "passion",
    status: "focus",
    goal: { amount: 4, period: "week" },
    resumeNote: "",
  },
  {
    id: "a4",
    name: "Blender",
    energy: "medium",
    type: "passion",
    status: "parked",
    goal: { amount: 3, period: "week" },
    resumeNote: "Ero arrivato ai materiali, sezione 6 del corso",
  },
];

export const sampleBlocks = [
  {
    id: "b1",
    date: "2026-10-10",
    start: "09:00",
    end: "10:30",
    activityId: "a1",
    done: true,
  },
  {
    id: "b2",
    date: "2026-10-10",
    start: "15:00",
    end: "16:00",
    activityId: "a3",
    done: false,
  },
];

export const sampleCards = [
  {
    id: "c1",
    activityId: "a3",
    type: "micro-task",
    text: "Ripassa 5 phrasal verbs",
    views: 0,
    completed: 0,
    skipped: 0,
  },
  {
    id: "c2",
    activityId: "a1",
    type: "fact",
    text: "Il muscolo cresce durante il recupero, non durante l'allenamento",
    views: 0,
    completed: 0,
    skipped: 0,
  },
];
