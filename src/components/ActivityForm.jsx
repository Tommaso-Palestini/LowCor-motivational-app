import { useState } from "react";
import { ENERGY } from "../logic/energy";
import { IconPlus } from "./Icons";
import { t } from "../i18n";

function ActivityForm({ onAdd }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("passion");
  const [amount, setAmount] = useState(3);
  const [period, setPeriod] = useState("week");
  const [energy, setEnergy] = useState("medium");
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
      setError(t("Dai un nome all'attività."));
      return;
    }
    if (!(goalAmount >= 1)) {
      setError(t("L'obiettivo deve essere almeno 1."));
      return;
    }
    onAdd({ name: trimmedName, type, amount: goalAmount, period, energy });
    close();
  }

  if (!isOpen) {
    return (
      <button type="button" className="button button--ghost activity-add" onClick={() => setIsOpen(true)}>
        <IconPlus />
        {t("Nuova attività")}
      </button>
    );
  }

  return (
    <form className="activity-form" onSubmit={handleSubmit} noValidate>
      <input
        className="field activity-form-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t("Nome, per esempio Chitarra")}
        aria-label={t("Nome dell'attività")}
        autoFocus
      />
      <div className="activity-form-row">
        <select
          className="field"
          value={type}
          onChange={(event) => setType(event.target.value)}
          aria-label={t("Tipo di attività")}
        >
          <option value="passion">{t("Passione")}</option>
          <option value="fixed">{t("Non negoziabile")}</option>
        </select>
        <input
          type="number"
          min="1"
          className="field field--narrow"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          aria-label={t("Quante volte")}
        />
        <span className="activity-form-word">{t("volte")}</span>
        <select
          className="field"
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          aria-label={t("Ogni quanto")}
        >
          <option value="week">{t("a settimana")}</option>
          <option value="day">{t("al giorno")}</option>
        </select>
        <select
          className="field"
          value={energy}
          onChange={(event) => setEnergy(event.target.value)}
          aria-label={t("Energia richiesta")}
        >
          {Object.entries(ENERGY).map(([level, { label }]) => (
            <option key={level} value={level}>
              {t("Energia {level}", { level: t(label).toLowerCase() })}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="activity-form-actions">
        <button type="submit" className="button button--primary">
          {t("Aggiungi attività")}
        </button>
        <button type="button" className="button button--quiet" onClick={close}>
          {t("Annulla")}
        </button>
      </div>
    </form>
  );
}

export default ActivityForm;
