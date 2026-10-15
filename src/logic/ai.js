// Client per Ollama, l'AI che gira in locale sul tuo computer.
// Niente cloud: le richieste vanno solo a http://localhost:11434.

export class AiError extends Error {}

// Modelli che sanno chattare, in ordine di preferenza se non ne hai scelto uno.
const PREFERRED_MODELS = [/llama3\.2/, /qwen3/, /qwen2\.5/, /gemma3/, /llama3/, /mistral/, /phi/];

export async function listModels(url, signal) {
  const response = await fetch(`${url}/api/tags`, { signal });
  if (!response.ok) {
    throw new AiError(`Ollama ha risposto con errore ${response.status}`);
  }
  const body = await response.json();
  return body.models
    .map((model) => model.name)
    .filter((name) => !name.includes("embed"));
}

export function pickModel(models, preferred) {
  if (preferred && models.includes(preferred)) {
    return preferred;
  }
  for (const pattern of PREFERRED_MODELS) {
    const match = models.find((name) => pattern.test(name));
    if (match) {
      return match;
    }
  }
  return models[0] || null;
}

// Manda una conversazione a Ollama e pretende in risposta un JSON che rispetta lo schema.
// La risposta arriva a pezzi (streaming): onText riceve il testo accumulato finora.
export async function chatJson({ ai, messages, schema, signal, temperature = 0.7, onText }) {
  let response;
  try {
    response = await fetch(`${ai.url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ai.model,
        messages,
        format: schema,
        stream: true,
        options: { temperature },
      }),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }
    throw new AiError(`Ollama non risponde su ${ai.url}. È acceso?`);
  }

  if (!response.ok) {
    if (response.status === 404) {
      throw new AiError(`Il modello ${ai.model} non è installato. Nel terminale: ollama pull ${ai.model}`);
    }
    const detail = await response.text();
    throw new AiError(`Ollama ha dato un errore (${response.status}): ${detail.slice(0, 140)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  function readLine(line) {
    if (line.trim() === "") {
      return;
    }
    const chunk = JSON.parse(line);
    if (chunk.error) {
      throw new AiError(chunk.error);
    }
    if (chunk.message && chunk.message.content) {
      content += chunk.message.content;
      if (onText) {
        onText(content);
      }
    }
  }

  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    lines.forEach(readLine);
  }
  readLine(buffer);

  try {
    return JSON.parse(content);
  } catch {
    throw new AiError("Il modello ha risposto in un formato strano, riprova.");
  }
}

// Mentre il JSON arriva a pezzi, tira fuori il testo di un campo anche se non è ancora chiuso.
export function readPartialField(text, field) {
  const match = text.match(new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`));
  if (!match) {
    return "";
  }
  const raw = match[1].replace(/\\$/, "");
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}
