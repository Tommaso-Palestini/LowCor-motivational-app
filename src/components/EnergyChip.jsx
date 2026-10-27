import { ENERGY, activityEnergy, nextEnergy } from "../logic/energy";
import { t } from "../i18n";

function EnergyChip({ activity, onChange }) {
  const level = activityEnergy(activity);
  const label = t(ENERGY[level].label);
  return (
    <button
      type="button"
      className={`energy-chip energy-chip--${level}`}
      onClick={() => onChange(activity.id, nextEnergy(level))}
      aria-label={t("Energia di {name}: {level}. Tocca per cambiarla", { name: activity.name, level: label.toLowerCase() })}
      title={t("Energia richiesta: tocca per cambiarla")}
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
