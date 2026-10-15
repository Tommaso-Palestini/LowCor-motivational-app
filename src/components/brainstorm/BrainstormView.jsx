import { useEffect, useRef, useState } from "react";
import { brainstormExplore, brainstormFit } from "../../logic/aiTasks";
import { readPartialField } from "../../logic/ai";
import { getWeekSummary } from "../../logic/planner";
import { getWeekRange } from "../../logic/dates";
import BrainstormMessage from "./BrainstormMessage";
import { IconBulb, IconCalendarPlus, IconSend, IconStop } from "../Icons";
import "./Brainstorm.css";

const MODES = {
  fit: {
    label: "Incastra",
    icon: IconCalendarPlus,
    title: "Fai entrare tutto nella settimana",
    lead: "Dimmi cosa vuoi fare e ti propongo dove metterlo, guardando i buchi liberi del calendario. Un tocco e il blocco è dentro.",
    placeholder: "Es. devo infilare 3 sessioni di inglese e la spesa",
  },
  explore: {
    label: "Esplora",
    icon: IconBulb,
    title: "Trova cosa fare o imparare",
    lead: "Idee nuove partendo da quello che ti piace già, ognuna con un primo passo da dieci minuti. Se una ti prende, diventa un'attività.",
    placeholder: "Es. voglio qualcosa di nuovo da imparare in due settimane",
  },
};

function getSuggestions(mode, data, now) {
  const active = data.activities.filter((activity) => activity.status !== "parked");
  if (mode === "fit") {
    const { start } = getWeekRange(now);
    const missing = getWeekSummary(data.activities, data.blocks, start, now).find((row) => row.missing > 0);
    return [
      missing
        ? `Dove infilo ${missing.missing === 1 ? "la sessione" : `le ${missing.missing} sessioni`} di ${missing.activity.name} che mancano?`
        : "Ho un pomeriggio libero, come lo riempio?",
      "Organizzami il resto della giornata di oggi",
      "Domani voglio fare tanto ma senza scoppiare",
    ];
  }
  const passions = active.filter((activity) => activity.type === "passion");
  const pair = passions.length >= 2 ? passions : active;
  return [
    pair.length >= 2
      ? `Un progetto che unisca ${pair[0].name} e ${pair[1].name}`
      : "Un progetto piccolo da finire in una settimana",
    data.mandala.goal ? `Cosa posso fare questa settimana per: ${data.mandala.goal}` : "Cosa posso imparare in sette giorni?",
    "Qualcosa da fare nei tempi morti al posto dei reel",
  ];
}

function Thinking({ partial }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timerId = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="bubble bubble--assistant bubble--thinking" role="status">
      {partial ? (
        <p>
          {partial}
          <span className="caret" aria-hidden="true" />
        </p>
      ) : (
        <p className="thinking">
          <span className="thinking-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          Ci penso{seconds >= 3 ? `, ${seconds} s` : ""}
          {seconds >= 15 && <span className="thinking-note">Su CPU il primo giro è il più lento</span>}
        </p>
      )}
    </div>
  );
}

function BrainstormView({ data, now, ai, actions, hidden }) {
  const [mode, setMode] = useState("fit");
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(null);
  const controllerRef = useRef(null);
  const threadEndRef = useRef(null);

  const messages = data.brainstorm[mode];
  const config = MODES[mode];
  const isBusy = pending !== null;
  const canSend = ai.isReady && !isBusy && draft.trim() !== "";
  const pendingHere = pending && pending.mode === mode;

  useEffect(() => {
    if (threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [messages.length, pendingHere]);

  async function send(text) {
    const trimmed = text.trim();
    if (trimmed === "" || isBusy || !ai.isReady) {
      return;
    }
    const requestMode = mode;
    const history = [...messages, { id: crypto.randomUUID(), role: "user", text: trimmed }];
    actions.setBrainstorm(requestMode, history);
    setDraft("");

    const controller = new AbortController();
    controllerRef.current = controller;
    setPending({ mode: requestMode, partial: "" });

    const run = requestMode === "fit" ? brainstormFit : brainstormExplore;
    let reply;
    try {
      const result = await run({
        ai,
        data,
        now,
        history,
        signal: controller.signal,
        onReply: (raw) => {
          const partial = readPartialField(raw, "reply");
          setPending((current) => (current ? { ...current, partial } : current));
        },
      });
      reply = {
        text: result.reply || "Ecco cosa ti propongo.",
        proposals: result.proposals,
        ideas: result.ideas,
      };
    } catch (error) {
      reply =
        error.name === "AbortError"
          ? { text: "Ok, mi fermo qui.", stopped: true }
          : { text: error.message, error: true };
    }
    actions.setBrainstorm(requestMode, [...history, { id: crypto.randomUUID(), role: "assistant", ...reply }]);
    setPending(null);
    controllerRef.current = null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    send(draft);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send(draft);
    }
  }

  function stop() {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  }

  return (
    <div className="brainstorm" hidden={hidden}>
      <header className="brainstorm-head">
        <div>
          <p className="today-greeting">Brainstorming</p>
          <h1 className="brainstorm-title">{config.title}</h1>
        </div>
        <div className="brainstorm-tools">
          <div className="segmented" role="group" aria-label="Modalità">
            {Object.entries(MODES).map(([id, item]) => (
              <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}>
                {item.label}
              </button>
            ))}
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              className="button button--quiet"
              onClick={() => actions.setBrainstorm(mode, [])}
              disabled={pendingHere}
            >
              Nuova chat
            </button>
          )}
        </div>
      </header>

      {!ai.isReady && (
        <div className="brainstorm-offline">
          <p className="settings-name">L'AI locale non è collegata</p>
          <p>
            Il brainstorming usa Ollama sul tuo computer, niente cloud. Avvialo con <code>ollama serve</code> e scarica un
            modello con <code>ollama pull llama3.2</code>: l'app se ne accorge da sola entro qualche secondo.
          </p>
        </div>
      )}

      <section className="panel brainstorm-thread" aria-label="Conversazione">
        {messages.length === 0 && !pendingHere ? (
          <div className="brainstorm-empty">
            <span className="brainstorm-empty-icon" aria-hidden="true">
              <config.icon />
            </span>
            <p className="brainstorm-lead">{config.lead}</p>
            <div className="brainstorm-suggestions">
              {getSuggestions(mode, data, now).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="suggestion"
                  disabled={!ai.isReady || isBusy}
                  onClick={() => send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="brainstorm-messages">
            {messages.map((message) => (
              <li key={message.id}>
                <BrainstormMessage message={message} data={data} actions={actions} />
              </li>
            ))}
            {pendingHere && (
              <li>
                <Thinking partial={pending.partial} />
              </li>
            )}
          </ol>
        )}
        <div ref={threadEndRef} />
      </section>

      <form className="composer" onSubmit={handleSubmit}>
        <textarea
          className="composer-input"
          rows={1}
          value={draft}
          placeholder={ai.isReady ? config.placeholder : "Collega Ollama per iniziare"}
          disabled={!ai.isReady}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Scrivi all'AI"
        />
        {isBusy ? (
          <button type="button" className="icon-button icon-button--filled" onClick={stop} aria-label="Ferma la risposta">
            <IconStop />
          </button>
        ) : (
          <button type="submit" className="icon-button icon-button--filled" disabled={!canSend} aria-label="Invia">
            <IconSend />
          </button>
        )}
      </form>
    </div>
  );
}

export default BrainstormView;
