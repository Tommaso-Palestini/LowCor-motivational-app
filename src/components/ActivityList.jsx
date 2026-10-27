import ActivityItem from "./ActivityItem";
import ActivityForm from "./ActivityForm";
import { calculateProgress } from "../logic/progress";
import "./Activities.css";
import { t } from "../i18n";

function ActivityList({ activities, blocks, onAdd, onPark, onResume, onFocus }) {
  const fixed = activities.filter(
    (activity) => activity.type === "fixed" && activity.status !== "parked"
  );
  const passions = activities
    .filter((activity) => activity.type === "passion" && activity.status !== "parked")
    .sort((a, b) => Number(b.status === "focus") - Number(a.status === "focus"));
  const parked = activities.filter((activity) => activity.status === "parked");

  const groups = [
    { title: t("Non negoziabili"), items: fixed },
    { title: t("Passioni"), items: passions },
    { title: t("Parcheggiate"), items: parked },
  ].filter((group) => group.items.length > 0);

  return (
    <section className="panel activities" aria-labelledby="activities-title">
      <h2 id="activities-title" className="section-title">
        {t("Attività")}
      </h2>

      {groups.map((group) => (
        <div key={group.title} className="activity-group">
          <h3 className="activity-group-title">{group.title}</h3>
          <ul className="activity-list">
            {group.items.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                progress={calculateProgress(activity, blocks)}
                onPark={onPark}
                onResume={onResume}
                onFocus={onFocus}
              />
            ))}
          </ul>
        </div>
      ))}

      <ActivityForm onAdd={onAdd} />
    </section>
  );
}

export default ActivityList;
