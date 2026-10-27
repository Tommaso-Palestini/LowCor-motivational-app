import { useState } from "react";
import { ENERGY } from "../../logic/energy";

// Form per creare un'attività o modificarne una esistente (nome, descrizione, obiettivo, energia).
function ActivityEditor({ activity, onSubmit, onCancel, submitLabel }) {
  const isNew = !activity;
  const [name, setName] = useState(activity ? activity.name : "");
  const [description, setDescription] = useState(activity ? activity.description || "" : "");
  const [type, setType] = useState(activity ? activity.type : "passion");
  const [amount, setAmount] = useState(activity ? activity.goal.amount : 3);
  const [period, setPeriod] = useState(activity ? activity.goal.period : "week");
  const [energy, setEnergy] = useState(activity ? activity.energy || "medium" : "medium");
  const [error, setError] = useState("");

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
    onSubmit({
      name: trimmedName,
      description: description.trim(),
      type,
      amount: goalAmount,
      period,
      energy,
    });
  }

  return (
    <form className="act-editor" onSubmit={handleSubmit} noValidate>
      <label className="act-editor-field">
        <span>Nome</span>
        <input
          className="field"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Per esempio Chitarra"
          autoFocus
        />
      </label>
      <label className="act-editor-field">
        <span>Descrizione</span>
        <textarea
          className="field act-editor-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Perché la fai, cosa vuoi ottenere"
          rows={3}
        />
      </label>
      <div className="act-editor-row">
        {isNew && (
          <label className="act-editor-field">
            <span>Tipo</span>
            <select className="field" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="passion">Passione</option>
              <option value="fixed">Non negoziabile</option>
            </select>
          </label>
        )}
        <label className="act-editor-field act-editor-field--narrow">
          <span>Quante volte</span>
          <input
            type="number"
            min="1"
            className="field"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="act-editor-field">
          <span>Ogni</span>
          <select className="field" value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="week">settimana</option>
            <option value="day">giorno</option>
          </select>
        </label>
        <label className="act-editor-field">
          <span>Energia</span>
          <select className="field" value={energy} onChange={(event) => setEnergy(event.target.value)}>
            {Object.entries(ENERGY).map(([level, { label }]) => (
              <option key={level} value={level}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="act-editor-actions">
        <button type="submit" className="button button--primary">
          {submitLabel}
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>
          Annulla
        </button>
      </div>
    </form>
  );
}

export default ActivityEditor;
