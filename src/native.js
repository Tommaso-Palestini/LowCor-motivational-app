// Ponte verso l'app nativa (Capacitor, Android e iOS). Nel browser non fa niente.
// Nativo vuol dire due cose in più: vibrazioni vere (Haptics) e promemoria programmati in anticipo,
// che arrivano anche ad app chiusa (LocalNotifications), senza bisogno di un server.
import { Capacitor } from "@capacitor/core";
import { setNativeHaptics } from "./logic/haptics";
import { alertText } from "./logic/alerts";
import { addDays, toDateString } from "./logic/dates";
import { timeToMinutes } from "./logic/time";

export const isNative = Capacitor.isNativePlatform();

const DAYS_AHEAD = 7;
// iOS tiene al massimo 64 notifiche programmate per app
const MAX_SCHEDULED = 60;

let plugins = null;

async function loadPlugins() {
  if (!plugins) {
    const [{ Haptics, ImpactStyle, NotificationType }, { LocalNotifications }] = await Promise.all([
      import("@capacitor/haptics"),
      import("@capacitor/local-notifications"),
    ]);
    plugins = { Haptics, ImpactStyle, NotificationType, LocalNotifications };
  }
  return plugins;
}

export async function initNative() {
  if (!isNative) {
    return;
  }
  const { Haptics, ImpactStyle, NotificationType } = await loadPlugins();
  setNativeHaptics((kind) => {
    if (kind === "done") {
      Haptics.notification({ type: NotificationType.Success });
    } else if (kind === "lastMinute") {
      Haptics.notification({ type: NotificationType.Warning });
    } else {
      Haptics.impact({ style: kind === "halfway" ? ImpactStyle.Medium : ImpactStyle.Light });
    }
  });
}

// Id numerico stabile per ogni avviso (le notifiche native vogliono un intero)
function hashId(key) {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % 2147483647;
}

function at(date, minutes) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
}

// Riprogramma tutti i promemoria dei prossimi 7 giorni. Chiamata quando cambiano blocchi o impostazioni.
export async function scheduleBlockNotifications({ blocks, activities, enabled, minutesBefore }) {
  if (!isNative) {
    return;
  }
  const { LocalNotifications } = await loadPlugins();
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(({ id }) => ({ id })) });
  }
  if (!enabled) {
    return;
  }
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== "granted") {
    const asked = await LocalNotifications.requestPermissions();
    if (asked.display !== "granted") {
      return;
    }
  }

  const now = new Date();
  const today = toDateString(now);
  const last = addDays(today, DAYS_AHEAD);
  const activitiesById = new Map(activities.map((activity) => [activity.id, activity]));
  const notifications = [];

  blocks
    .filter((block) => !block.done && !block.released && block.date >= today && block.date <= last)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    .forEach((block) => {
      const activity = activitiesById.get(block.activityId);
      if (!activity) {
        return;
      }
      const start = timeToMinutes(block.start);
      const moments = [
        { kind: "soon", minutes: minutesBefore, when: at(block.date, start - minutesBefore) },
        { kind: "start", when: at(block.date, start) },
        { kind: "end", when: at(block.date, timeToMinutes(block.end)) },
      ];
      moments
        .filter((moment) => moment.when > now)
        .forEach((moment) => {
          const key = `${block.id}:${moment.kind}`;
          const { title, body } = alertText({ ...moment, block, activity, key });
          notifications.push({ id: hashId(key), title, body, schedule: { at: moment.when, allowWhileIdle: true } });
        });
    });

  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications: notifications.slice(0, MAX_SCHEDULED) });
  }
}
