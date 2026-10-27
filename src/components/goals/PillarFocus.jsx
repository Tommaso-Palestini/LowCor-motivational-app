import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { PILLAR_COUNT, emptyActionCount, pillarProgress } from "../../logic/mandala";
import { PillarBlock } from "./MandalaBlock";
import GoalBreakdowns from "./GoalBreakdowns";
import { IconChevronLeft, IconChevronRight, IconGrid, IconSparkle } from "../Icons";

// Un solo pilastro a tutto schermo: titolo al centro, le sue 8 azioni intorno.
// Legge e scrive lo stesso mandala della griglia, quindi spunte e testi restano allineati.
function PillarFocus({ mandala, pillarIndex, focusAction, ai, actions, canFill, isThinking, onFill, onMove, onClose }) {
  const rootRef = useRef(null);
  const backRef = useRef(null);
  const pillar = mandala.pillars[pillarIndex];
  const { done } = pillarProgress(pillar);
  const titleId = `pillar-focus-title-${pillarIndex}`;

  useEffect(() => {
    const target =
      focusAction !== null ? rootRef.current?.querySelector(`[data-action="${focusAction}"]`) : backRef.current;
    target?.focus({ preventScroll: true });
  }, [pillarIndex, focusAction]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function handleKey(event) {
      // Esc dentro una casella annulla la modifica; fuori chiude lo zoom
      if (event.key === "Escape" && event.target.tagName !== "TEXTAREA") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div
      ref={rootRef}
      className="pillar-focus"
      style={{ "--pillar": pillarIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <header className="pillar-focus-bar">
        <button ref={backRef} type="button" className="button button--ghost" onClick={onClose}>
          <IconGrid />
          Torna alla panoramica 9×9
        </button>
        <div className="pillar-focus-nav">
          <button type="button" className="icon-button" onClick={() => onMove(-1)} aria-label="Pilastro precedente">
            <IconChevronLeft />
          </button>
          <p>
            Pilastro {pillarIndex + 1} di {PILLAR_COUNT}
          </p>
          <button type="button" className="icon-button" onClick={() => onMove(1)} aria-label="Pilastro successivo">
            <IconChevronRight />
          </button>
        </div>
      </header>

      <div className="pillar-focus-stage">
        <h2 id={titleId} className="sr-only">
          {pillar.title || `Pilastro ${pillarIndex + 1}`}
        </h2>
        <PillarBlock
          key={pillarIndex}
          mandala={mandala}
          pillarIndex={pillarIndex}
          actions={actions}
          isThinking={isThinking}
          large
        />
        <div className="pillar-focus-foot">
          <p className="pillar-focus-count">
            <strong>{done}</strong> di 8 azioni fatte
          </p>
          {canFill && pillar.title !== "" && emptyActionCount(pillar) > 0 && (
            <button type="button" className="button button--quiet" onClick={onFill}>
              <IconSparkle />
              Suggerisci azioni
            </button>
          )}
        </div>
      </div>

      <GoalBreakdowns mandala={mandala} ai={ai} pillarIndex={pillarIndex} />
    </div>,
    document.body
  );
}

export default PillarFocus;
