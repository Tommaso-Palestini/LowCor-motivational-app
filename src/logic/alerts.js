import { toDateString } from "./dates";
import { minutesOfDay, timeToMinutes } from "./time";
import { t } from "../i18n";

// Finestre in cui un avviso ha ancora senso: se apri l'app 20 minuti dopo l'inizio,
// "si comincia" non serve più.
const START_WINDOW = 3;
const END_WINDOW = 15;

// Gli avvisi da mostrare adesso per i blocchi di oggi. "sent" è l'insieme delle chiavi già mostrate.
// Tipi: "soon" (tra N minuti), "start" (si comincia), "end" (finito: com'è andata?).
export function dueAlerts({ blocks, activities, now, minutesBefore, sent }) {
  const today = toDateString(now);
  const nowMinutes = minutesOfDay(now);
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const alerts = [];

  blocks
    .filter((block) => block.date === today && !block.done)
    .forEach((block) => {
      const activity = activitiesById.get(block.activityId);
      if (!activity) {
        return;
      }
      const start = timeToMinutes(block.start);
      const end = timeToMinutes(block.end);
      const base = { block, activity };
      const until = start - nowMinutes;

      if (until > 0 && until <= minutesBefore) {
        alerts.push({ ...base, kind: "soon", minutes: until, key: `${block.id}:soon` });
      } else if (nowMinutes >= start && nowMinutes < Math.min(start + START_WINDOW, end)) {
        alerts.push({ ...base, kind: "start", key: `${block.id}:start` });
      } else if (nowMinutes >= end && nowMinutes < end + END_WINDOW) {
        alerts.push({ ...base, kind: "end", key: `${block.id}:end` });
      }
    });

  return alerts.filter((alert) => !sent.has(alert.key));
}

export function alertText(alert) {
  const name = alert.activity.name;
  if (alert.kind === "soon") {
    return {
      title: t(alert.minutes === 1 ? "Tra 1 minuto: {name}" : "Tra {n} minuti: {name}", { n: alert.minutes, name }),
      body: t("Alle {time}. Chiudi quello che stai facendo e preparati.", { time: alert.block.start }),
    };
  }
  if (alert.kind === "start") {
    return {
      title: t("Si comincia: {name}", { name }),
      body: t("Fino alle {time}. Un passo alla volta.", { time: alert.block.end }),
    };
  }
  return {
    title: t("Hai fatto {name}?", { name }),
    body: t("Il blocco è finito alle {time}. Segnalo con un tocco.", { time: alert.block.end }),
  };
}
