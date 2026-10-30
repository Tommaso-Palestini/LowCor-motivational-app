import { afterEach, describe, expect, it, vi } from "vitest";

// scrolling.js tiene lo stato a livello di modulo: ogni test lo ricarica con una finestra finta
async function loadWithWindow() {
  vi.resetModules();
  const target = new EventTarget();
  vi.stubGlobal("window", target);
  const module = await import("../scrolling");
  return { target, isScrolling: module.isScrolling };
}

describe("scroll in corso", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("all'inizio non si sta scorrendo", async () => {
    const { isScrolling } = await loadWithWindow();
    expect(isScrolling()).toBe(false);
  });

  it("scroll, rotella e dito contano come scorrimento, che finisce dopo una breve pausa", async () => {
    let now = 1000;
    vi.spyOn(performance, "now").mockImplementation(() => now);
    const { target, isScrolling } = await loadWithWindow();
    isScrolling();

    for (const type of ["scroll", "wheel", "touchmove"]) {
      now += 1000;
      target.dispatchEvent(new Event(type));
      expect(isScrolling()).toBe(true);
      now += 200;
      expect(isScrolling()).toBe(true);
      now += 100;
      expect(isScrolling()).toBe(false);
    }
  });

  it("senza finestra (test, server) risponde sempre no", async () => {
    vi.resetModules();
    const { isScrolling } = await import("../scrolling");
    expect(isScrolling()).toBe(false);
  });
});
