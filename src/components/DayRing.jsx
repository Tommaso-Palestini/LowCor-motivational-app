import { useEffect, useRef } from "react";
import { formatDuration, timeToMinutes } from "../logic/time";
import { prefersReducedMotion } from "../logic/motion";
import { t } from "../i18n";

const RING_START = 6 * 60;
const RING_SPAN = 18 * 60;
const SIZE = 340;
const CENTER = SIZE / 2;
const RADIUS = 136;
const STROKE = 22;
const HOUR_LABELS = [6, 9, 12, 15, 18, 21];
const CAP_ANGLE = (STROKE / 2 / RADIUS) * (180 / Math.PI);
const ARC_INSET = CAP_ANGLE + 1;

function toAngle(minutes) {
  const clamped = Math.min(Math.max(minutes - RING_START, 0), RING_SPAN);
  return (clamped / RING_SPAN) * 360;
}

function polar(angle, radius) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
}

function arcPath(startAngle, endAngle, radius = RADIUS) {
  const safeEnd = Math.min(endAngle, startAngle + 359.9);
  const start = polar(startAngle, radius);
  const end = polar(safeEnd, radius);
  const largeArc = safeEnd - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function blockArc(block) {
  const startAngle = toAngle(timeToMinutes(block.start));
  const endAngle = toAngle(timeToMinutes(block.end));
  if (endAngle - startAngle > ARC_INSET * 2 + 0.5) {
    return arcPath(startAngle + ARC_INSET, endAngle - ARC_INSET);
  }
  const middle = (startAngle + endAngle) / 2;
  return arcPath(middle, middle + 0.1);
}

// Due contorni sottili che ondeggiano piano attorno all'anello, come la superficie dell'acqua.
// Il path si aggiorna direttamente nel DOM a ogni frame, senza far ridisegnare React.
const WAVES = [
  { radius: RADIUS + STROKE / 2 + 7, amplitude: 2.2, lobes: 5, speed: 0.00042, drift: 3, drift2: 0.00027 },
  { radius: RADIUS - STROKE / 2 - 3, amplitude: 1.4, lobes: 7, speed: -0.00031, drift: 4, drift2: -0.00019 },
];
const WAVE_POINTS = 144;

function wavePath({ radius, amplitude, lobes, speed, drift, drift2 }, time) {
  let path = "";
  for (let index = 0; index <= WAVE_POINTS; index += 1) {
    const theta = (index / WAVE_POINTS) * Math.PI * 2;
    const r =
      radius +
      amplitude * Math.sin(lobes * theta + time * speed * 10) +
      amplitude * 0.5 * Math.sin(drift * theta - time * drift2 * 10);
    const x = CENTER + r * Math.cos(theta);
    const y = CENTER + r * Math.sin(theta);
    path += `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${path}Z`;
}

function RingWaves() {
  const pathRefs = useRef([]);

  useEffect(() => {
    const paint = (time) => WAVES.forEach((wave, index) => pathRefs.current[index]?.setAttribute("d", wavePath(wave, time)));
    if (prefersReducedMotion()) {
      paint(0);
      return undefined;
    }
    let frame = requestAnimationFrame(function loop(time) {
      // Se l'utente attiva "riduci i movimenti" mentre l'anello è a schermo, le onde si fermano
      if (!prefersReducedMotion()) {
        paint(time);
      }
      frame = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <g className="ring-waves" aria-hidden="true">
      {WAVES.map((wave, index) => (
        <path
          key={index}
          ref={(node) => {
            pathRefs.current[index] = node;
          }}
          className={`ring-wave ring-wave--${index}`}
          d={wavePath(wave, 0)}
        />
      ))}
    </g>
  );
}

// Quanto manca alla fine del blocco in corso: il tempo che resta si vede, non si calcola.
function RemainingBar({ block, nowMinutes }) {
  const start = timeToMinutes(block.start);
  const end = timeToMinutes(block.end);
  const left = Math.max(end - nowMinutes, 0);
  const fraction = end > start ? left / (end - start) : 0;
  return (
    <div className="ring-remaining">
      <span className="ring-remaining-bar" aria-hidden="true">
        <span style={{ width: `${fraction * 100}%` }} />
      </span>
      <span className="ring-remaining-text">{left > 0 ? t("ancora {time}", { time: formatDuration(left) }) : t("tempo scaduto")}</span>
    </div>
  );
}

function getCenterText(blocks, current, next, nowMinutes) {
  if (current) {
    return { label: t("Adesso"), title: current.name, sub: t("fino alle {time}", { time: current.end }) };
  }
  if (next) {
    const wait = formatDuration(timeToMinutes(next.start) - nowMinutes);
    return { label: t("Prossimo"), title: next.name, sub: t("alle {time}, tra {wait}", { time: next.start, wait }) };
  }
  if (blocks.length > 0) {
    const doneCount = blocks.filter((block) => block.done).length;
    return {
      label: t("Giornata chiusa"),
      title: t("{done} su {total}", { done: doneCount, total: blocks.length }),
      sub: t("blocchi completati"),
    };
  }
  return {
    label: t("Giornata libera"),
    title: t("Dalle una forma"),
    sub: t("Aggiungi il primo blocco"),
  };
}

function DayRing({ blocks, nowMinutes, current, next, onFocusBlock }) {
  const nowAngle = toAngle(nowMinutes);
  const showNow = nowMinutes >= RING_START;
  const nowPoint = polar(nowAngle, RADIUS);
  const center = getCenterText(blocks, current, next, nowMinutes);

  return (
    <div className="ring">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={t("Giornata dalle 6 alle 24 con {n} blocchi", { n: blocks.length })}
      >
        <RingWaves />
        <circle className="ring-track" cx={CENTER} cy={CENTER} r={RADIUS} />
        {showNow && nowAngle > 0 && (
          <path className="ring-elapsed" d={arcPath(0, nowAngle)} />
        )}
        {HOUR_LABELS.map((hour) => {
          const point = polar(toAngle(hour * 60), RADIUS - STROKE - 8);
          return (
            <text key={hour} className="ring-hour" x={point.x} y={point.y}>
              {hour}
            </text>
          );
        })}
        {blocks.map((block, index) => (
          <path
            key={block.id}
            className={`ring-arc ring-arc--${block.tone}`}
            d={blockArc(block)}
            pathLength="1"
            style={{ "--i": index }}
          />
        ))}
        {showNow && (
          <g className="ring-now">
            <circle className="ring-now-halo" cx={nowPoint.x} cy={nowPoint.y} r="15" />
            <circle className="ring-now-dot" cx={nowPoint.x} cy={nowPoint.y} r="6" />
          </g>
        )}
      </svg>

      <div className="ring-center">
        <p className="ring-label">{center.label}</p>
        <p className="ring-title">{center.title}</p>
        <p className="ring-sub">{center.sub}</p>
        {current && <RemainingBar block={current} nowMinutes={nowMinutes} />}
        {current && !current.done && (
          <button type="button" className="ring-focus" onClick={() => onFocusBlock(current)}>
            {t("Entra in focus")}
          </button>
        )}
      </div>
    </div>
  );
}

export default DayRing;
