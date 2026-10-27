import { useState } from "react";
import ActivityCard from "./ActivityCard";
import ActivityEditor from "./ActivityEditor";
import { IconPlus } from "../Icons";
import "./Activities.css";

const GROUPS = [
  {
    id: "fixed",
    title: "Non negoziabili",
    lead: "Le promesse fatte a te stesso. Si fanno, punto.",
    filter: (activity) => activity.type === "fixed",
  },
  {
    id: "passion",
    title: "Passioni",
    lead: "Quello che scegli di coltivare. Puoi metterle in pausa quando serve.",
    filter: (activity) => activity.type === "passion" && activity.status !== "parked",
  },
  {
    id: "parked",
    title: "Parcheggiate",
    lead: "In pausa, con una nota per ripartire da dove eri.",
    filter: (activity) => activity.type === "passion" && activity.status === "parked",
  },
];

function ActivitiesView({ data, now, actions }) {
  const [isCreating, setIsCreating] = useState(false);
  const { activities, blocks } = data;

  return (
    <div className="acts">
      <header className="acts-head">
        <div className="acts-intro">
          <p className="today-greeting">Attività</p>
          <h1 className="acts-title">Quello che conta per te</h1>
          <p className="acts-lead">
            Qui gestisci ogni attività da vicino: cosa significa per te, quanto spesso, quanta energia chiede e come sta
            andando nelle ultime settimane.
          </p>
        </div>
        <div className="acts-tools">
          <button type="button" className="button button--primary" onClick={() => setIsCreating(true)} disabled={isCreating}>
            <IconPlus />
            Nuova attività
          </button>
        </div>
      </header>

      {isCreating && (
        <section className="act-card act-card--new" aria-label="Nuova attività">
          <ActivityEditor
            submitLabel="Aggiungi attività"
            onCancel={() => setIsCreating(false)}
            onSubmit={(activity) => {
              actions.addActivity(activity);
              setIsCreating(false);
            }}
          />
        </section>
      )}

      {activities.length === 0 && !isCreating && (
        <p className="acts-empty">Nessuna attività ancora. Comincia da una cosa a cui non vuoi rinunciare.</p>
      )}

      {GROUPS.map((group) => {
        const items = activities.filter(group.filter);
        if (items.length === 0) {
          return null;
        }
        return (
          <section key={group.id} className={`acts-group acts-group--${group.id}`} aria-labelledby={`acts-${group.id}`}>
            <div className="acts-group-head">
              <h2 id={`acts-${group.id}`} className="section-title">
                {group.title} <span className="acts-group-count">{items.length}</span>
              </h2>
              <p className="acts-group-lead">{group.lead}</p>
            </div>
            <ul className="acts-list">
              {items.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} blocks={blocks} now={now} actions={actions} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export default ActivitiesView;
