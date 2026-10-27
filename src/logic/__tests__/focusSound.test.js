import { describe, expect, it } from "vitest";
import { noiseSamples, volumeToGain } from "../focusSound";

// Generatore ripetibile, così i test non dipendono dal caso
function seeded(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

// Quanto cambia in media un campione rispetto al precedente: basso = suono più cupo
function roughness(samples) {
  let sum = 0;
  for (let index = 1; index < samples.length; index += 1) {
    sum += Math.abs(samples[index] - samples[index - 1]);
  }
  return sum / (samples.length - 1);
}

describe("suoni del focus", () => {
  it("il rumore resta nell'intervallo udibile senza distorcere", () => {
    ["white", "pink", "brown"].forEach((kind) => {
      const samples = noiseSamples(kind, 20000, seeded(7));
      expect(Math.max(...samples.map(Math.abs))).toBeLessThanOrEqual(1);
    });
  });

  it("marrone è più cupo del rosa, che è più cupo del bianco", () => {
    const [brown, pink, white] = ["brown", "pink", "white"].map((kind) => roughness(noiseSamples(kind, 20000, seeded(3))));
    expect(brown).toBeLessThan(pink);
    expect(pink).toBeLessThan(white);
  });

  it("il volume va da silenzio a un massimo che non assorda", () => {
    expect(volumeToGain(0)).toBe(0);
    expect(volumeToGain(50)).toBeLessThan(volumeToGain(100) / 2);
    expect(volumeToGain(150)).toBe(volumeToGain(100));
    expect(volumeToGain(100)).toBeLessThanOrEqual(0.6);
  });
});
