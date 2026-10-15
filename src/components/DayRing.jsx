import { formatDuration, timeToMinutes } from "../logic/time";

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

function getCenterText(blocks, current, next, nowMinutes) {
  if (current) {
    return { label: "Adesso", title: current.name, sub: `fino alle ${current.end}` };
  }
  if (next) {
    const wait = formatDuration(timeToMinutes(next.start) - nowMinutes);
    return { label: "Prossimo", title: next.name, sub: `alle ${next.start}, tra ${wait}` };
  }
  if (blocks.length > 0) {
    const doneCount = blocks.filter((block) => block.done).length;
    return {
      label: "Giornata chiusa",
      title: `${doneCount} su ${blocks.length}`,
      sub: "blocchi completati",
    };
  }
  return {
    label: "Giornata libera",
    title: "Dalle una forma",
    sub: "Aggiungi il primo blocco",
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
        aria-label={`Giornata dalle 6 alle 24 con ${blocks.length} blocchi`}
      >
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
        {current && !current.done && (
          <button type="button" className="ring-focus" onClick={() => onFocusBlock(current)}>
            Entra in focus
          </button>
        )}
      </div>
    </div>
  );
}

export default DayRing;
