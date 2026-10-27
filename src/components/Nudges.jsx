import { alertText } from "../logic/alerts";
import { IconBolt, IconCheck, IconClose, IconTarget } from "./Icons";
import "./Nudges.css";
import { t } from "../i18n";

const ICONS = { soon: IconBolt, start: IconTarget, end: IconCheck };

// Avvisi dei blocchi in alto: restano finché non li chiudi, così non te li perdi se eri distratto.
function Nudges({ nudges, onDismiss, onFocus, onDone }) {
  if (nudges.length === 0) {
    return null;
  }
  return (
    <div className="nudges" role="region" aria-label={t("Promemoria")} aria-live="polite">
      {nudges.map((nudge) => {
        const { title, body } = alertText(nudge);
        const Icon = ICONS[nudge.kind];
        return (
          <div key={nudge.key} className={`nudge nudge--${nudge.kind}`}>
            <span className="nudge-icon" aria-hidden="true">
              <Icon />
            </span>
            <div className="nudge-text">
              <p className="nudge-title">{title}</p>
              <p className="nudge-body">{body}</p>
              <div className="nudge-actions">
                {nudge.kind === "start" && (
                  <button type="button" className="button button--primary" onClick={() => onFocus(nudge)}>
                    {t("Entra in focus")}
                  </button>
                )}
                {nudge.kind === "end" && (
                  <>
                    <button type="button" className="button button--primary" onClick={() => onDone(nudge)}>
                      <IconCheck />
                      {t("Fatto")}
                    </button>
                    <button type="button" className="button button--quiet" onClick={() => onDismiss(nudge.key)}>
                      {t("Non ancora")}
                    </button>
                  </>
                )}
              </div>
            </div>
            <button type="button" className="icon-button nudge-close" onClick={() => onDismiss(nudge.key)} aria-label={t("Chiudi")}>
              <IconClose />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default Nudges;
