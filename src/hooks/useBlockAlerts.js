import { useEffect, useRef } from "react";
import { alertText, dueAlerts } from "../logic/alerts";
import { toDateString } from "../logic/dates";

const CHECK_MS = 20000;

function sentKey() {
  return `lowcor-alerts-${toDateString(new Date())}`;
}

// Gli avvisi già mostrati oggi restano segnati anche se ricarichi la pagina.
function loadSent() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(sentKey()) || "[]"));
  } catch {
    return new Set();
  }
}

function saveSent(sent) {
  try {
    sessionStorage.setItem(sentKey(), JSON.stringify([...sent]));
  } catch {
    // senza sessionStorage al massimo un avviso si ripete dopo un ricaricamento
  }
}

// Notifica di sistema solo quando l'app non è in primo piano: dentro l'app basta l'avviso in pagina.
// Sulle PWA installate (Android, iOS) passa dal service worker, che è l'unico modo supportato.
async function systemNotify(alert) {
  if (!("Notification" in window) || Notification.permission !== "granted" || !document.hidden) {
    return;
  }
  const { title, body } = alertText(alert);
  const options = { body, tag: alert.key, icon: "/pwa-192x192.png", badge: "/favicon-64x64.png" };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
    } else {
      new Notification(title, options);
    }
  } catch (error) {
    console.warn("Notifica non mostrata:", error);
  }
}

// Controlla ogni 20 secondi (e quando torni sull'app) se c'è un blocco che sta per iniziare o è appena finito.
export function useBlockAlerts({ blocks, activities, enabled, minutesBefore, onAlerts }) {
  const latest = useRef({ blocks, activities, minutesBefore, onAlerts });
  useEffect(() => {
    latest.current = { blocks, activities, minutesBefore, onAlerts };
  });

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const sent = loadSent();

    function check() {
      const { blocks: currentBlocks, activities: currentActivities, minutesBefore: before, onAlerts: emit } =
        latest.current;
      const alerts = dueAlerts({
        blocks: currentBlocks,
        activities: currentActivities,
        now: new Date(),
        minutesBefore: before,
        sent,
      });
      if (alerts.length === 0) {
        return;
      }
      alerts.forEach((alert) => {
        sent.add(alert.key);
        systemNotify(alert);
      });
      saveSent(sent);
      emit(alerts);
    }

    check();
    const timerId = setInterval(check, CHECK_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timerId);
      document.removeEventListener("visibilitychange", check);
    };
  }, [enabled]);
}
