import { useState } from "react";
import { IconPlus } from "./Icons";

function ActivityForm({ onAdd }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("passion");
  const [amount, setAmount] = useState(3);
  const [period, setPeriod] = useState("week");
  const [error, setError] = useState("");

  function close() {
    setIsOpen(false);
    setName("");
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmedName = name.trim();
    const goalAmount = Number(amount);
    if (trimmedName === "") {
      setError("Dai un nome all'attività.");
      return;
    }
    if (!(goalAmount >= 1)) {
      setError("L'obiettivo deve essere almeno 1.");
      return;
    }
    onAdd({ name: trimmedName, type, amount: goalAmount, period });
    close();
  }

  if (!isOpen) {
    return (
      <button type="button" className="button button--ghost activity-add" onClick={() => setIsOpen(true)}>
        <IconPlus />
        Nuova attività
      </button>
    );
  }

  return (
    <form className="activity-form" onSubmit={handleSubmit} noValidate>
      <input
        className="field activity-form-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nome, per esempio Chitarra"
        aria-label="Nome dell'attività"
        autoFocus
      />
      <div className="activity-form-row">
        <select
          className="field"
          value={type}
          onChange={(event) => setType(event.target.value)}
          aria-label="Tipo di attività"
        >
          <option value="passion">Passione</option>
          <option value="fixed">Non negoziabile</option>
        </select>
        <input
          type="number"
          min="1"
          className="field field--narrow"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label="Quante volte"
        />
        <span className="activity-form-word">volte</span>
        <select
          className="field"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          aria-label="Ogni quanto"
        >
          <option value="week">a settimana</option>
          <option value="day">al giorno</option>
        </select>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="activity-form-actions">
        <button type="submit" className="button button--primary">
          Aggiungi attività
        </button>
        <button type="button" className="button button--quiet" onClick={close}>
          Annulla
        </button>
      </div>
    </form>
  );
}

export default ActivityForm;