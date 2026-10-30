import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "../cloud/api";
import { SHARE_DAYS, initialSync, scheduleItems, stableStringify, syncPayload } from "../logic/cloud";
import { LEGAL_VERSION, hasConsent } from "../logic/consent";
import { addDays } from "../logic/dates";

const SAVE_DELAY_MS = 1500;

// Account e salvataggio online. I dati restano sempre anche sul dispositivo: il server è una copia
// che tiene allineati i dispositivi dello stesso account. Due regole:
// * non si sovrascrive mai una modifica fatta altrove (revision): in caso di dubbio si chiede;
// * finché la prima sincronizzazione non è chiusa non si salva niente.
export function useCloud({ data, today, replaceData }) {
  const [session, setSession] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [status, setStatus] = useState(api.cloudAvailable ? "signed-out" : "off");
  const [conflict, setConflict] = useState(null);
  const [ready, setReady] = useState(false);
  const [publishTick, setPublishTick] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const revisionRef = useRef(0);
  const syncedRef = useRef(null);
  const publishedRef = useRef(null);
  const dataRef = useRef(data);
  const userRef = useRef(null);
  const userId = session?.user?.id || null;

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Cambio di utente (login, logout, account cancellato): si riparte da zero.
  // Il rinnovo del token arriva come nuova sessione dello stesso utente e non azzera niente.
  const handleSession = useCallback((next) => {
    const nextId = next?.user?.id || null;
    if (nextId !== userRef.current) {
      userRef.current = nextId;
      revisionRef.current = 0;
      syncedRef.current = null;
      publishedRef.current = null;
      setReady(false);
      setConflict(null);
      setProfileName("");
      setStatus(nextId ? "syncing" : "signed-out");
    }
    setSession(next);
  }, []);

  // La libreria del backend pesa: si carica solo se su questo dispositivo c'è già una sessione,
  // e a pagina ferma; altrimenti quando si apre l'account per accedere.
  useEffect(() => {
    if (!api.cloudAvailable) {
      return undefined;
    }
    const unsubscribe = api.onSessionChange(handleSession);
    let cancel = () => {};
    if (api.hasStoredSession()) {
      const start = () => api.getSession().then(handleSession).catch(() => {});
      if (window.requestIdleCallback) {
        const id = window.requestIdleCallback(start, { timeout: 3000 });
        cancel = () => window.cancelIdleCallback(id);
      } else {
        const id = setTimeout(start, 1500);
        cancel = () => clearTimeout(id);
      }
    }
    return () => {
      cancel();
      unsubscribe();
    };
  }, [handleSession]);

  const applyRemote = useCallback(
    (remote) => {
      revisionRef.current = remote.revision;
      syncedRef.current = stableStringify(syncPayload(remote.data));
      replaceData(remote.data);
    },
    [replaceData]
  );

  // Primo allineamento dopo il login (o all'apertura dell'app con una sessione salvata)
  useEffect(() => {
    if (!userId) {
      return undefined;
    }
    let alive = true;
    let retryTimer = null;
    const retry = () => setAttempt((count) => count + 1);
    (async () => {
      try {
        const [remote, profile, consent] = await Promise.all([
          api.loadState(userId),
          api.getProfile(userId),
          api.getConsent(userId),
        ]);
        if (!alive) {
          return;
        }
        setProfileName(profile?.display_name || "");
        // Chi ha già accettato la versione attuale su questo dispositivo la registra anche sul server
        if (consent && consent.legal_version < LEGAL_VERSION && hasConsent(dataRef.current)) {
          api.acceptLegal(LEGAL_VERSION).catch(() => {});
        }
        const local = dataRef.current;
        const decision = initialSync(local, remote?.data || null);
        if (decision === "upload") {
          const payload = syncPayload(local);
          const result = await api.saveState(payload, 0);
          if (!alive) {
            return;
          }
          if (result.ok) {
            revisionRef.current = result.revision;
            syncedRef.current = stableStringify(payload);
          } else {
            setConflict({ remote: result, initial: true });
            setStatus("conflict");
            return;
          }
        } else if (decision === "download") {
          applyRemote(remote);
        } else if (decision === "same") {
          revisionRef.current = remote.revision;
          syncedRef.current = stableStringify(syncPayload(local));
        } else {
          setConflict({ remote, initial: true });
          setStatus("conflict");
          return;
        }
        setReady(true);
        setStatus("saved");
      } catch {
        // Offline al login: si riprova tra poco e appena torna la connessione
        if (alive) {
          setStatus("offline");
          retryTimer = setTimeout(retry, 15000);
          window.addEventListener("online", retry, { once: true });
        }
      }
    })();
    return () => {
      alive = false;
      clearTimeout(retryTimer);
      window.removeEventListener("online", retry);
    };
  }, [userId, applyRemote, attempt]);

  const save = useCallback(async () => {
    const payload = syncPayload(dataRef.current);
    const serialized = stableStringify(payload);
    if (serialized === syncedRef.current) {
      setStatus("saved");
      return;
    }
    setStatus("saving");
    try {
      const result = await api.saveState(payload, revisionRef.current);
      if (result.ok) {
        revisionRef.current = result.revision;
        syncedRef.current = serialized;
        setStatus("saved");
      } else if (result.revision === 0) {
        // La copia online non c'è più (per esempio cancellata da un altro dispositivo): si ricrea
        revisionRef.current = 0;
        const retry = await api.saveState(payload, 0);
        revisionRef.current = retry.revision;
        syncedRef.current = serialized;
        setStatus("saved");
      } else {
        setConflict({ remote: result, initial: false });
        setStatus("conflict");
      }
    } catch (error) {
      setStatus(error?.message === "state_too_large" ? "too-large" : "offline");
    }
  }, []);

  // Salvataggio automatico poco dopo ogni modifica
  useEffect(() => {
    if (!ready || conflict) {
      return undefined;
    }
    const timer = setTimeout(save, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [data, ready, conflict, save]);

  // Tornando sull'app si prendono le modifiche fatte altrove, se qui non ce ne sono di non salvate
  useEffect(() => {
    if (!ready || conflict) {
      return undefined;
    }
    async function pull() {
      if (document.visibilityState !== "visible") {
        return;
      }
      try {
        const remote = await api.loadState(userId);
        const unsaved = stableStringify(syncPayload(dataRef.current)) !== syncedRef.current;
        if (remote && remote.revision > revisionRef.current && !unsaved) {
          applyRemote(remote);
        } else if (unsaved) {
          save();
        }
      } catch {
        setStatus("offline");
      }
    }
    document.addEventListener("visibilitychange", pull);
    window.addEventListener("online", pull);
    return () => {
      document.removeEventListener("visibilitychange", pull);
      window.removeEventListener("online", pull);
    };
  }, [ready, conflict, userId, applyRemote, save]);

  // Impegni per le persone collegate: si ripubblicano solo quando cambiano
  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    const to = addDays(today, SHARE_DAYS);
    const items = scheduleItems(data, today, to);
    const key = `${today}|${stableStringify(items)}`;
    if (key === publishedRef.current) {
      return undefined;
    }
    const timer = setTimeout(() => {
      api
        .publishSchedule(today, to, items)
        .then(() => {
          publishedRef.current = key;
        })
        .catch(() => {});
    }, SAVE_DELAY_MS * 2);
    return () => clearTimeout(timer);
  }, [data, today, ready, publishTick]);

  // Conflitto: "local" tiene i dati di questo dispositivo, "remote" quelli salvati online
  const resolveConflict = useCallback(
    async (choice) => {
      if (!conflict) {
        return;
      }
      const remote = conflict.remote;
      if (choice === "remote" && remote.data) {
        applyRemote(remote);
      } else {
        revisionRef.current = remote.revision || 0;
        syncedRef.current = null;
      }
      setConflict(null);
      setReady(true);
      if (choice !== "remote") {
        await save();
      } else {
        setStatus("saved");
      }
    },
    [conflict, applyRemote, save]
  );

  // Dopo un nuovo collegamento o un cambio di cosa si mostra, si ripubblica subito
  const republish = useCallback(() => {
    publishedRef.current = null;
    setPublishTick((tick) => tick + 1);
  }, []);

  return {
    available: api.cloudAvailable,
    session,
    user: session?.user || null,
    profileName,
    setProfileName,
    status,
    conflict,
    resolveConflict,
    syncNow: save,
    republish,
  };
}
