import { useEffect, useState } from "react";
import { loadData, saveData } from "./storage/storage";
import {
  addActivity,
  setFocus,
  parkActivity,
  resumeActivity,
} from "./logic/activities";
import {
  addBlock,
  toggleBlockDone,
  deleteBlock,
  getBlocksForDate,
} from "./logic/blocks";
import { incrementCardStat } from "./logic/cards";
import { addReminder, toggleReminder, deleteReminder } from "./logic/reminders";
import { toDateString } from "./logic/dates";
import { useNow } from "./hooks/useNow";
import DayView from "./components/DayView";
import ActivityList from "./components/ActivityList";
import Reminders from "./components/Reminders";
import Feed from "./components/Feed";
import "./App.css";

function getGreeting(hour) {
  if (hour < 13) {
    return "Buongiorno";
  }
  if (hour < 18) {
    return "Buon pomeriggio";
  }
  return "Buonasera";
}

function App() {
  const [data, setData] = useState(loadData);
  const now = useNow();
  const today = toDateString(now);
  const formattedDate = now.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  useEffect(() => {
    saveData(data);
  }, [data]);

  function updateField(field, update) {
    setData((current) => ({
      ...current,
      [field]: update(current[field]),
    }));
  }

  return (
    <div className="app">
      <main className="app-column">
        <header className="slot slot--header">
          <p className="app-greeting">{getGreeting(now.getHours())}</p>
          <h1 className="app-title">{formattedDate}</h1>
        </header>

        <div className="slot slot--day">
          <DayView
            now={now}
            date={today}
            blocks={getBlocksForDate(data.blocks, today)}
            activities={data.activities}
            onAdd={(block) => updateField("blocks", (blocks) => addBlock(blocks, block))}
            onToggle={(id) => updateField("blocks", (blocks) => toggleBlockDone(blocks, id))}
            onDelete={(id) => updateField("blocks", (blocks) => deleteBlock(blocks, id))}
          />
        </div>

        <div className="slot slot--activities">
          <ActivityList
            activities={data.activities}
            blocks={data.blocks}
            onAdd={(activity) =>
              updateField("activities", (activities) => addActivity(activities, activity))
            }
            onPark={(id, note) =>
              updateField("activities", (activities) => parkActivity(activities, id, note))
            }
            onResume={(id) =>
              updateField("activities", (activities) => resumeActivity(activities, id))
            }
            onFocus={(id) =>
              updateField("activities", (activities) => setFocus(activities, id))
            }
          />
        </div>
      </main>

      <aside className="app-column app-column--side">
        <div className="slot slot--feed">
          <Feed
            key={data.cards.length}
            cards={data.cards}
            activities={data.activities}
            onView={(id) => updateField("cards", (cards) => incrementCardStat(cards, id, "views"))}
            onComplete={(id) =>
              updateField("cards", (cards) => incrementCardStat(cards, id, "completed"))
            }
            onSkip={(id) => updateField("cards", (cards) => incrementCardStat(cards, id, "skipped"))}
          />
        </div>

        <div className="slot slot--reminders">
          <Reminders
            reminders={data.reminders}
            onAdd={(text) => updateField("reminders", (reminders) => addReminder(reminders, text))}
            onToggle={(id) => updateField("reminders", (reminders) => toggleReminder(reminders, id))}
            onDelete={(id) => updateField("reminders", (reminders) => deleteReminder(reminders, id))}
          />
        </div>
      </aside>
    </div>
  );
}

export default App;