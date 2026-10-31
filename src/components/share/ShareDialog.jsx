import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PdfDocument, { PAGE_HEIGHT, PAGE_WIDTH } from "./PdfDocument";
import { canShareFiles, downloadBlob, sharePdf } from "../../logic/pdfExport";
import { toDateString } from "../../logic/dates";
import { recentMonths } from "../../logic/monthStats";
import { IconClose, IconDownload, IconSend, IconSpinner } from "../Icons";
import "./Share.css";

function slug(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function currentHue() {
  const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hue"));
  return Number.isFinite(value) ? Math.round(value) : 290;
}

// Crea il PDF "Il patto di …" e lo condivide (o lo scarica).
function ShareDialog({ data, now, userName, onUserNameChange, onClose, onError }) {
  const dialogRef = useRef(null);
  const [name, setName] = useState(userName || "");
  const [includeParked, setIncludeParked] = useState(true);
  const months = recentMonths(now);
  const [month, setMonth] = useState(months[0].key);
  // idle, rendering, ready
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [hue, setHue] = useState(290);
  const canShare = canShareFiles();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }, []);

  const trimmedName = name.trim();
  const filename = `patto-${slug(trimmedName) || "lowcor"}-${toDateString(now)}.pdf`;
  const title = trimmedName ? `Il patto di ${trimmedName}` : "Il mio patto";

  function start(event) {
    event.preventDefault();
    onUserNameChange(trimmedName);
    setHue(currentHue());
    setResult(null);
    setPhase("rendering");
  }

  async function handlePagesReady(nodes) {
    try {
      // jsPDF è pesante: si carica solo quando crei il PDF
      const { pagesToPdf } = await import("../../logic/pdfRender");
      const output = await pagesToPdf(nodes, { title, author: trimmedName, width: PAGE_WIDTH, height: PAGE_HEIGHT });
      setResult({ ...output, pages: nodes.length });
      setPhase("ready");
    } catch (error) {
      console.error(error);
      setPhase("idle");
      onError("Non sono riuscito a creare il PDF, riprova");
    }
  }

  async function handleShare() {
    try {
      await sharePdf(result.blob, filename, title);
    } catch {
      downloadBlob(result.blob, filename);
    }
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        className="editor share"
        aria-labelledby="share-title"
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
            <h2 id="share-title" className="section-title">
              Condividi in PDF
            </h2>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Chiudi">
              <IconClose />
            </button>
          </div>

          {phase !== "ready" && (
            <form className="share-form" onSubmit={start}>
              <p className="share-lead">
                Un documento da mandare a chi vuoi: le tue non negoziabili come un patto, le passioni che coltivi e come
                sta andando, settimana dopo settimana.
              </p>
              <label className="editor-field">
                <span>Il tuo nome, per la copertina e la firma</span>
                <input
                  className="field"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Per esempio Giulia"
                  autoComplete="given-name"
                  disabled={phase === "rendering"}
                />
              </label>
              <label className="editor-field">
                <span>Mese da raccontare, con calendario e numeri</span>
                <select
                  className="field"
                  value={month}
                  onChange={(event) => setMonth(event.target.value)}
                  disabled={phase === "rendering"}
                >
                  {months.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                    </option>
                  ))}
                  <option value="">Nessun mese</option>
                </select>
              </label>
              <label className="share-check">
                <input
                  type="checkbox"
                  className="check"
                  checked={includeParked}
                  onChange={(event) => setIncludeParked(event.target.checked)}
                  disabled={phase === "rendering"}
                />
                Includi le attività parcheggiate
              </label>
              <button type="submit" className="button button--primary" disabled={phase === "rendering"}>
                {phase === "rendering" ? (
                  <>
                    <IconSpinner />
                    Sto impaginando il tuo patto…
                  </>
                ) : (
                  "Crea il PDF"
                )}
              </button>
            </form>
          )}

          {phase === "ready" && result && (
            <div className="share-ready">
              <figure className="share-preview">
                <img src={result.cover} alt={`Copertina del PDF: ${title}`} />
                <figcaption>
                  {title}, {result.pages} {result.pages === 1 ? "pagina" : "pagine"}
                </figcaption>
              </figure>
              <div className="share-actions">
                {canShare && (
                  <button type="button" className="button button--primary" onClick={handleShare}>
                    <IconSend />
                    Condividi
                  </button>
                )}
                <button
                  type="button"
                  className={`button ${canShare ? "button--ghost" : "button--primary"}`}
                  onClick={() => downloadBlob(result.blob, filename)}
                >
                  <IconDownload />
                  Scarica il PDF
                </button>
                <button type="button" className="button button--quiet" onClick={() => setPhase("idle")}>
                  Modifica
                </button>
              </div>
            </div>
          )}
        </div>
      </dialog>

      {phase === "rendering" &&
        createPortal(
          <div className="pdf-stage" aria-hidden="true">
            <PdfDocument
              name={trimmedName}
              activities={data.activities}
              blocks={data.blocks}
              now={now}
              includeParked={includeParked}
              month={month || null}
              hue={hue}
              onPagesReady={handlePagesReady}
            />
          </div>,
          document.body
        )}
    </>
  );
}

export default ShareDialog;
