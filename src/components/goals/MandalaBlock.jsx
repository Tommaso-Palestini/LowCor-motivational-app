import { RING_POSITIONS, pillarProgress } from "../../logic/mandala";
import { IconCheck } from "../Icons";

const CELL_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

// Casella di testo: salva quando esci dal campo o premi Invio, non a ogni lettera,
// così Ctrl+Z annulla la parola intera e non un carattere alla volta.
// key={value} la ricrea quando il testo cambia da fuori (AI, annulla).
function TextCell({ value, placeholder, label, onCommit, className = "", children, style }) {
  return (
    <div className={`cell ${className}`} style={style}>
      <textarea
        key={value}
        className="cell-input"
        defaultValue={value}
        placeholder={placeholder}
        aria-label={label}
        rows={1}
        spellCheck="false"
        onBlur={(event) => {
          const next = event.target.value.replace(/\s+/g, " ").trim();
          if (next !== value) {
            onCommit(next);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.target.blur();
          }
          if (event.key === "Escape") {
            event.target.value = value;
            event.target.blur();
          }
        }}
      />
      {children}
    </div>
  );
}

function ProgressBar({ pillar }) {
  const { done } = pillarProgress(pillar);
  return (
    <span className="cell-progress" aria-hidden="true">
      <span style={{ width: `${(done / 8) * 100}%` }} />
    </span>
  );
}

export function CenterBlock({ mandala, actions, onOpenPillar, isThinking }) {
  return (
    <div className={`mandala-block mandala-block--center ${isThinking ? "mandala-block--thinking" : ""}`}>
      {CELL_POSITIONS.map((position) => {
        if (position === 4) {
          return (
            <TextCell
              key="goal"
              className="cell--goal"
              value={mandala.goal}
              placeholder="Il tuo obiettivo"
              label="Obiettivo principale"
              onCommit={(text) => actions.setMandala((current) => ({ ...current, goal: text }))}
            />
          );
        }
        const pillarIndex = RING_POSITIONS.indexOf(position);
        const pillar = mandala.pillars[pillarIndex];
        const style = { "--pillar": pillarIndex };

        if (onOpenPillar) {
          const { done } = pillarProgress(pillar);
          return (
            <button
              key={position}
              type="button"
              className={`cell cell--title cell--button ${pillar.title ? "" : "cell--empty"}`}
              style={style}
              onClick={() => onOpenPillar(pillarIndex)}
            >
              <span className="cell-text">{pillar.title || `Pilastro ${pillarIndex + 1}`}</span>
              <span className="cell-count">{done}/8</span>
              <ProgressBar pillar={pillar} />
            </button>
          );
        }

        return (
          <TextCell
            key={position}
            className="cell--title"
            style={style}
            value={pillar.title}
            placeholder={`Pilastro ${pillarIndex + 1}`}
            label={`Pilastro ${pillarIndex + 1}`}
            onCommit={(text) => actions.setPillarTitle(pillarIndex, text)}
          >
            <ProgressBar pillar={pillar} />
          </TextCell>
        );
      })}
    </div>
  );
}

export function PillarBlock({ mandala, pillarIndex, actions, isThinking, large = false }) {
  const pillar = mandala.pillars[pillarIndex];
  const { completed } = pillarProgress(pillar);
  const classes = [
    "mandala-block",
    large ? "mandala-block--large" : "",
    completed ? "mandala-block--completed" : "",
    isThinking ? "mandala-block--thinking" : "",
  ].join(" ");

  return (
    <div className={classes} style={{ "--pillar": pillarIndex }}>
      {CELL_POSITIONS.map((position) => {
        if (position === 4) {
          return (
            <TextCell
              key="title"
              className="cell--title"
              value={pillar.title}
              placeholder={`Pilastro ${pillarIndex + 1}`}
              label={`Pilastro ${pillarIndex + 1}`}
              onCommit={(text) => actions.setPillarTitle(pillarIndex, text)}
            >
              <ProgressBar pillar={pillar} />
            </TextCell>
          );
        }
        const actionIndex = RING_POSITIONS.indexOf(position);
        const action = pillar.actions[actionIndex];
        const name = pillar.title || `pilastro ${pillarIndex + 1}`;
        return (
          <TextCell
            key={position}
            className={`cell--action ${action.done ? "cell--done" : ""}`}
            value={action.text}
            placeholder="Azione"
            label={`Azione ${actionIndex + 1} di ${name}`}
            onCommit={(text) => actions.setActionText(pillarIndex, actionIndex, text)}
          >
            {action.text !== "" && (
              <button
                type="button"
                className="cell-check"
                aria-pressed={action.done}
                aria-label={action.done ? `Togli la spunta a ${action.text}` : `Segna come fatta: ${action.text}`}
                onClick={() => actions.toggleAction(pillarIndex, actionIndex)}
              >
                <IconCheck />
              </button>
            )}
          </TextCell>
        );
      })}
    </div>
  );
}
