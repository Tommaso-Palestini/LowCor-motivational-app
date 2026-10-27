// Modelli di partenza per l'onboarding: ognuno crea un'attività già sensata
// (obiettivo, energia, orario preferito per il pianificatore) e due carte per "Mentre aspetti".
export const TEMPLATES = [
  {
    id: "morning",
    type: "fixed",
    goal: { amount: 1, period: "day" },
    energy: "low",
    start: "07:30",
    minutes: 20,
    it: {
      label: "Mattina che parte bene",
      name: "Routine del mattino",
      description: "Acqua, luce, un piano per la giornata: parto prima che parta il telefono.",
      cards: [
        { type: "micro-task", text: "Scrivi su un foglio le tre cose che renderebbero buona la giornata di oggi." },
        { type: "fact", text: "La luce naturale nei primi 30 minuti dopo il risveglio aiuta a regolare il ritmo sonno-veglia." },
      ],
    },
    en: {
      label: "A good start to the day",
      name: "Morning routine",
      description: "Water, daylight, a plan for the day: I get going before my phone does.",
      cards: [
        { type: "micro-task", text: "Write down three things that would make today a good day." },
        { type: "fact", text: "Daylight in the first 30 minutes after waking helps regulate your sleep-wake rhythm." },
      ],
    },
  },
  {
    id: "move",
    type: "fixed",
    goal: { amount: 3, period: "week" },
    energy: "high",
    start: "18:30",
    minutes: 60,
    it: {
      label: "Muovermi",
      name: "Allenamento",
      description: "Il corpo che si muove tiene ferma la testa.",
      cards: [
        { type: "micro-task", text: "Prepara adesso la borsa per il prossimo allenamento: scarpe, acqua, asciugamano." },
        { type: "fact", text: "Anche 10 minuti di attività intensa migliorano l'attenzione per circa un'ora." },
      ],
    },
    en: {
      label: "Move my body",
      name: "Workout",
      description: "When the body moves, the mind settles.",
      cards: [
        { type: "micro-task", text: "Pack your bag for the next workout right now: shoes, water, towel." },
        { type: "fact", text: "Even 10 minutes of intense exercise sharpens attention for about an hour." },
      ],
    },
  },
  {
    id: "study",
    type: "fixed",
    goal: { amount: 5, period: "week" },
    energy: "high",
    start: "09:30",
    minutes: 50,
    it: {
      label: "Studio profondo",
      name: "Studio",
      description: "Blocchi senza notifiche, una cosa alla volta.",
      cards: [
        { type: "micro-task", text: "Scegli la prima pagina da studiare domani e lasciala aperta sul tavolo." },
        { type: "fact", text: "Ripassare a distanza di giorni fissa i ricordi meglio che rileggere tutto in una volta." },
      ],
    },
    en: {
      label: "Deep study",
      name: "Study",
      description: "Notification-free blocks, one thing at a time.",
      cards: [
        { type: "micro-task", text: "Pick the first page you will study tomorrow and leave it open on your desk." },
        { type: "fact", text: "Reviewing days apart locks in memories better than rereading everything at once." },
      ],
    },
  },
  {
    id: "read",
    type: "passion",
    goal: { amount: 4, period: "week" },
    energy: "low",
    start: "21:30",
    minutes: 30,
    it: {
      label: "Leggere di più",
      name: "Lettura",
      description: "Pagine di carta al posto dello scroll prima di dormire.",
      cards: [
        { type: "micro-task", text: "Leggi due pagine adesso, poi decidi se continuare." },
        { type: "fact", text: "Sei minuti di lettura bastano ad abbassare in modo misurabile la tensione." },
      ],
    },
    en: {
      label: "Read more",
      name: "Reading",
      description: "Paper pages instead of scrolling before bed.",
      cards: [
        { type: "micro-task", text: "Read two pages now, then decide whether to keep going." },
        { type: "fact", text: "Six minutes of reading is enough to measurably lower tension." },
      ],
    },
  },
  {
    id: "create",
    type: "passion",
    goal: { amount: 3, period: "week" },
    energy: "medium",
    start: "17:00",
    minutes: 60,
    it: {
      label: "Un progetto creativo",
      name: "Progetto creativo",
      description: "Musica, disegno, codice, scrittura: la cosa che faccio solo per me.",
      cards: [
        { type: "micro-task", text: "Apri il progetto e fai la modifica più piccola possibile: conta anche quella." },
        { type: "fact", text: "Fermarsi a metà di un'idea rende più facile riprendere: il cervello resta agganciato." },
      ],
    },
    en: {
      label: "A creative project",
      name: "Creative project",
      description: "Music, drawing, code, writing: the thing I do just for me.",
      cards: [
        { type: "micro-task", text: "Open the project and make the smallest possible change: it counts too." },
        { type: "fact", text: "Stopping halfway through an idea makes it easier to pick up again: your brain stays hooked." },
      ],
    },
  },
  {
    id: "language",
    type: "passion",
    goal: { amount: 4, period: "week" },
    energy: "medium",
    start: "13:30",
    minutes: 20,
    it: {
      label: "Una lingua nuova",
      name: "Lingua straniera",
      description: "Venti minuti al giorno, anche solo ascoltando.",
      cards: [
        { type: "micro-task", text: "Di' ad alta voce tre frasi su cosa stai facendo adesso, nella lingua che studi." },
        { type: "fact", text: "Ripetere ad alta voce aiuta a ricordare le parole più che leggerle in silenzio." },
      ],
    },
    en: {
      label: "A new language",
      name: "Foreign language",
      description: "Twenty minutes a day, even just listening.",
      cards: [
        { type: "micro-task", text: "Say out loud three sentences about what you are doing now, in the language you are learning." },
        { type: "fact", text: "Repeating words out loud helps you remember them better than reading them silently." },
      ],
    },
  },
  {
    id: "rest",
    type: "passion",
    goal: { amount: 1, period: "day" },
    energy: "low",
    start: "15:00",
    minutes: 15,
    it: {
      label: "Staccare davvero",
      name: "Pausa senza schermi",
      description: "Quindici minuti in cui la testa si svuota.",
      cards: [
        { type: "micro-task", text: "Alzati, guarda fuori dalla finestra per due minuti e conta cinque cose che vedi." },
        { type: "fact", text: "Le pause brevi e regolari riducono l'affaticamento mentale più di una pausa lunga." },
      ],
    },
    en: {
      label: "Really switch off",
      name: "Screen-free break",
      description: "Fifteen minutes to empty your head.",
      cards: [
        { type: "micro-task", text: "Stand up, look out of the window for two minutes and count five things you see." },
        { type: "fact", text: "Short, regular breaks reduce mental fatigue more than one long break." },
      ],
    },
  },
];

// Dalle scelte dell'onboarding alle attività e carte iniziali, nella lingua scelta.
export function buildFromTemplates(ids, language) {
  const activities = [];
  const cards = [];
  TEMPLATES.filter((template) => ids.includes(template.id)).forEach((template) => {
    const text = template[language] || template.it;
    const id = crypto.randomUUID();
    activities.push({
      id,
      name: text.name,
      description: text.description,
      type: template.type,
      status: "active",
      energy: template.energy,
      goal: template.goal,
      preferredStart: template.start,
      defaultMinutes: template.minutes,
      resumeNote: "",
    });
    text.cards.forEach((card) =>
      cards.push({
        id: crypto.randomUUID(),
        activityId: id,
        type: card.type,
        text: card.text,
        source: "template",
        views: 0,
        completed: 0,
        skipped: 0,
      })
    );
  });
  return { activities, cards };
}
