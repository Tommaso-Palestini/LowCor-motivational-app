import { useEffect, useRef, useState } from "react";
import { IconClose, IconDownload, IconRepeat, IconSpinner } from "../Icons";

function formatImported(iso) {
  return new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Collega calendari esterni (.ics da file o da link): i loro impegni occupano tempo nel calendario e nel pianificatore.
function ExternalCalendars({ calendars, actions, onClose }) {
  const dialogRef = useRef(null);
  const fileRef = useRef(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  async function run(label, task) {
    setBusy(label);
    setError("");
    try {
      await task();
      return true;
    } catch (failure) {
      setError(failure.message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="editor"
      aria-labelledby="ext-title"
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
      <div className="editor-form">
        <div className="editor-head">
          <h2 id="ext-title" className="section-title">
            Calendari esterni
          </h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi">
            <IconClose />
          </button>
        </div>
        <p className="ext-lead">
          Lezioni, lavoro, appuntamenti: importali qui e LowCor li vedrà come tempo occupato, senza pianificarci sopra.
        </p>

        {calendars.length > 0 && (
          <ul className="ext-list">
            {calendars.map((calendar) => (
              <li key={calendar.id} className="ext-item">
                <div className="ext-item-text">
                  <p className="ext-item-name">{calendar.name}</p>
                  <p className="ext-item-meta">
                    {calendar.events.length} impegni, aggiornato {formatImported(calendar.importedAt)}
                    {calendar.url ? "" : " (da file)"}
                  </p>
                </div>
                {calendar.url && (
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Aggiorna ${calendar.name}`}
                    title="Aggiorna adesso"
                    disabled={Boolean(busy)}
                    onClick={() => run(calendar.id, () => actions.refresh(calendar))}
                  >
                    {busy === calendar.id ? <IconSpinner /> : <IconRepeat />}
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Scollega ${calendar.name}`}
                  title="Scollega"
                  onClick={() => actions.remove(calendar.id)}
                >
                  <IconClose />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="ext-import">
          <p className="ext-import-title">Da file</p>
          <p className="ext-hint">Da Google Calendar: Impostazioni, Importa ed esporta, Esporta. Da Apple Calendario: File, Esporta.</p>
          <input
            ref={fileRef}
            type="file"
            accept=".ics,text/calendar"
            hidden
            onChange={(event) => {
              const file = event.target.files[0];
              event.target.value = "";
              if (file) {
                run("file", () => actions.importFile(file));
              }
            }}
          />
          <button type="button" className="button button--ghost" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
            {busy === "file" ? <IconSpinner /> : <IconDownload />}
            Importa un file .ics
          </button>
        </div>

        <form
          className="ext-import"
          onSubmit={async (event) => {
            event.preventDefault();
            if (url.trim() && (await run("url", () => actions.importUrl(url)))) {
              setUrl("");
            }
          }}
        >
          <p className="ext-import-title">Da link, si aggiorna da solo</p>
          <p className="ext-hint">Un indirizzo .ics pubblico (anche webcal://). Alcuni servizi bloccano la lettura dal browser: in quel caso usa il file.</p>
          <div className="ext-url">
            <input
              className="field"
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…/calendario.ics"
              aria-label="Link del calendario"
            />
            <button type="submit" className="button button--primary" disabled={Boolean(busy) || url.trim() === ""}>
              {busy === "url" ? <IconSpinner /> : null}
              Collega
            </button>
          </div>
        </form>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}

export default ExternalCalendars;
