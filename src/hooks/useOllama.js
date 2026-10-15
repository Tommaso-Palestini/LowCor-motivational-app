import { useEffect, useState } from "react";
import { listModels, pickModel } from "../logic/ai";

const RETRY_MS = 20000;

// Controlla se Ollama è acceso e quali modelli hai. Se è spento riprova ogni 20 secondi,
// così appena lo avvii l'app se ne accorge da sola.
export function useOllama(url, preferredModel) {
  const [state, setState] = useState({ status: "checking", models: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timerId = null;
    listModels(url, controller.signal)
      .then((models) => setState({ status: "ready", models }))
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        setState({ status: "offline", models: [] });
        timerId = setTimeout(() => setAttempt((value) => value + 1), RETRY_MS);
      });
    return () => {
      controller.abort();
      clearTimeout(timerId);
    };
  }, [url, attempt]);

  const model = pickModel(state.models, preferredModel);
  let status = state.status;
  if (status === "ready" && !model) {
    status = "no-model";
  }

  return {
    status,
    models: state.models,
    model,
    url,
    isReady: status === "ready",
    retry: () => setAttempt((value) => value + 1),
  };
}
