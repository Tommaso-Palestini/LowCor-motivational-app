import { useEffect, useRef } from "react";
import { t } from "../../i18n";
import "./Account.css";

// I dati online e quelli di questo dispositivo sono diversi: decide la persona, non l'app
function ConflictDialog({ conflict, onChoose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && !ref.current.open) {
      ref.current.showModal();
    }
  }, []);
  const when = conflict.remote.updated_at ? new Date(conflict.remote.updated_at).toLocaleString() : "";

  return (
    <dialog
      ref={ref}
      className="editor account"
      aria-labelledby="conflict-title"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="editor-form">
        <h2 id="conflict-title" className="section-title">
          {t("Quali dati tengo?")}
        </h2>
        <p className="account-lead">
          {conflict.initial
            ? t("Il tuo account ha già dei dati, diversi da quelli di questo dispositivo.")
            : t("Nel frattempo i dati sono cambiati da un altro dispositivo.")}{" "}
          {when && t("Ultimo salvataggio online: {when}.", { when })}{" "}
          {t("Quelli che non scegli vengono sostituiti: se vuoi, prima salva un backup dalle impostazioni.")}
        </p>
        <div className="conflict-choices">
          <button type="button" className="button button--primary" onClick={() => onChoose("remote")}>
            {t("Usa i dati dell'account")}
          </button>
          <button type="button" className="button button--ghost" onClick={() => onChoose("local")}>
            {t("Usa i dati di questo dispositivo")}
          </button>
        </div>
      </div>
    </dialog>
  );
}

export default ConflictDialog;
