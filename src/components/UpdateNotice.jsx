import { useEffect, useState } from "react";
import { findUpdate, installUpdate } from "../desktop";
import { t } from "../i18n";

// All'avvio dell'app desktop cerca una versione nuova (pubblicata dalla CI a ogni push).
// Non aggiorna mai da sola: propone, e decide la persona. "Più tardi" vale fino al prossimo avvio.
function UpdateNotice({ enabled }) {
  const [update, setUpdate] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    let cancelled = false;
    // Qualche secondo dopo l'avvio, per non rallentare l'apertura
    const timerId = setTimeout(() => {
      findUpdate()
        .then((found) => !cancelled && setUpdate(found))
        .catch((error) => console.warn("Controllo aggiornamenti non riuscito:", error));
    }, 4000);
    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [enabled]);

  if (!update || phase === "dismissed") {
    return null;
  }

  async function install() {
    setPhase("installing");
    try {
      await installUpdate(update, setProgress);
    } catch (error) {
      console.error(error);
      setPhase("failed");
    }
  }

  return (
    <div className="update-notice" role="status">
      <p>
        {phase === "failed"
          ? t("Aggiornamento non riuscito: riprova più tardi")
          : phase === "installing"
            ? progress === null
              ? t("Scarico la nuova versione…")
              : t("Scarico la nuova versione… {n}%", { n: Math.round(progress * 100) })
            : t("È pronta LowCor {version}", { version: update.version })}
      </p>
      {phase === "idle" && (
        <div className="update-notice-actions">
          <button type="button" className="toast-undo" onClick={install}>
            {t("Aggiorna e riavvia")}
          </button>
          <button type="button" className="button button--quiet" onClick={() => setPhase("dismissed")}>
            {t("Più tardi")}
          </button>
        </div>
      )}
      {phase === "failed" && (
        <button type="button" className="button button--quiet" onClick={() => setPhase("dismissed")}>
          {t("Chiudi")}
        </button>
      )}
    </div>
  );
}

export default UpdateNotice;
