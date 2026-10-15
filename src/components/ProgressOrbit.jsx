const SIZE = 60;
const CENTER = SIZE / 2;
const RADIUS = 24;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ProgressOrbit({ done, target, tone }) {
  const ratio = tone === "parked" ? 0 : Math.min(done / target, 1);

  return (
    <svg
      className={`orbit orbit--${tone}`}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-hidden="true"
    >
      <circle className="orbit-track" cx={CENTER} cy={CENTER} r={RADIUS} />
      <circle
        className="orbit-fill"
        cx={CENTER}
        cy={CENTER}
        r={RADIUS}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        strokeLinecap={ratio > 0 ? "round" : "butt"}
        transform={`rotate(-90 ${CENTER} ${CENTER})`}
      />
      {tone !== "parked" && (
        <text className="orbit-text" x={CENTER} y={CENTER}>
          {done}/{target}
        </text>
      )}
    </svg>
  );
}

export default ProgressOrbit;
