import { useEffect, useRef, useState } from "react";
import { decomposeTask } from "../logic/aiTasks";
import { IconCheck, IconRepeat, IconSparkle, IconSpinner } from "./Icons";
import "./TaskBreakdown.css";

const STORAGE_PREFIX = "lowcor-breakdown-";

function loadSavedSteps(taskId) {
  if (!taskId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${taskId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSteps(taskId, steps) {
  if (!taskId) return;
  try {
    if (steps && steps.length > 0) {
      localStorage.setItem(`${STORAGE_PREFIX}${taskId}`, JSON.stringify(steps));
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}${taskId}`);
    }
  } catch (err) {
    console.error("Could not save breakdown steps:", err);
  }
}

function TaskBreakdown({ title, ai, taskId, className = "" }) {
  const [steps, setSteps] = useState(() => loadSavedSteps(taskId) || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(() => Boolean(loadSavedSteps(taskId)?.length));
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  async function handleDecompose(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (isLoading || !title) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setIsOpen(true);

    try {
      const generatedSteps = await decomposeTask({
        ai,
        title,
        signal: controller.signal,
      });

      if (generatedSteps && generatedSteps.length > 0) {
        setSteps(generatedSteps);
        saveSteps(taskId, generatedSteps);
      } else {
        setError("Nessun micro-step generato. Riprova.");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Errore durante la scomposizione");
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }

  function handleToggleStep(stepId, event) {
    if (event) {
      event.stopPropagation();
    }
    setSteps((current) => {
      const updated = current.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s));
      saveSteps(taskId, updated);
      return updated;
    });
  }

  function handleToggleOpen(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setIsOpen((current) => !current);
  }

  const hasSteps = steps.length > 0;
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = hasSteps && doneCount === steps.length;

  return (
    <div className={`task-breakdown-wrapper ${className}`}>
      <div className="task-breakdown-actions-row">
        <button
          type="button"
          className={`task-breakdown-btn ${isLoading ? "task-breakdown-btn--loading" : ""} ${hasSteps ? "task-breakdown-btn--has-steps" : ""}`}
          onClick={hasSteps ? handleToggleOpen : handleDecompose}
          disabled={isLoading}
          aria-expanded={isOpen}
          aria-label={`Scomponi con AI: ${title}`}
          title={
            hasSteps
              ? isOpen
                ? "Nascondi micro-step"
                : "Mostra micro-step"
              : "Scomponi questo task in 3-4 micro-step pratici (<10 min) con l'AI"
          }
        >
          {isLoading ? (
            <>
              <IconSpinner />
              <span>Scomposizione...</span>
            </>
          ) : hasSteps ? (
            <>
              <IconSparkle />
              <span>
                {steps.length} micro-step {doneCount > 0 ? `(${doneCount}/${steps.length})` : ""}
              </span>
              <span className="task-breakdown-chevron">{isOpen ? "▲" : "▼"}</span>
            </>
          ) : (
            <>
              <IconSparkle />
              <span>Scomponi con AI</span>
            </>
          )}
        </button>
      </div>

      {isLoading && (
        <div className="task-breakdown-loader" role="status" aria-live="polite">
          <div className="task-breakdown-loader-header">
            <div className="task-breakdown-pulse-dot" />
            <span className="task-breakdown-loader-title">Scomposizione con AI in corso...</span>
            <span className="task-breakdown-badge">&lt; 10 min ciascuno</span>
          </div>
          <p className="task-breakdown-loader-desc">
            Scomposizione in corso per <strong>"{title}"</strong>: genero 3-4 micro-step pratici ed eseguibili in meno di 10 minuti...
          </p>
          <div className="task-breakdown-skeletons" aria-hidden="true">
            <div className="skeleton-line skeleton-line--1" />
            <div className="skeleton-line skeleton-line--2" />
            <div className="skeleton-line skeleton-line--3" />
          </div>
        </div>
      )}

      {error && !isLoading && (
        <div className="task-breakdown-error">
          <span>{error}</span>
          <button type="button" className="task-breakdown-action-btn" onClick={handleDecompose}>
            Riprova
          </button>
        </div>
      )}

      {hasSteps && isOpen && !isLoading && (
        <div className="task-breakdown-panel" role="region" aria-label="Micro-step del task">
          <div className="task-breakdown-panel-head">
            <div className="task-breakdown-panel-title">
              <IconSparkle />
              <span>Micro-step pratici</span>
              <span className="task-breakdown-count-chip">
                {doneCount} / {steps.length} completati
              </span>
            </div>
            <button
              type="button"
              className="task-breakdown-action-btn"
              onClick={handleDecompose}
              disabled={isLoading}
              title="Rigenera con l'AI"
            >
              <IconRepeat />
              <span>Rigenera</span>
            </button>
          </div>

          {allDone && (
            <div className="task-breakdown-success-banner">
              <IconCheck />
              <span>Tutti i micro-step completati! Ottimo slancio.</span>
            </div>
          )}

          <ul className="task-breakdown-list">
            {steps.map((step) => (
              <li key={step.id} className={`task-breakdown-item ${step.done ? "task-breakdown-item--done" : ""}`}>
                <label className="task-breakdown-label">
                  <input
                    type="checkbox"
                    className="check"
                    checked={step.done}
                    onChange={(e) => handleToggleStep(step.id, e)}
                  />
                  <span className="task-breakdown-text">{step.text}</span>
                </label>
                <span className="task-breakdown-time" title="Meno di 10 minuti">
                  &lt; {step.minutes || 5}m
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TaskBreakdown;
