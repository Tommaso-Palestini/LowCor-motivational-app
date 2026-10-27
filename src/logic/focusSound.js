// Suoni del focus generati al momento con Web Audio: niente file da scaricare, funzionano offline.
// Il rumore copre i suoni intorno e per molte persone con ADHD aiuta a restare nel compito:
// marrone (cupo, come una cascata lontana), rosa (pioggia), bianco (fruscio pieno).
export const FOCUS_SOUNDS = [
  { id: "off", label: "Silenzio" },
  { id: "brown", label: "Marrone" },
  { id: "pink", label: "Rosa" },
  { id: "white", label: "Bianco" },
];

// Campioni di rumore. Puri, così si possono testare senza Web Audio.
export function noiseSamples(kind, length, random = Math.random) {
  const samples = new Float32Array(length);
  if (kind === "brown") {
    let last = 0;
    for (let index = 0; index < length; index += 1) {
      last = (last + 0.02 * (random() * 2 - 1)) / 1.02;
      samples[index] = last * 3.5;
    }
    return samples;
  }
  if (kind === "pink") {
    // Filtro di Paul Kellet: rumore bianco attenuato di 3 dB per ottava
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let index = 0; index < length; index += 1) {
      const white = random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      samples[index] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return samples;
  }
  for (let index = 0; index < length; index += 1) {
    samples[index] = random() * 2 - 1;
  }
  return samples;
}

// Volume percepito: lo slider va da 0 a 100, il guadagno cresce col quadrato (più fine in basso)
export function volumeToGain(volume) {
  const level = Math.min(Math.max(volume, 0), 100) / 100;
  return level * level * 0.6;
}

let context = null;
let current = null;

function getContext() {
  const AudioCtx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!AudioCtx) {
    return null;
  }
  if (!context) {
    context = new AudioCtx();
  }
  return context;
}

// Safari fa partire l'audio solo dentro un gesto dell'utente: va chiamata nei clic che avviano il focus.
export function unlockAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

export function playNoise(kind, volume) {
  const ctx = getContext();
  if (!ctx || kind === "off") {
    stopNoise();
    return;
  }
  if (current && current.kind === kind) {
    current.gain.gain.setTargetAtTime(volumeToGain(volume), ctx.currentTime, 0.1);
    return;
  }
  stopNoise();
  // Quattro secondi in loop: abbastanza lunghi da non sentire la ripetizione
  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  buffer.copyToChannel(noiseSamples(kind, length), 0);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  // Entra in dissolvenza, senza scatti
  gain.gain.setTargetAtTime(volumeToGain(volume), ctx.currentTime, 0.4);
  source.connect(gain).connect(ctx.destination);
  source.start();
  current = { kind, source, gain };
}

export function stopNoise() {
  if (!current || !context) {
    return;
  }
  const { source, gain } = current;
  current = null;
  gain.gain.setTargetAtTime(0, context.currentTime, 0.2);
  source.stop(context.currentTime + 1);
}

// Due note morbide a fine sessione: un segnale chiaro ma non uno spavento
export function playChime() {
  const ctx = getContext();
  if (!ctx) {
    return;
  }
  [523.25, 783.99].forEach((frequency, index) => {
    const start = ctx.currentTime + index * 0.22;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 1.6);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + 1.7);
  });
}
