import { useRef, useState } from "react";
import { flushSync } from "react-dom";
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
import PillarFocus from "./PillarFocus";
import { IconSparkle, IconStop } from "../Icons";
import "./Goals.css";

const BLOCK_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const MORPH_NAME = "pillar-focus";

// Il pilastro cresce dalla sua posizione nella griglia fino al centro dello schermo (e ritorno).
// Dove la View Transitions API manca, o con "riduci movimento", il cambio è immediato.
function morph(update, source, findTarget, after) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduce) {
    flushSync(update);
    after?.();
    return;
  }
  let target = null;
  if (source) {
    source.style.viewTransitionName = MORPH_NAME;
  }
  document.documentElement.dataset.morph = "";
  const transition = document.startViewTransition(() => {
    if (source) {
      source.style.viewTransitionName = "";
    }
    flushSync(update);
    after?.();
    target = findTarget ? findTarget() : null;
    if (target) {
      target.style.viewTransitionName = MORPH_NAME;
    }
  });
  transition.finished.finally(() => {
    if (target) {
      target.style.viewTransitionName = "";
    }
    delete document.documentElement.dataset.morph;
  });
}

function GoalsView({ mandala, ai, actions, hidden }) {
  const isCompact = useMediaQuery("(max-width: 760px)");
  const [zoom, setZoom] = useState(null);
  const [focusAction, setFocusAction] = useState(null);
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

  function openPillar(pillarIndex, actionIndex = null, source = null) {
    morph(
      () => {
        setZoom(pillarIndex);
        setFocusAction(actionIndex);
      },
      source,
      null
    );
  }

  function closePillar() {
    const pillarIndex = zoom;
    const findAnchor = () =>
      document.querySelector(
        isCompact ? `[data-pillar-cell="${pillarIndex}"]` : `[data-pillar-block="${pillarIndex}"]`
      );
    // Il focus torna dove eri partito
    const returnFocus = () => {
      const anchor = findAnchor();
      (anchor?.matches("button") ? anchor : anchor?.querySelector("button"))?.focus({ preventScroll: true });
    };
    morph(() => setZoom(null), null, findAnchor, returnFocus);
  }

  function movePillar(step) {
    setFocusAction(null);
    setZoom((current) => (current + step + PILLAR_COUNT) % PILLAR_COUNT);
  }

  const isPillarThinking = (index) => Boolean(job) && (job.pillar === index || job.pillar === null);
  const isOpen = zoom !== null && !hidden;

  const board = isCompact ? (
    <div className="mandala-overview">
      <CenterBlock
        mandala={mandala}
        actions={actions}
        onOpenPillar={openPillar}
        isThinking={Boolean(job) && job.pillar === null}
      />
      <p className="goals-hint">Tocca un pilastro per scrivere le sue 8 azioni.</p>
    </div>
  ) : (
    <div className="mandala" role="group" aria-label="Schema 9 per 9">
      {BLOCK_POSITIONS.map((position) =>
        position === 4 ? (
          <CenterBlock
            key="center"
            mandala={mandala}
            actions={actions}
            onOpenPillar={openPillar}
            isThinking={Boolean(job) && job.pillar === null}
          />
        ) : (
          <PillarBlock
            key={position}
            mandala={mandala}
            pillarIndex={RING_POSITIONS.indexOf(position)}
            actions={actions}
            onOpen={openPillar}
            isThinking={isPillarThinking(RING_POSITIONS.indexOf(position))}
          />
        )
      )}
    </div>
  );

  return (
    <div className="goals-view" hidden={hidden}>
      <header className="goals-head" inert={isOpen}>
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

      <div className="goals-board" inert={isOpen}>
        {board}
        <GoalBreakdowns mandala={mandala} ai={ai} />
      </div>

      {isOpen && (
        <PillarFocus
          mandala={mandala}
          pillarIndex={zoom}
          focusAction={focusAction}
          ai={ai}
          actions={actions}
          canFill={ai.isReady && hasGoal && !job}
          isThinking={isPillarThinking(zoom)}
          onFill={() => fillWithAi(zoom)}
          onMove={movePillar}
          onClose={closePillar}
        />
      )}
    </div>
  );
}

export default GoalsView;
