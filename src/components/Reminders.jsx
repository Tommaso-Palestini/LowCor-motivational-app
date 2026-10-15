import { useState } from "react";
import { IconClose, IconPlus } from "./Icons";
import "./Reminders.css";

function Reminders({ reminders, onAdd, onToggle, onDelete }) {
  const [text, setText] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText === "") {
      return;
    }
    onAdd(trimmedText);
    setText("");
  }

  return (
    <section className="panel reminders" aria-labelledby="reminders-title">
      <h2 id="reminders-title" className="section-title">
        Reminder
      </h2>

      {reminders.length === 0 ? (
        <p className="reminders-empty">Niente da ricordare. Scrivi qui le cose da non perdere.</p>
      ) : (
        <ul className="reminder-list">
          {reminders.map((reminder) => (
            <li
              key={reminder.id}
              className={`reminder ${reminder.done ? "reminder--done" : ""}`}
            >
              <label className="reminder-label">
                <input
                  type="checkbox"
                  className="check"
                  checked={reminder.done}
                  onChange={() => onToggle(reminder.id)}
                />
                <span className="reminder-text">{reminder.text}</span>
              </label>
              <button
                type="button"
                className="icon-button"
                onClick={() => onDelete(reminder.id)}
                aria-label={`Elimina il reminder: ${reminder.text}`}
              >
                <IconClose />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form className="reminder-form" onSubmit={handleSubmit}>
        <input
          className="field"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Nuovo reminder"
          aria-label="Testo del nuovo reminder"
        />
        <button type="submit" className="icon-button icon-button--filled" aria-label="Aggiungi reminder">
          <IconPlus />
        </button>
      </form>
    </section>
  );
}

export default Reminders;
