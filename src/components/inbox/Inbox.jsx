import { IconClose } from "../Icons";
import { plural, t } from "../../i18n";
import "./Inbox.css";

// I pensieri catturati al volo, da smistare con un tocco
function Inbox({ inbox, onToReminder, onToActivity, onToJob, onDelete, onCapture }) {
  if (inbox.length === 0) {
    return null;
  }
  return (
    <section className="panel inbox" aria-labelledby="inbox-title">
      <div className="inbox-head">
        <h2 id="inbox-title" className="section-title">
          {t("Da smistare")}
        </h2>
        <span className="inbox-count">
          {inbox.length} {plural(inbox.length, "pensiero", "pensieri")}
        </span>
      </div>
      <ul className="inbox-list">
        {inbox.map((thought) => (
          <li key={thought.id} className="inbox-item">
            <p className="inbox-text">{thought.text}</p>
            <div className="inbox-actions">
              <button type="button" className="button button--quiet" onClick={() => onToReminder(thought)}>
                {t("Come promemoria")}
              </button>
              <button type="button" className="button button--quiet" onClick={() => onToJob(thought)}>
                {t("Da fare una volta")}
              </button>
              <button type="button" className="button button--quiet" onClick={() => onToActivity(thought)}>
                {t("Come attività")}
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => onDelete(thought)}
                aria-label={t("Elimina {name}", { name: thought.text })}
              >
                <IconClose />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="button button--ghost inbox-add" onClick={onCapture}>
        {t("Un altro pensiero")}
      </button>
    </section>
  );
}

export default Inbox;
