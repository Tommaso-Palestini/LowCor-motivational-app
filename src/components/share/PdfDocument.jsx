import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { activityStats } from "../../logic/activityStats";
import { formatDate, toDateString, weekDates } from "../../logic/dates";
import { ENERGY, activityEnergy } from "../../logic/energy";
import { monthStats } from "../../logic/monthStats";
import "./PdfDocument.css";

// Pagina A4 a 96 dpi
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;
const CONTENT_HEIGHT = PAGE_HEIGHT - 96 - 120; // margine alto + spazio per il piè di pagina

function formatGoal(goal) {
  return goal.period === "day" ? `${goal.amount} volte al giorno` : `${goal.amount} volte a settimana`;
}

function formatHours(minutes) {
  const hours = minutes / 60;
  if (hours < 1) {
    return { value: String(minutes), unit: "minuti" };
  }
  return { value: hours < 10 ? hours.toFixed(1).replace(".", ",").replace(",0", "") : String(Math.round(hours)), unit: "ore" };
}

function Ring({ ratio, size, stroke }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const shown = Math.max(ratio, 0.02);
  return (
    <svg className="pdf-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <linearGradient id="pdf-ring-gradient" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0" className="pdf-ring-stop-a" />
          <stop offset="1" className="pdf-ring-stop-b" />
        </linearGradient>
      </defs>
      <circle className="pdf-ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
      <circle
        className="pdf-ring-fill"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - shown)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function WeekStrip({ weeks, target }) {
  return (
    <div className="pdf-weeks">
      {weeks.map((week) => (
        <span key={week.start} className={`pdf-week ${week.met ? "pdf-week--met" : ""}`}>
          <span style={{ height: `${Math.max(Math.min(week.count / target, 1), 0.06) * 100}%` }} />
        </span>
      ))}
    </div>
  );
}

function StreakLine({ stats }) {
  if (stats.streak > 0) {
    return (
      <>
        <strong>{stats.streak}</strong> {stats.streak === 1 ? "settimana" : "settimane"} di fila centrate
      </>
    );
  }
  if (stats.sessions > 0) {
    return (
      <>
        <strong>{stats.sessions}</strong> {stats.sessions === 1 ? "sessione fatta" : "sessioni fatte"}
      </>
    );
  }
  return "Si comincia adesso";
}

const WEEKDAYS = ["L", "M", "M", "G", "V", "S", "D"];

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function MonthPage({ stats, page, total }) {
  const hours = formatHours(stats.minutes);
  const topMinutes = stats.ranking[0] ? stats.ranking[0].minutes : 1;
  return (
    <section className="pdf-page pdf-month">
      <div className="pdf-month-inner">
        <header className="pdf-month-head">
          <p className="pdf-cover-week">Il mese in numeri</p>
          <h2 className="pdf-month-title">{capitalize(stats.label)}</h2>
        </header>

        <dl className="pdf-month-stats">
          <div>
            <dt>Sessioni</dt>
            <dd>{stats.sessions}</dd>
          </div>
          <div>
            <dt>Tempo dedicato</dt>
            <dd>
              {hours.value} <span>{hours.unit}</span>
            </dd>
          </div>
          <div>
            <dt>Giorni attivi</dt>
            <dd>{stats.activeDays}</dd>
          </div>
          <div>
            <dt>Blocchi rispettati</dt>
            <dd>{stats.completion === null ? "–" : `${Math.round(stats.completion * 100)}%`}</dd>
          </div>
        </dl>

        <div className="pdf-month-calendar">
          {WEEKDAYS.map((day, index) => (
            <span key={index} className="pdf-month-weekday">
              {day}
            </span>
          ))}
          {stats.days.map((day) => (
            <span
              key={day.date}
              className={`pdf-month-day ${day.inMonth ? "" : "pdf-month-day--out"} ${day.count > 0 ? "pdf-month-day--on" : ""}`}
              style={{ "--i": day.intensity }}
            >
              <span className="pdf-month-day-number">{Number(day.date.slice(8))}</span>
              {day.count > 0 && <span className="pdf-month-day-count">{day.count}</span>}
            </span>
          ))}
        </div>

        <div className="pdf-month-highlights">
          {stats.bestDay && (
            <p>
              Il giorno più pieno è stato{" "}
              <strong>{formatDate(stats.bestDay.date, { weekday: "long", day: "numeric" })}</strong>, con{" "}
              {stats.bestDay.count} {stats.bestDay.count === 1 ? "blocco chiuso" : "blocchi chiusi"}.
            </p>
          )}
          {stats.bestRun > 1 && (
            <p>
              Record del mese: <strong>{stats.bestRun} giorni di fila</strong> senza saltarne uno.
            </p>
          )}
          {stats.sessions === 0 && <p>Un mese ancora tutto da scrivere.</p>}
        </div>

        {stats.ranking.length > 0 && (
          <ol className="pdf-month-ranking">
            {stats.ranking.slice(0, 6).map(({ activity, sessions, minutes }) => {
              const time = formatHours(minutes);
              return (
                <li key={activity.id}>
                  <span className="pdf-month-rank-name">{activity.name}</span>
                  <span className="pdf-month-rank-bar">
                    <span style={{ width: `${(minutes / topMinutes) * 100}%` }} />
                  </span>
                  <span className="pdf-month-rank-value">
                    {time.value} {time.unit}, {sessions} {sessions === 1 ? "sessione" : "sessioni"}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <PageFooter page={page} total={total} />
    </section>
  );
}

function FixedItem({ activity, stats, index }) {
  return (
    <article className="pdf-article">
      <span className="pdf-article-number">{index + 1}</span>
      <div className="pdf-article-body">
        <p className="pdf-article-label">Articolo {index + 1}</p>
        <h3 className="pdf-article-name">{activity.name}</h3>
        {activity.description && <p className="pdf-article-why">“{activity.description}”</p>}
        <div className="pdf-article-facts">
          <p>{formatGoal(activity.goal)}</p>
          <p>Energia {ENERGY[activityEnergy(activity)].label.toLowerCase()}</p>
        </div>
        <div className="pdf-article-track">
          <WeekStrip weeks={stats.weeks} target={stats.target} />
          <p className="pdf-streak">
            <StreakLine stats={stats} />
          </p>
        </div>
      </div>
    </article>
  );
}

function PassionItem({ activity, stats }) {
  return (
    <article className="pdf-passion">
      <h3 className="pdf-passion-name">{activity.name}</h3>
      {activity.description && <p className="pdf-passion-why">{activity.description}</p>}
      <p className="pdf-passion-goal">{formatGoal(activity.goal)}</p>
      <WeekStrip weeks={stats.weeks} target={stats.target} />
      <p className="pdf-streak">
        <StreakLine stats={stats} />
      </p>
    </article>
  );
}

function FlowItem({ item, name, dateLabel }) {
  if (item.kind === "section") {
    return (
      <header className="pdf-section">
        <h2 className="pdf-section-title">{item.title}</h2>
        <p className="pdf-section-lead">{item.lead}</p>
      </header>
    );
  }
  if (item.kind === "fixed") {
    return <FixedItem activity={item.activity} stats={item.stats} index={item.index} />;
  }
  if (item.kind === "passions") {
    return (
      <div className="pdf-passion-row">
        {item.items.map(({ activity, stats }) => (
          <PassionItem key={activity.id} activity={activity} stats={stats} />
        ))}
      </div>
    );
  }
  if (item.kind === "parked") {
    return (
      <ul className="pdf-parked">
        {item.items.map((activity) => (
          <li key={activity.id}>
            <span className="pdf-parked-name">{activity.name}</span>
            {activity.resumeNote && <span className="pdf-parked-note">Riparto da: {activity.resumeNote}</span>}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <footer className="pdf-closing">
      <p className="pdf-closing-quote">Ogni blocco chiuso è una promessa mantenuta.</p>
      <div className="pdf-signature">
        <span className="pdf-signature-name">{name || "Io"}</span>
        <span className="pdf-signature-line" />
        <span className="pdf-signature-date">{dateLabel}</span>
      </div>
    </footer>
  );
}

function buildFlow(activities, blocks, now, includeParked) {
  const withStats = (activity) => ({ activity, stats: activityStats(activity, blocks, now) });
  const fixed = activities.filter((activity) => activity.type === "fixed").map(withStats);
  const passions = activities
    .filter((activity) => activity.type === "passion" && activity.status !== "parked")
    .map(withStats);
  const parked = activities.filter((activity) => activity.type === "passion" && activity.status === "parked");

  const flow = [];
  if (fixed.length > 0) {
    flow.push({ kind: "section", title: "Non negoziabili", lead: "Promesse fatte a me stesso. Non si discutono." });
    fixed.forEach((entry, index) => flow.push({ kind: "fixed", ...entry, index }));
  }
  if (passions.length > 0) {
    flow.push({ kind: "section", title: "Quello che coltivo", lead: "Scelte libere, fatte con piacere." });
    for (let index = 0; index < passions.length; index += 2) {
      flow.push({ kind: "passions", items: passions.slice(index, index + 2) });
    }
  }
  if (includeParked && parked.length > 0) {
    flow.push({ kind: "section", title: "In pausa, non dimenticate", lead: "Ci tornerò, e so già da dove ripartire." });
    flow.push({ kind: "parked", items: parked });
  }
  flow.push({ kind: "closing" });
  return { flow, fixed, passions };
}

// Distribuisce i blocchi sulle pagine senza spezzarli; un titolo di sezione non resta mai da solo in fondo.
function paginate(flow, heights, gap) {
  const pages = [[]];
  let used = 0;
  flow.forEach((item, index) => {
    let need = heights[index] + (used > 0 ? gap : 0);
    if (item.kind === "section" && index + 1 < flow.length) {
      need += gap + heights[index + 1];
    }
    if (used > 0 && used + need > CONTENT_HEIGHT) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(index);
    used += heights[index] + (used > 0 ? gap : 0);
  });
  return pages;
}

function PdfDocument({ name, activities, blocks, now, includeParked, month, hue, onPagesReady }) {
  const measureRef = useRef(null);
  const pagesRef = useRef(null);
  const [pages, setPages] = useState(null);

  const today = toDateString(now);
  const weekStart = weekDates(today)[0];
  const { flow, fixed, passions } = buildFlow(activities, blocks, now, includeParked);
  const active = [...fixed, ...passions];
  const weekDone = active.reduce((sum, { stats }) => sum + Math.min(stats.thisWeek, stats.target), 0);
  const weekTarget = active.reduce((sum, { stats }) => sum + stats.target, 0);
  const ratio = weekTarget > 0 ? weekDone / weekTarget : 0;
  const sessions = active.reduce((sum, { stats }) => sum + stats.sessions, 0);
  const hours = formatHours(active.reduce((sum, { stats }) => sum + stats.minutes, 0));
  const bestStreak = active.reduce((max, { stats }) => Math.max(max, stats.streak), 0);
  const dateLabel = formatDate(today, { day: "numeric", month: "long", year: "numeric" });
  const title = name ? `Il patto di ${name}` : "Il mio patto";

  useLayoutEffect(() => {
    const items = [...measureRef.current.children];
    const gap = parseFloat(getComputedStyle(measureRef.current).rowGap) || 0;
    setPages(paginate(flow, items.map((node) => node.offsetHeight), gap));
    // Le misure servono una volta sola: il documento viene creato, catturato e poi buttato
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pages) {
      onPagesReady([...pagesRef.current.querySelectorAll(".pdf-page")]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  const monthData = month ? monthStats(month, activities, blocks, now) : null;
  const leadPages = monthData ? 2 : 1;
  const totalPages = pages ? pages.length + leadPages : leadPages;

  return (
    <div className="pdf-doc" style={{ "--h": hue }} ref={pagesRef}>
      <section className="pdf-page pdf-cover">
        <div className="pdf-cover-glow" />
        <div className="pdf-cover-ring">
          <Ring ratio={ratio} size={520} stroke={34} />
          <div className="pdf-cover-ring-label">
            <span className="pdf-cover-percent">{Math.round(ratio * 100)}%</span>
            <span>della settimana
              <br />
              già fatto</span>
          </div>
        </div>

        <div className="pdf-cover-text">
          <p className="pdf-cover-week">
            Settimana del {formatDate(weekStart, { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <h1 className="pdf-cover-title">{title}</h1>
          <p className="pdf-cover-lead">Quello a cui non rinuncio, e quello che scelgo di coltivare.</p>
        </div>

        <dl className="pdf-cover-stats">
          <div>
            <dt>Sessioni completate</dt>
            <dd>{sessions}</dd>
          </div>
          <div>
            <dt>Tempo dedicato</dt>
            <dd>
              {hours.value} <span>{hours.unit}</span>
            </dd>
          </div>
          <div>
            <dt>Serie migliore</dt>
            <dd>
              {bestStreak} <span>{bestStreak === 1 ? "settimana" : "settimane"}</span>
            </dd>
          </div>
        </dl>

        <PageFooter page={1} total={totalPages} />
      </section>

      {monthData && <MonthPage stats={monthData} page={2} total={totalPages} />}

      {pages ? (
        pages.map((indexes, pageIndex) => (
          <section key={pageIndex} className="pdf-page pdf-inner">
            <div className="pdf-flow">
              {indexes.map((index) => (
                <FlowItem key={index} item={flow[index]} name={name} dateLabel={dateLabel} />
              ))}
            </div>
            <PageFooter page={pageIndex + leadPages + 1} total={totalPages} />
          </section>
        ))
      ) : (
        <section className="pdf-page pdf-inner">
          <div className="pdf-flow" ref={measureRef}>
            {flow.map((item, index) => (
              <FlowItem key={index} item={item} name={name} dateLabel={dateLabel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PageFooter({ page, total }) {
  return (
    <footer className="pdf-footer">
      <span className="pdf-footer-brand">
        <svg width="18" height="18" viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="7" />
          <path d="M32 13 A19 19 0 1 1 13 32" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        </svg>
        LowCor
      </span>
      <span>
        Pagina {page} di {total}
      </span>
    </footer>
  );
}

export default PdfDocument;
