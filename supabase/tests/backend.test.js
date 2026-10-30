// Test del backend contro lo stack Supabase locale (npx supabase start): API, auth e database veri.
// Ogni test è scritto come un tentativo di abuso: chi non ha fatto login, un utente che prova a leggere
// o cambiare i dati di un altro, codici d'invito indovinati, input fuori misura.
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const env = Object.fromEntries(
  execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    .split("\n")
    .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2]])
);

const URL = env.API_URL;
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(URL, env.SERVICE_ROLE_KEY, options);
const LEGAL = { legal_version: "2026-10-30", health_consent: "true" };
const PASSWORD = "Prova-Sicura-2026";
const run = Date.now().toString(36);
const created = [];

function anon() {
  return createClient(URL, env.ANON_KEY, options);
}

async function makeUser(name, metadata = LEGAL) {
  const email = `${name.toLowerCase()}-${run}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: name, ...metadata },
  });
  if (error) {
    throw error;
  }
  created.push(data.user.id);
  const client = anon();
  const signed = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (signed.error) {
    throw signed.error;
  }
  return { id: data.user.id, email, client };
}

async function rpc(user, name, args) {
  const { data, error } = await user.client.rpc(name, args);
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

function isoDay(offset = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

let alice;
let bruno;
let carla;

beforeAll(async () => {
  [alice, bruno, carla] = await Promise.all([makeUser("Alice"), makeUser("Bruno"), makeUser("Carla")]);
});

afterAll(async () => {
  await Promise.all(created.map((id) => admin.auth.admin.deleteUser(id).catch(() => {})));
});

describe("chi non ha fatto login", () => {
  it("non legge nessuna tabella", async () => {
    const client = anon();
    for (const table of ["profiles", "consents", "user_state", "shares", "invites", "invite_failures", "schedule_items"]) {
      const { data, error } = await client.from(table).select("*");
      expect(error, table).not.toBeNull();
      expect(data, table).toBeNull();
    }
  });

  it("non chiama nessuna funzione", async () => {
    const client = anon();
    const calls = [
      ["save_state", { p_data: {}, p_base_revision: 0 }],
      ["create_invite", {}],
      ["accept_invite", { p_token: "x".repeat(24) }],
      ["shared_schedule", { p_from: isoDay(), p_to: isoDay(7) }],
      ["export_my_data", {}],
      ["delete_account", {}],
      ["handle_new_user", {}],
      ["clean_display_name", { p_name: "x" }],
    ];
    for (const [name, args] of calls) {
      const { error } = await client.rpc(name, args);
      expect(error, name).not.toBeNull();
    }
  });
});

describe("registrazione", () => {
  it("senza consensi l'account non si crea, nemmeno chiamando direttamente l'API", async () => {
    const { error } = await anon().auth.signUp({
      email: `senza-consenso-${run}@example.com`,
      password: PASSWORD,
      options: { data: { display_name: "Furbo" } },
    });
    expect(error).not.toBeNull();
    const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
    expect(data.users.some((user) => user.email === `senza-consenso-${run}@example.com`)).toBe(false);
  });

  it("rifiuta le password deboli", async () => {
    const { error } = await anon().auth.signUp({
      email: `debole-${run}@example.com`,
      password: "password",
      options: { data: LEGAL },
    });
    expect(error?.code).toBe("weak_password");
  });

  it("l'email si conferma con il codice, e prima non si entra", async () => {
    const email = `codice-${run}@example.com`;
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password: PASSWORD,
      options: { data: { display_name: "  Dario\u0007  ", ...LEGAL } },
    });
    expect(error).toBeNull();
    created.push(data.user.id);

    const client = anon();
    const early = await client.auth.signInWithPassword({ email, password: PASSWORD });
    expect(early.error?.code).toBe("email_not_confirmed");

    const wrong = await client.auth.verifyOtp({ email, token: "000000", type: "signup" });
    expect(wrong.error).not.toBeNull();

    const right = await client.auth.verifyOtp({ email, token: data.properties.email_otp, type: "signup" });
    expect(right.error).toBeNull();
    const profile = await client.from("profiles").select("display_name").single();
    expect(profile.data.display_name).toBe("Dario");
    const consent = await client.from("consents").select("legal_version, health_data").single();
    expect(consent.data).toEqual({ legal_version: "2026-10-30", health_data: true });
  });
});

describe("dati dell'app", () => {
  it("ognuno legge e scrive solo i propri", async () => {
    const saved = await rpc(alice, "save_state", { p_data: { blocks: [{ id: "segreto" }] }, p_base_revision: 0 });
    expect(saved).toMatchObject({ ok: true, revision: 1 });

    const peek = await bruno.client.from("user_state").select("*");
    expect(peek.data).toEqual([]);
    const own = await alice.client.from("user_state").select("data, revision").single();
    expect(own.data).toEqual({ data: { blocks: [{ id: "segreto" }] }, revision: 1 });

    // Bruno salva i suoi: la riga di Alice non cambia
    await rpc(bruno, "save_state", { p_data: { blocks: [] }, p_base_revision: 0 });
    const still = await admin.from("user_state").select("data").eq("user_id", alice.id).single();
    expect(still.data.data.blocks[0].id).toBe("segreto");
  });

  it("non si scrive sulle tabelle direttamente, solo dalle funzioni", async () => {
    const attempts = [
      alice.client.from("user_state").update({ data: {} }).eq("user_id", alice.id).select(),
      alice.client.from("user_state").delete().eq("user_id", bruno.id).select(),
      alice.client.from("user_state").insert({ user_id: carla.id, data: {} }),
      alice.client.from("profiles").update({ display_name: "Hacker" }).eq("id", bruno.id).select(),
      alice.client.from("consents").update({ health_data: true }).eq("user_id", alice.id).select(),
      alice.client.from("shares").insert({ owner: carla.id, viewer: alice.id, level: "details" }),
      alice.client.from("schedule_items").insert({ owner: bruno.id, day: isoDay(), start_min: 0, end_min: 60, kind: "block" }),
      alice.client.from("invites").select("*"),
    ];
    for (const attempt of attempts) {
      const { error } = await attempt;
      expect(error).not.toBeNull();
    }
    const bruno_profile = await admin.from("profiles").select("display_name").eq("id", bruno.id).single();
    expect(bruno_profile.data.display_name).toBe("Bruno");
  });

  it("non sovrascrive le modifiche fatte da un altro dispositivo", async () => {
    const stale = await rpc(alice, "save_state", { p_data: { blocks: [] }, p_base_revision: 0 });
    expect(stale).toMatchObject({ ok: false, revision: 1, data: { blocks: [{ id: "segreto" }] } });
    const next = await rpc(alice, "save_state", { p_data: { blocks: [{ id: "nuovo" }] }, p_base_revision: 1 });
    expect(next).toMatchObject({ ok: true, revision: 2 });
    const old = await rpc(alice, "save_state", { p_data: { blocks: [] }, p_base_revision: 1 });
    expect(old).toMatchObject({ ok: false, revision: 2 });
  });

  it("rifiuta stati enormi o che non sono oggetti", async () => {
    await expect(rpc(alice, "save_state", { p_data: { big: "x".repeat(2_100_000) }, p_base_revision: 2 })).rejects.toThrow(
      /state_too_large|too large|413/i
    );
    await expect(rpc(alice, "save_state", { p_data: [1, 2], p_base_revision: 2 })).rejects.toThrow(/invalid_state/);
  });

  it("il nome si ripulisce dai caratteri di controllo e si accorcia", async () => {
    const name = await rpc(carla, "update_profile", { p_display_name: `\u0007Carla${"!".repeat(100)}\n` });
    expect(name).toBe(`Carla${"!".repeat(55)}`);
    expect(await rpc(carla, "update_profile", { p_display_name: "   " })).toBe("LowCor");
    // Il carattere nullo non arriva nemmeno al database
    await expect(rpc(carla, "update_profile", { p_display_name: "\u0000" })).rejects.toThrow();
    await rpc(carla, "update_profile", { p_display_name: "Carla" });
  });
});

describe("inviti e persone collegate", () => {
  let token;

  it("il codice si vede una volta e nel database c'è solo l'hash", async () => {
    const invite = await rpc(alice, "create_invite", {});
    token = invite.token;
    expect(token).toMatch(/^[A-Za-z0-9_-]{24}$/);
    const { data } = await admin.from("invites").select("*").eq("owner", alice.id);
    expect(JSON.stringify(data)).not.toContain(token);
    expect(data[0]).not.toHaveProperty("token");
  });

  it("non si accetta il proprio invito", async () => {
    expect(await rpc(alice, "accept_invite", { p_token: token })).toEqual({ ok: false, reason: "own_invite" });
  });

  it("chi lo riceve si collega, e il codice non vale una seconda volta", async () => {
    const accepted = await rpc(bruno, "accept_invite", { p_token: token });
    expect(accepted).toEqual({ ok: true, id: alice.id, display_name: "Alice" });
    expect(await rpc(carla, "accept_invite", { p_token: token })).toEqual({ ok: false, reason: "invalid" });

    const mine = await rpc(alice, "my_connections", {});
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ id: bruno.id, display_name: "Bruno", i_share: "busy", they_share: "busy" });
    expect(await rpc(carla, "my_connections", {})).toEqual([]);
  });

  it("chi prova a indovinare i codici viene fermato, anche se poi ne trova uno giusto", async () => {
    const real = (await rpc(bruno, "create_invite", {})).token;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const result = await rpc(carla, "accept_invite", { p_token: `${attempt}`.padStart(24, "A") });
      expect(result.ok).toBe(false);
    }
    expect(await rpc(carla, "accept_invite", { p_token: real })).toEqual({ ok: false, reason: "rate_limited" });
    // Pulizia per i test successivi
    await admin.from("invite_failures").delete().eq("user_id", carla.id);
  });

  it("al massimo 5 inviti aperti", async () => {
    // Bruno ne ha già uno aperto dal test precedente
    for (let index = 0; index < 4; index += 1) {
      await rpc(bruno, "create_invite", {});
    }
    await expect(rpc(bruno, "create_invite", {})).rejects.toThrow(/too_many_open_invites/);
  });

  it("un invito scaduto non vale", async () => {
    const expired = (await rpc(carla, "create_invite", {})).token;
    await admin.from("invites").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("owner", carla.id);
    expect(await rpc(alice, "accept_invite", { p_token: expired })).toEqual({ ok: false, reason: "invalid" });
    await admin.from("invite_failures").delete().eq("user_id", alice.id);
  });

  it("non si cambia cosa si mostra a chi non è collegato", async () => {
    await expect(rpc(alice, "set_share_level", { p_viewer: carla.id, p_level: "details" })).rejects.toThrow(/not_connected/);
    await expect(rpc(alice, "set_share_level", { p_viewer: bruno.id, p_level: "tutto" })).rejects.toThrow(/invalid_level/);
  });
});

describe("impegni condivisi", () => {
  const from = isoDay(0);
  const to = isoDay(27);
  const items = [
    { day: isoDay(1), start_min: 540, end_min: 600, title: "Visita dal cardiologo", kind: "block" },
    { day: isoDay(2), start_min: 1020, end_min: 1080, title: "<script>alert(1)</script>", kind: "job" },
    { day: isoDay(60), start_min: 600, end_min: 660, title: "fuori intervallo", kind: "block" },
  ];

  it("con 'solo occupato' chi è collegato vede gli orari ma non i titoli", async () => {
    expect(await rpc(alice, "publish_schedule", { p_from: from, p_to: to, p_items: items })).toBe(2);
    const seen = await rpc(bruno, "shared_schedule", { p_from: from, p_to: to });
    expect(seen).toHaveLength(2);
    expect(seen.every((item) => item.title === "" && item.kind === "busy" && item.display_name === "Alice")).toBe(true);
  });

  it("con 'anche i titoli' vede i titoli, salvati come semplice testo", async () => {
    await rpc(alice, "set_share_level", { p_viewer: bruno.id, p_level: "details" });
    const seen = await rpc(bruno, "shared_schedule", { p_from: from, p_to: to });
    expect(seen.map((item) => item.title)).toEqual(["Visita dal cardiologo", "<script>alert(1)</script>"]);
  });

  it("chi non è collegato non vede niente, e nemmeno chi ha condiviso vede i propri come altrui", async () => {
    expect(await rpc(carla, "shared_schedule", { p_from: from, p_to: to })).toEqual([]);
    expect(await rpc(alice, "shared_schedule", { p_from: from, p_to: to })).toEqual([]);
    const direct = await bruno.client.from("schedule_items").select("*");
    expect(direct.error).not.toBeNull();
  });

  it("rifiuta intervalli e liste fuori misura", async () => {
    await expect(rpc(alice, "publish_schedule", { p_from: from, p_to: isoDay(200), p_items: [] })).rejects.toThrow(/invalid_range/);
    await expect(rpc(alice, "publish_schedule", { p_from: to, p_to: from, p_items: [] })).rejects.toThrow(/invalid_range/);
    const many = Array.from({ length: 501 }, () => items[0]);
    await expect(rpc(alice, "publish_schedule", { p_from: from, p_to: to, p_items: many })).rejects.toThrow(/invalid_items/);
    const broken = [{ day: isoDay(1), start_min: 600, end_min: 500, title: "", kind: "block" }];
    await expect(rpc(alice, "publish_schedule", { p_from: from, p_to: to, p_items: broken })).rejects.toThrow();
    const weird = [{ day: isoDay(1), start_min: 0, end_min: 10, title: "", kind: "admin" }];
    await expect(rpc(alice, "publish_schedule", { p_from: from, p_to: to, p_items: weird })).rejects.toThrow();
    // Gli errori non hanno cancellato gli impegni già pubblicati
    expect(await rpc(bruno, "shared_schedule", { p_from: from, p_to: to })).toHaveLength(2);
  });

  it("con 'niente' non vede più nulla e sul server non resta niente", async () => {
    await rpc(alice, "set_share_level", { p_viewer: bruno.id, p_level: "none" });
    expect(await rpc(bruno, "shared_schedule", { p_from: from, p_to: to })).toEqual([]);
    const stored = await admin.from("schedule_items").select("id").eq("owner", alice.id);
    expect(stored.data).toEqual([]);
    expect(await rpc(alice, "publish_schedule", { p_from: from, p_to: to, p_items: items })).toBe(0);
  });

  it("togliere il collegamento lo toglie a entrambi", async () => {
    await rpc(alice, "set_share_level", { p_viewer: bruno.id, p_level: "busy" });
    await rpc(bruno, "remove_connection", { p_other: alice.id });
    expect(await rpc(alice, "my_connections", {})).toEqual([]);
    expect(await rpc(bruno, "my_connections", {})).toEqual([]);
  });
});

describe("diritti sui dati", () => {
  it("l'esportazione contiene i propri dati e niente degli altri", async () => {
    const exported = await rpc(alice, "export_my_data", {});
    expect(exported.account.email).toBe(alice.email);
    expect(exported.profile.display_name).toBe("Alice");
    expect(exported.state.data.blocks[0].id).toBe("nuovo");
    expect(JSON.stringify(exported)).not.toContain(bruno.email);
    expect(JSON.stringify(exported)).not.toContain("token_hash");
  });

  it("cancellare l'account cancella tutto, a cascata", async () => {
    const dana = await makeUser("Dana");
    const invite = await rpc(dana, "create_invite", {});
    await rpc(carla, "accept_invite", { p_token: invite.token });
    await rpc(dana, "save_state", { p_data: { blocks: [] }, p_base_revision: 0 });
    await rpc(dana, "publish_schedule", { p_from: isoDay(), p_to: isoDay(7), p_items: [{ day: isoDay(1), start_min: 0, end_min: 30, title: "x", kind: "block" }] });

    await rpc(dana, "delete_account", {});

    const { data: user } = await admin.auth.admin.getUserById(dana.id);
    expect(user.user).toBeNull();
    for (const [table, column] of [
      ["profiles", "id"],
      ["consents", "user_id"],
      ["user_state", "user_id"],
      ["invites", "owner"],
      ["schedule_items", "owner"],
      ["shares", "owner"],
      ["shares", "viewer"],
    ]) {
      const { data } = await admin.from(table).select("*").eq(column, dana.id);
      expect(data, `${table}.${column}`).toEqual([]);
    }
    expect(await rpc(carla, "my_connections", {})).toEqual([]);
    // Il token di Dana non vale più nulla
    const after = await dana.client.rpc("save_state", { p_data: {}, p_base_revision: 0 });
    expect(after.error).not.toBeNull();
  });
});
