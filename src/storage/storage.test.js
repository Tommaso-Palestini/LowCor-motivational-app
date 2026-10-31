import { describe, expect, it } from "vitest";
import { diskBackend, latestWriter } from "./storage";

function memoryStorage(entries = {}) {
  const map = new Map(Object.entries(entries));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    removeItem: (key) => map.delete(key),
    size: () => map.size,
  };
}

// Finti comandi Rust: tengono i "file" in memoria e registrano le chiamate
function fakeDisk(files = { data: null, background: null }) {
  const calls = [];
  async function invoke(command, args) {
    calls.push([command, args]);
    if (command === "load_state") {
      return { ...files };
    }
    if (command === "save_state") {
      files.data = args.json;
    } else if (command === "save_background") {
      files.background = args.dataUrl;
    } else if (command === "clear_state") {
      files.data = null;
      files.background = null;
    }
    return null;
  }
  return { invoke, calls, files };
}

describe("latestWriter", () => {
  it("scrive la prima e l'ultima versione, saltando quelle intermedie", async () => {
    const written = [];
    let release;
    const writer = latestWriter(
      (value) =>
        new Promise((resolve) => {
          written.push(value);
          release = resolve;
        })
    );
    writer.push(1);
    writer.push(2);
    writer.push(3);
    release();
    await Promise.resolve();
    await Promise.resolve();
    release();
    await writer.flush();
    expect(written).toEqual([1, 3]);
  });

  it("un errore di scrittura non blocca le successive", async () => {
    const written = [];
    const writer = latestWriter(async (value) => {
      if (value === "rotto") {
        throw new Error("disco pieno");
      }
      written.push(value);
    });
    const originalError = console.error;
    console.error = () => {};
    await writer.push("rotto");
    console.error = originalError;
    await writer.push("buono");
    expect(written).toEqual(["buono"]);
  });
});

describe("diskBackend", () => {
  it("legge i dati già sul disco e non tocca localStorage", async () => {
    const disk = fakeDisk({ data: '{"aura":3}', background: null });
    const storage = memoryStorage({ "daily-app-data": '{"aura":1}' });
    const backend = await diskBackend(disk.invoke, storage);
    expect(backend.read()).toBe('{"aura":3}');
    expect(storage.size()).toBe(1);
  });

  it("al primo avvio sposta dati e sfondo da localStorage al disco", async () => {
    const disk = fakeDisk();
    const storage = memoryStorage({ "daily-app-data": '{"aura":1}', "daily-app-background": "data:image/png;base64,AA" });
    const backend = await diskBackend(disk.invoke, storage);
    expect(backend.read()).toBe('{"aura":1}');
    expect(backend.readBackground()).toBe("data:image/png;base64,AA");
    expect(disk.files).toEqual({ data: '{"aura":1}', background: "data:image/png;base64,AA" });
    expect(storage.size()).toBe(0);
  });

  it("senza dati da nessuna parte parte vuoto", async () => {
    const backend = await diskBackend(fakeDisk().invoke, memoryStorage());
    expect(backend.read()).toBeNull();
  });

  it("le scritture arrivano sul disco e clear cancella tutto dopo averle finite", async () => {
    const disk = fakeDisk();
    const backend = await diskBackend(disk.invoke, memoryStorage());
    backend.write('{"aura":5}');
    backend.writeBackground("data:image/png;base64,BB");
    expect(backend.read()).toBe('{"aura":5}');
    await backend.clear();
    expect(disk.files).toEqual({ data: null, background: null });
    expect(disk.calls.map(([command]) => command).at(-1)).toBe("clear_state");
    expect(backend.read()).toBeNull();
  });
});
