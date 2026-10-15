import { useEffect, useRef, useState } from "react";
import { loadData, saveData } from "./storage/storage";
import {
  addActivity,
  findActivityByName,
  setFocus,
  parkActivity,
  resumeActivity,
} from "./logic/activities";
import {
  addBlock,
  addBlocks,
  deleteBlock,
  deleteSeries,
  updateBlock,
} from "./logic/blocks";
import { addCards, incrementCardStat } from "./logic/cards";
import { addReminder, toggleReminder, deleteReminder } from "./logic/reminders";
import { toDateString } from "./logic/dates";
import { minutesOfDay, timeToMinutes } from "./logic/time";
import { calculateProgress } from "./logic/progress";
import { AURA, resolveBlockDone } from "./logic/aura";
import { planWeek } from "./logic/planner";
import { copyPreviousWeek } from "./logic/calendar";
import {
  createFocus,
  pauseFocus,
  resumeFocus,
  settleFocus,
  MIN_SAVED_MINUTES,
} from "./logic/focus";
import {
  createMandala,
  resolveActionToggle,
  setActionText,
  setPillarTitle,
} from "./logic/mandala";
import { requestCards } from "./logic/aiTasks";
import { useNow } from "./hooks/useNow";
import { useHueWave } from "./hooks/useHueWave";
import { useOllama } from "./hooks/useOllama";
import Background from "./components/Background";
import TopBar from "./components/TopBar";
import { VIEWS } from "./logic/views";
import TodayView from "./components/TodayView";
import CalendarView from "./components/calendar/CalendarView";
import GoalsView from "./components/goals/GoalsView";
import BrainstormView from "./components/brainstorm/BrainstormView";
import FocusMode from "./components/FocusMode";
import Announcer from "./components/Announcer";
import Toast from "./components/Toast";
import "./App.css";

const HISTORY_LIMIT = 30;

function isTypingTarget(target) {
  return ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
}

function App() {
  const [data, setData] = useState(loadData);
  const [view, setView] = useState("today");
  const [isFocusOpen, setIsFocusOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [toast, setToast] = useState(null);
  const [isGeneratingCards, setIsGeneratingCards] = useState(false);
  const historyRef = useRef([]);
  const now = useNow();
  const today = toDateString(now);
  const ai = useOllama(data.settings.aiUrl, data.settings.aiModel);

  useHueWave(data.settings);

  useEffect(() => {
    saveData(data);
  }, [data]);

  // ---- Storia per annullare (Ctrl+Z) ----

  function snapshot() {
    historyRef.current = [...historyRef.current.slice(-(HISTORY_LIMIT - 1)), data];
  }

  function commit(update, { record = true } = {}) {
    if (record) {
      snapshot();
    }
    setData(update);
  }

  function updateField(field, update, options) {
    commit((current) => ({ ...current, [field]: update(current[field]) }), options);
  }

  function undo() {
    const previous = historyRef.current.pop();
    if (!previous) {
      showToast("Niente da annullare");
      return;
    }
    // Ripristina solo i contenuti: impostazioni, carte del feed, chat e focus restano come sono.
    setData((current) => ({
      ...current,
      activities: previous.activities,
      blocks: previous.blocks,
      reminders: previous.reminders,
      mandala: previous.mandala,
      aura: previous.aura,
    }));
    showToast("Modifica annullata");
  }

  function showToast(message, undoable = false) {
    setToast({ id: Date.now(), message, undo: undoable });
  }

  // ---- Annunci full gas ----

  function announce(list) {
    if (!data.settings.fullGas || list.length === 0) {
      return;
    }
    const stamped = list.map((item, index) => ({ ...item, id: `${Date.now()}-${index}` }));
    // Gli annunci piccoli in coda si sostituiscono a vicenda: se spunti tante cose di fila
    // non resti a guardare dieci annunci uno dopo l'altro.
    setAnnouncements((current) =>
      stamped.reduce((queue, item) => {
        const last = queue[queue.length - 1];
        if (item.size === "small" && queue.length > 1 && last.size === "small") {
          return [...queue.slice(0, -1), item];
        }
        return [...queue, item];
      }, current)
    );
  }

  function nextAnnouncement() {
    setAnnouncements((current) => current.slice(1));
  }

  // ---- Blocchi ----

  function setBlockDoneWithRewards(blockId, done) {
    const result = resolveBlockDone({
      blocks: data.blocks,
      activities: data.activities,
      blockId,
      done,
      today,
      now: new Date(),
    });
    commit((current) => ({
      ...current,
      blocks: result.nextBlocks,
      aura: Math.max(current.aura + result.auraDelta, 0),
    }));
    announce(result.announcements);
  }

  function toggleBlock(blockId) {
    const block = data.blocks.find((item) => item.id === blockId);
    if (block) {
      setBlockDoneWithRewards(blockId, !block.done);
    }
  }

  function createBlocks(drafts) {
    updateField("blocks", (blocks) => addBlocks(blocks, drafts));
    if (drafts.length > 1) {
      showToast(`${drafts.length} blocchi creati`, true);
    }
  }

  function removeBlock(blockId) {
    updateField("blocks", (blocks) => deleteBlock(blocks, blockId));
    showToast("Blocco eliminato", true);
  }

  function removeSeries(seriesId) {
    const count = data.blocks.filter((block) => block.seriesId === seriesId).length;
    updateField("blocks", (blocks) => deleteSeries(blocks, seriesId));
    showToast(`Serie eliminata: ${count} blocchi`, true);
  }

  function handlePlanWeek(weekStart) {
    const { created, unplaced } = planWeek(data.activities, data.blocks, weekStart, new Date());
    if (created.length === 0) {
      showToast(unplaced > 0 ? "Non ci sono buchi liberi per le sessioni mancanti" : "Niente da pianificare");
      return;
    }
    updateField("blocks", (blocks) => addBlocks(blocks, created));
    const leftover = unplaced > 0 ? `, ${unplaced} non entrano` : "";
    showToast(`${created.length} sessioni piazzate${leftover}`, true);
    announce([{ title: "Settimana pianificata", sub: `${created.length} sessioni nei buchi liberi`, tone: "planned" }]);
  }

  function handleCopyWeek(weekStart) {
    const copies = copyPreviousWeek(data.blocks, weekStart);
    if (copies.length === 0) {
      showToast("La settimana prima è vuota o già copiata");
      return;
    }
    updateField("blocks", (blocks) => addBlocks(blocks, copies));
    showToast(`${copies.length} blocchi copiati dalla settimana prima`, true);
  }

  // ---- AI: carte del feed ----

  async function generateCards({ silent = false } = {}) {
    if (isGeneratingCards || !ai.isReady) {
      return;
    }
    setIsGeneratingCards(true);
    try {
      const drafts = await requestCards({
        ai,
        activities: data.activities,
        cards: data.cards,
        mandala: data.mandala,
      });
      const { added } = addCards(data.cards, drafts);
      commit((current) => ({ ...current, cards: addCards(current.cards, drafts).cards }), { record: false });
      if (!silent) {
        showToast(added > 0 ? `${added} carte nuove in fondo al feed` : "Nessuna carta nuova questa volta, riprova");
      }
    } catch (error) {
      showToast(error.message);
    }
    setIsGeneratingCards(false);
  }

  // ---- AI: brainstorming ----

  // Trova l'attività per nome o la crea, e restituisce attività aggiornate e id.
  function ensureActivity(activities, name, goal) {
    const existing = findActivityByName(activities, name);
    if (existing) {
      return { activities, activityId: existing.id };
    }
    const activityId = crypto.randomUUID();
    return {
      activityId,
      activities: addActivity(activities, { id: activityId, name, type: "passion", ...goal }),
    };
  }

  function addProposals(proposals) {
    commit((current) => {
      let activities = current.activities;
      const drafts = proposals.map((proposal) => {
        const result = ensureActivity(activities, proposal.activityName, { amount: 1, period: "week" });
        activities = result.activities;
        return { date: proposal.date, start: proposal.start, end: proposal.end, activityId: result.activityId };
      });
      return { ...current, activities, blocks: addBlocks(current.blocks, drafts) };
    });
    showToast(proposals.length === 1 ? "Blocco aggiunto al calendario" : `${proposals.length} blocchi aggiunti`, true);
  }

  function adoptIdea(idea) {
    commit((current) => {
      const { activities, activityId } = ensureActivity(current.activities, idea.title, { amount: 3, period: "week" });
      const { cards } = addCards(current.cards, [
        { activityId, type: "micro-task", text: idea.firstStep, source: "ai" },
      ]);
      return { ...current, activities, cards };
    });
    showToast(`${idea.title} è tra le tue attività, il primo passo è nel feed`, true);
  }

  // ---- Schema 9×9 ----

  function toggleMandalaAction(pillarIndex, actionIndex) {
    const result = resolveActionToggle(data.mandala, pillarIndex, actionIndex);
    commit((current) => ({
      ...current,
      mandala: result.next,
      aura: Math.max(current.aura + result.auraDelta, 0),
    }));
    announce(result.announcements);
  }

  function clearMandala() {
    updateField("mandala", () => createMandala());
    showToast("Schema svuotato", true);
  }

  // ---- Focus ----

  function startFocus(options) {
    commit((current) => ({ ...current, focus: createFocus(options) }), { record: false });
    setIsFocusOpen(true);
  }

  function focusBlock(block) {
    const minutes = Math.max(timeToMinutes(block.end) - minutesOfDay(new Date()), MIN_SAVED_MINUTES);
    startFocus({ activityId: block.activityId, blockId: block.id, minutes });
  }

  function finishFocus(completed) {
    const session = data.focus;
    setIsFocusOpen(false);
    if (!session) {
      return;
    }

    const result = settleFocus(session, data.blocks, Date.now());
    if (!result.saved) {
      commit((current) => ({ ...current, focus: null }), { record: false });
      showToast(`Sessione troppo breve: sotto i ${MIN_SAVED_MINUTES} minuti non viene salvata`);
      return;
    }

    const activity = data.activities.find((item) => item.id === session.activityId);
    let aura = result.aura;
    const list = [
      {
        title: completed ? "Focus completato" : "Sessione salvata",
        sub: `${result.minutes} minuti su ${activity ? activity.name : "focus"}`,
        aura: result.aura,
        tone: "focus",
      },
    ];

    if (activity) {
      const before = calculateProgress(activity, data.blocks, new Date());
      const after = calculateProgress(activity, result.blocks, new Date());
      if (!before.completed && after.completed) {
        aura += AURA.goal;
        list.push({
          title: "Obiettivo centrato",
          sub: `${activity.name}, ${after.done} su ${after.target}`,
          aura: AURA.goal,
          tone: "done",
        });
      }
    }

    commit((current) => ({
      ...current,
      focus: null,
      blocks: result.blocks,
      aura: current.aura + aura,
    }));
    announce(list);
  }

  // ---- Scorciatoie globali ----

  useEffect(() => {
    function handleKey(event) {
      if (isTypingTarget(event.target)) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey || document.querySelector("dialog[open]") || isFocusOpen) {
        return;
      }
      const viewIndex = Number(event.key) - 1;
      if (event.key.toLowerCase() === "f") {
        setIsFocusOpen(true);
      } else if (VIEWS[viewIndex]) {
        setView(VIEWS[viewIndex].id);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  });

  const actions = {
    addBlock: (block) => updateField("blocks", (blocks) => addBlock(blocks, block)),
    createBlocks,
    updateBlock: (id, changes) => updateField("blocks", (blocks) => updateBlock(blocks, id, changes)),
    moveBlock: (id, changes) => updateField("blocks", (blocks) => updateBlock(blocks, id, changes)),
    toggleBlock,
    deleteBlock: removeBlock,
    deleteSeries: removeSeries,
    planWeek: handlePlanWeek,
    copyWeek: handleCopyWeek,
    focusBlock,
    addActivity: (activity) => updateField("activities", (activities) => addActivity(activities, activity)),
    parkActivity: (id, note) => updateField("activities", (activities) => parkActivity(activities, id, note)),
    resumeActivity: (id) => updateField("activities", (activities) => resumeActivity(activities, id)),
    setFocusActivity: (id) => updateField("activities", (activities) => setFocus(activities, id)),
    viewCard: (id) => updateField("cards", (cards) => incrementCardStat(cards, id, "views"), { record: false }),
    completeCard: (id) =>
      updateField("cards", (cards) => incrementCardStat(cards, id, "completed"), { record: false }),
    skipCard: (id) => updateField("cards", (cards) => incrementCardStat(cards, id, "skipped"), { record: false }),
    generateCards,
    addReminder: (text) => updateField("reminders", (reminders) => addReminder(reminders, text)),
    toggleReminder: (id) => updateField("reminders", (reminders) => toggleReminder(reminders, id)),
    deleteReminder: (id) => updateField("reminders", (reminders) => deleteReminder(reminders, id)),
    setBrainstorm: (mode, messages) =>
      commit((current) => ({ ...current, brainstorm: { ...current.brainstorm, [mode]: messages } }), {
        record: false,
      }),
    addProposal: (proposal) => addProposals([proposal]),
    addProposals,
    adoptIdea,
    setMandala: (update) => updateField("mandala", update),
    setPillarTitle: (index, title) => updateField("mandala", (mandala) => setPillarTitle(mandala, index, title)),
    setActionText: (pillarIndex, actionIndex, text) =>
      updateField("mandala", (mandala) => setActionText(mandala, pillarIndex, actionIndex, text)),
    toggleAction: toggleMandalaAction,
    applyMandala: (update) => updateField("mandala", update, { record: false }),
    snapshot,
    clearMandala,
    notify: (message) => showToast(message),
  };

  let page = null;
  if (view === "today") {
    page = (
      <TodayView
        data={data}
        now={now}
        today={today}
        actions={actions}
        ai={ai}
        isGeneratingCards={isGeneratingCards}
      />
    );
  } else if (view === "calendar") {
    page = <CalendarView data={data} now={now} actions={actions} />;
  }

  return (
    <>
      <Background animated={data.settings.lava} />

      <div className="app">
        <TopBar
          view={view}
          onViewChange={setView}
          aura={data.aura}
          hasFocus={Boolean(data.focus)}
          onOpenFocus={() => setIsFocusOpen(true)}
          settings={data.settings}
          onSettingsChange={(settings) => commit((current) => ({ ...current, settings }), { record: false })}
          ai={ai}
        />

        <main className="app-main">
          {page && (
            <div key={view} className="app-page">
              {page}
            </div>
          )}
          {/* Obiettivi e Idee restano montati anche quando sono nascosti:
              se l'AI sta lavorando puoi cambiare sezione e la risposta arriva lo stesso. */}
          <GoalsView mandala={data.mandala} ai={ai} actions={actions} hidden={view !== "goals"} />
          <BrainstormView data={data} now={now} ai={ai} actions={actions} hidden={view !== "ideas"} />
        </main>
      </div>

      <FocusMode
        focus={data.focus}
        isOpen={isFocusOpen}
        activities={data.activities}
        blocks={data.blocks}
        onStart={startFocus}
        onPause={() => commit((current) => ({ ...current, focus: pauseFocus(current.focus) }), { record: false })}
        onResume={() => commit((current) => ({ ...current, focus: resumeFocus(current.focus) }), { record: false })}
        onFinish={finishFocus}
        onCancel={() => {
          commit((current) => ({ ...current, focus: null }), { record: false });
          setIsFocusOpen(false);
          showToast("Sessione annullata");
        }}
        onOpen={() => setIsFocusOpen(true)}
        onClose={() => setIsFocusOpen(false)}
      />

      <Announcer announcement={announcements[0] || null} onDone={nextAnnouncement} />
      <Toast
        toast={toast}
        onUndo={undo}
        onClose={() => setToast(null)}
      />
    </>
  );
}

export default App;
