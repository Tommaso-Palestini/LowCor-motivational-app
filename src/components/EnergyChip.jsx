import { ENERGY, activityEnergy, nextEnergy } from "../logic/energy";

function EnergyChip({ activity, onChange }) {
  const level = activityEnergy(activity);
  const { label } = ENERGY[level];
  return (
    <button
      type="button"
      className={`energy-chip energy-chip--${level}`}
      onClick={() => onChange(activity.id, nextEnergy(level))}
      aria-label={`Energia di ${activity.name}: ${label.toLowerCase()}. Tocca per cambiarla`}
      title="Energia richiesta: tocca per cambiarla"
    >
      <span className="energy-pips" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {label}
    </button>
  );
}

export default EnergyChip;
