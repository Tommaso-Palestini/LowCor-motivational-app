import { useEffect, useRef, useState } from "react";
import { IconClose } from "../Icons";
import { t } from "../../i18n";

// Finestra per buttare lì un pensiero al volo: Invio salva, Maiusc+Invio va a capo.
function QuickCapture({ onSave, onClose }) {
  const dialogRef = useRef(null);
  const [text, setText] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  function save(event) {
    event?.preventDefault();
    if (text.trim() !== "") {
      onSave(text);
    }
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="editor"
      aria-labelledby="capture-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <form className="editor-form" onSubmit={save}>
        <div className="editor-head">
          <h2 id="capture-title" className="section-title">
            {t("Cosa ti passa per la testa?")}
          </h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label={t("Chiudi")}>
            <IconClose />
          </button>
        </div>
        <textarea
          className="field capture-field"
          rows={3}
          value={text}
          autoFocus
          placeholder={t("Scrivilo e torna a quello che facevi")}
          aria-label={t("Pensiero")}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              save(event);
            }
          }}
        />
        <p className="settings-hint">{t("Finisce in “Da smistare” nella home: lo sistemi quando hai tempo.")}</p>
        <button type="submit" className="button button--primary" disabled={text.trim() === ""}>
          {t("Metti da parte")}
        </button>
      </form>
    </dialog>
  );
}

export default QuickCapture;
