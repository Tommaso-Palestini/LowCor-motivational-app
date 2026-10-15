import DayView from "./DayView";
import ActivityList from "./ActivityList";
import Reminders from "./Reminders";
import Feed from "./Feed";
import { getBlocksForDate } from "../logic/blocks";
import "./TodayView.css";

function getGreeting(hour) {
  if (hour < 13) {
    return "Buongiorno";
  }
  if (hour < 18) {
    return "Buon pomeriggio";
  }
  return "Buonasera";
}

function TodayView({ data, now, today, actions }) {
  const formattedDate = now.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="today">
      <div className="today-column">
        <header className="slot slot--header">
          <p className="today-greeting">{getGreeting(now.getHours())}</p>
          <h1 className="today-title">{formattedDate}</h1>
        </header>

        <div className="slot slot--day">
          <DayView
            now={now}
            date={today}
            blocks={getBlocksForDate(data.blocks, today)}
            activities={data.activities}
            onAdd={actions.addBlock}
            onToggle={actions.toggleBlock}
            onDelete={actions.deleteBlock}
            onFocusBlock={actions.focusBlock}
          />
        </div>

        <div className="slot slot--activities">
          <ActivityList
            activities={data.activities}
            blocks={data.blocks}
            onAdd={actions.addActivity}
            onPark={actions.parkActivity}
            onResume={actions.resumeActivity}
            onFocus={actions.setFocusActivity}
          />
        </div>
      </div>

      <aside className="today-column today-column--side">
        <div className="slot slot--feed">
          <Feed
            key={data.cards.length}
            cards={data.cards}
            activities={data.activities}
            onView={actions.viewCard}
            onComplete={actions.completeCard}
            onSkip={actions.skipCard}
          />
        </div>

        <div className="slot slot--reminders">
          <Reminders
            reminders={data.reminders}
            onAdd={actions.addReminder}
            onToggle={actions.toggleReminder}
            onDelete={actions.deleteReminder}
          />
        </div>
      </aside>
    </div>
  );
}

export default TodayView;
