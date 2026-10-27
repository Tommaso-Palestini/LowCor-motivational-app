import { useRef, useState } from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import {
  ACTION_COUNT,
  PILLAR_COUNT,
  RING_POSITIONS,
  emptyActionCount,
  fillPillarActions,
  fillPillarTitles,
  mandalaProgress,
} from "../../logic/mandala";
import { suggestActions, suggestPillars } from "../../logic/aiTasks";
import { CenterBlock, PillarBlock } from "./MandalaBlock";
import GoalBreakdowns from "./GoalBreakdowns";
import { IconChevronLeft, IconChevronRight, IconGrid, IconSparkle, IconStop } from "../Icons";
import "./Goals.css";

const BLOCK_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function GoalsView({ mandala, ai, actions, hidden }) {
  const isCompact = useMediaQuery("(max-width: 760px)");
  const [zoom, setZoom] = useState(null);
  const [job, setJob] = useState(null);
  const controllerRef = useRef(null);

  const progress = mandalaProgress(mandala);
  const hasGoal = mandala.goal !== "";
  const hasEmpty =
    mandala.pillars.some((pillar) => pillar.title === "") ||
    mandala.pillars.some((pillar) => pillar.title !== "" && emptyActionCount(pillar) > 0);
  const isEmpty = !hasGoal && progress.written === 0 && mandala.pillars.every((pillar) => pillar.title === "");

  // Riempie con l'AI solo le caselle vuote: prima i pilastri, poi le azioni pilastro per pilastro,
  // così vedi lo schema che si compone mentre l'AI lavora.
  async function fillWithAi(onlyPillar = null) {
    if (!ai.isReady || !hasGoal || job) {
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    actions.snapshot();
    let local = mandala;

    try {
      if (onlyPillar === null && local.pillars.some((pillar) => pillar.title === "")) {
        setJob({ pillar: null, label: "Penso ai pilastri" });
        const titles = await suggestPillars({ ai, mandala: local, signal: controller.signal });
        local = fillPillarTitles(local, titles);
        actions.applyMandala((current) => fillPillarTitles(current, titles));
      }

      const targets =
        onlyPillar === null ? Array.from({ length: PILLAR_COUNT }, (_, index) => index) : [onlyPillar];

      for (const pillarIndex of targets) {
        const pillar = local.pillars[pillarIndex];
        if (pillar.title === "" || emptyActionCount(pillar) === 0) {
          continue;
        }
        setJob({ pillar: pillarIndex, label: `Azioni per ${pillar.title}` });
        const texts = await suggestActions({ ai, mandala: local, pillarIndex, signal: controller.signal });
        local = fillPillarActions(local, pillarIndex, texts);
        actions.applyMandala((current) => fillPillarActions(current, pillarIndex, texts));
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        actions.notify(error.message);
      }
    }
    setJob(null);
    controllerRef.current = null;
  }

  function stop() {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  }

  function movePillar(step) {
    setZoom((current) => (current + step + PILLAR_COUNT) % PILLAR_COUNT);
  }

  const isPillarThinking = (index) => Boolean(job) && (job.pillar === index || job.pillar === null);

  let board;
  if (isCompact && zoom !== null) {
    const pillar = mandala.pillars[zoom];
    board = (
      <div className="mandala-zoom">
        <div className="mandala-zoom-nav">
          <button type="button" className="icon-button" onClick={() => movePillar(-1)} aria-label="Pilastro precedente">
            <IconChevronLeft />
          </button>
          <p>
            Pilastro {zoom + 1} di {PILLAR_COUNT}
          </p>
          <button type="button" className="icon-button" onClick={() => movePillar(1)} aria-label="Pilastro successivo">
            <IconChevronRight />
          </button>
        </div>
        <PillarBlock mandala={mandala} pillarIndex={zoom} actions={actions} isThinking={isPillarThinking(zoom)} large />
        <div className="mandala-zoom-actions">
          <button type="button" className="button button--ghost" onClick={() => setZoom(null)}>
            <IconGrid />
            Torna allo schema
          </button>
          {ai.isReady && hasGoal && pillar.title !== "" && emptyActionCount(pillar) > 0 && !job && (
            <button type="button" className="button button--quiet" onClick={() => fillWithAi(zoom)}>
              <IconSparkle />
              Suggerisci azioni
            </button>
          )}
        </div>
      </div>
    );
  } else if (isCompact) {
    board = (
      <div className="mandala-overview">
        <CenterBlock mandala={mandala} actions={actions} onOpenPillar={setZoom} isThinking={Boolean(job) && job.pillar === null} />
        <p className="goals-hint">Tocca un pilastro per scrivere le sue 8 azioni.</p>
      </div>
    );
  } else {
    board = (
      <div className="mandala" role="group" aria-label="Schema 9 per 9">
        {BLOCK_POSITIONS.map((position) =>
          position === 4 ? (
            <CenterBlock
              key="center"
              mandala={mandala}
              actions={actions}
              isThinking={Boolean(job) && job.pillar === null}
            />
          ) : (
            <PillarBlock
              key={position}
              mandala={mandala}
              pillarIndex={RING_POSITIONS.indexOf(position)}
              actions={actions}
              isThinking={isPillarThinking(RING_POSITIONS.indexOf(position))}
            />
          )
        )}
      </div>
    );
  }

  return (
    <div className="goals-view" hidden={hidden}>
      <header className="goals-head">
        <div className="goals-intro">
          <p className="today-greeting">Obiettivi</p>
          <h1 className="goals-title">Lo schema 9×9</h1>
          <p className="goals-lead">
            Quello che Shohei Ohtani ha compilato da liceale (metodo Harada): l'obiettivo al centro, otto pilastri intorno e
            otto azioni concrete per ogni pilastro. Spunta le azioni man mano che diventano abitudine.
          </p>
        </div>

        <div className="goals-side">
          <dl className="goals-stats">
            <div>
              <dt>Azioni fatte</dt>
              <dd>
                {progress.done}
                <span>/{progress.written || PILLAR_COUNT * ACTION_COUNT}</span>
              </dd>
            </div>
            <div>
              <dt>Pilastri chiusi</dt>
              <dd>
                {progress.pillarsDone}
                <span>/{PILLAR_COUNT}</span>
              </dd>
            </div>
          </dl>

          <div className="goals-actions">
            {job ? (
              <button type="button" className="button button--ghost goals-ai-running" onClick={stop}>
                <IconStop />
                {job.label}… ferma
              </button>
            ) : (
              ai.isReady && (
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => fillWithAi()}
                  disabled={!hasGoal || !hasEmpty}
                  title={hasGoal ? "Riempie solo le caselle vuote" : "Scrivi prima l'obiettivo al centro"}
                >
                  <IconSparkle />
                  Completa con l'AI
                </button>
              )
            )}
            {!isEmpty && !job && (
              <button type="button" className="button button--quiet" onClick={actions.clearMandala}>
                Svuota
              </button>
            )}
          </div>
          {!hasGoal && <p className="goals-hint">Comincia dal centro: scrivi l'obiettivo grande.</p>}
        </div>
      </header>

      {board}

      <GoalBreakdowns mandala={mandala} ai={ai} pillarIndex={isCompact ? zoom : null} />
    </div>
  );
}

export default GoalsView;
