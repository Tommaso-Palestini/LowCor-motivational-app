import { evaluateAchievements } from "../../logic/achievements";
import { IconCheck } from "../Icons";

function Achievements({ data, now }) {
  const items = evaluateAchievements(data, now);
  const reached = items.filter((item) => item.unlockedAt || item.reached);
  // Prima quelli presi (dal più recente), poi quelli più vicini a essere presi
  const sorted = [
    ...reached.sort((a, b) => (b.unlockedAt || "").localeCompare(a.unlockedAt || "")),
    ...items.filter((item) => !reached.includes(item)).sort((a, b) => b.value / b.goal - a.value / a.goal),
  ];

  return (
    <section className="acts-group" aria-labelledby="acts-achievements">
      <div className="acts-group-head">
        <h2 id="acts-achievements" className="section-title">
          Traguardi <span className="acts-group-count">{reached.length} di {items.length}</span>
        </h2>
        <p className="acts-group-lead">Premiano la costanza e la capacità di ripartire. Una volta presi, restano tuoi.</p>
      </div>
      <ul className="trophies">
        {sorted.map((item) => {
          const isReached = Boolean(item.unlockedAt || item.reached);
          return (
            <li key={item.id} className={`trophy ${isReached ? "trophy--reached" : ""}`}>
              <span className="trophy-seal" aria-hidden="true">
                {isReached ? (
                  <IconCheck />
                ) : (
                  <svg viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" className="trophy-track" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      className="trophy-fill"
                      strokeDasharray={2 * Math.PI * 15}
                      strokeDashoffset={2 * Math.PI * 15 * (1 - item.value / item.goal)}
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                )}
              </span>
              <div className="trophy-text">
                <p className="trophy-title">{item.title}</p>
                <p className="trophy-desc">{item.text}</p>
                {!isReached && item.goal > 1 && (
                  <p className="trophy-progress">
                    {item.value} di {item.goal}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default Achievements;
