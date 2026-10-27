import { useEffect, useRef, useState } from "react";
import { LEGAL_PAGES, onOpenLegal, openLegal } from "../../logic/consent";
import { getLanguage, t } from "../../i18n";
import { IconClose } from "../Icons";
import "./Legal.css";

export function LegalLink({ page, children }) {
  return (
    <a
      href={LEGAL_PAGES[page].file}
      className="legal-link"
      onClick={(event) => {
        event.preventDefault();
        openLegal(page);
      }}
    >
      {children || t(LEGAL_PAGES[page].title)}
    </a>
  );
}

function useModal() {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);
  return ref;
}

function LegalFrame({ page, onClose }) {
  const dialogRef = useModal();
  const { file, title } = LEGAL_PAGES[page];
  const anchor = getLanguage() === "en" ? "#en" : "";

  return (
    <dialog
      ref={dialogRef}
      className="editor legal"
      aria-labelledby="legal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="editor-head legal-head">
        <h2 id="legal-title" className="section-title">
          {t(title)}
        </h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label={t("Chiudi")}>
          <IconClose />
        </button>
      </div>
      <iframe className="legal-frame" src={file + anchor} title={t(title)} />
    </dialog>
  );
}

// Montata una volta in App: apre la pagina richiesta da un LegalLink qualunque
export function LegalViewer() {
  const [page, setPage] = useState(null);
  useEffect(() => onOpenLegal(setPage), []);
  return page ? <LegalFrame key={page} page={page} onClose={() => setPage(null)} /> : null;
}

export function ConsentCheck({ checked, onChange }) {
  return (
    <label className="share-check legal-check">
      <input type="checkbox" className="check" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        {t("Ho letto e accetto")} <LegalLink page="privacy">{t("l'informativa privacy")}</LegalLink> {t("e")}{" "}
        <LegalLink page="terms">{t("i termini d'uso")}</LegalLink>
      </span>
    </label>
  );
}

// Per chi usava già l'app prima del consenso, o quando cambiano privacy e termini
export function ConsentDialog({ onAccept }) {
  const dialogRef = useModal();
  const [accepted, setAccepted] = useState(false);

  return (
    <dialog
      ref={dialogRef}
      className="editor"
      aria-labelledby="consent-title"
      onCancel={(event) => event.preventDefault()}
    >
      <div className="editor-form">
        <h2 id="consent-title" className="section-title">
          {t("Privacy e termini d'uso")}
        </h2>
        <p className="legal-lead">
          {t("LowCor non raccoglie dati: tutto resta su questo dispositivo. Prima di continuare, dai un'occhiata a come funziona.")}
        </p>
        <ConsentCheck checked={accepted} onChange={setAccepted} />
        <button type="button" className="button button--primary" disabled={!accepted} onClick={onAccept}>
          {t("Continua")}
        </button>
      </div>
    </dialog>
  );
}
