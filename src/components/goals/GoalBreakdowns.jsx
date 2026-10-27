import TaskBreakdown from "../TaskBreakdown";

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

// Elenco degli obiettivi scritti nello schema, ognuno con il suo "Scomponi con AI".
// Con un pilastro aperto mostra le sue azioni; altrimenti obiettivo centrale e pilastri.
function GoalBreakdowns({ mandala, ai, pillarIndex = null }) {
  let items;
  if (pillarIndex !== null) {
    const pillar = mandala.pillars[pillarIndex];
    items = pillar.actions
      .filter((action) => action.text !== "")
      .map((action) => ({ kind: pillar.title || `Pilastro ${pillarIndex + 1}`, title: action.text }));
  } else {
    items = [
      ...(mandala.goal !== "" ? [{ kind: "Obiettivo", title: mandala.goal }] : []),
      ...mandala.pillars
        .map((pillar, index) => ({ kind: `Pilastro ${index + 1}`, title: pillar.title }))
        .filter((item) => item.title !== ""),
    ];
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="goal-breakdowns" aria-label="Scomponi gli obiettivi in micro-step">
      <h2 className="goal-breakdowns-title">Da dove comincio?</h2>
      <p className="goals-hint">Scomponi un obiettivo in 3-4 micro-step da meno di 10 minuti.</p>
      <ul className="goal-breakdowns-list">
        {items.map((item) => (
          <li key={`${item.kind}-${item.title}`} className="goal-breakdown-card">
            <div className="goal-breakdown-head">
              <span className="goal-breakdown-kind">{item.kind}</span>
              <p className="goal-breakdown-name">{item.title}</p>
            </div>
            <TaskBreakdown title={item.title} ai={ai} taskId={`goal-${slug(item.title)}`} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default GoalBreakdowns;
