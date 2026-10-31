import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { LEGAL_VERSION } from "../src/logic/consent.js";

// Account, salvataggio online e condivisione, contro lo stack Supabase locale (npx supabase start).
// Senza lo stack, o se la build non ha le variabili VITE_SUPABASE_*, questi test si saltano.
let env = {};
try {
  env = Object.fromEntries(
    execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")
      .map((line) => line.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2]])
  );
} catch {
  // Stack non avviato
}

const available = Boolean(env.API_URL && env.SERVICE_ROLE_KEY);
const admin = available
  ? createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;
const PASSWORD = "Prova-Sicura-2026";
const created = [];

test.describe.configure({ mode: "serial" });
test.skip(!available, "Serve lo stack Supabase locale: npx supabase start");
// I flussi sono uguali su tutti i browser: bastano un desktop e un telefono WebKit
test.skip(({ browserName, isMobile }) => !(browserName === "chromium" && !isMobile) && !(browserName === "webkit" && isMobile));

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

function uniqueEmail(name, testInfo) {
  return `${name}-${testInfo.project.name.replace(/\W/g, "").toLowerCase()}-${Date.now().toString(36)}@example.com`;
}

async function makeUser(name, email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: name, legal_version: LEGAL_VERSION, health_consent: "true" },
  });
  if (error) {
    throw error;
  }
  created.push(data.user.id);
  return data.user.id;
}

async function seed(page, extra = {}) {
  await page.addInitScript((data) => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("daily-app-data", JSON.stringify(data));
    }
  }, {
    onboarded: true,
    consent: { version: LEGAL_VERSION, acceptedAt: "2026-10-27T09:00:00.000Z" },
    settings: { fullGas: false, blockAlerts: false },
    ...extra,
  });
}

async function openAccount(page) {
  await page.getByRole("button", { name: /Accedi o crea un account|Account e persone collegate/ }).click();
  return page.getByRole("dialog");
}

async function signIn(page, email, { expectChoice = false } = {}) {
  const dialog = await openAccount(page);
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Password").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Accedi", exact: true }).click();
  if (expectChoice) {
    // Questo dispositivo ha già i suoi dati, diversi da quelli dell'account: decide la persona
    const choice = page.getByRole("dialog", { name: "Quali dati tengo?" });
    await choice.getByRole("button", { name: "Usa i dati dell'account" }).click();
  }
  await expect(dialog.getByText("Dati salvati online")).toBeVisible({ timeout: 15000 });
  return dialog;
}

async function readCode(email) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetch(`${env.MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const { messages = [] } = await response.json();
    if (messages.length > 0) {
      const message = await (await fetch(`${env.MAILPIT_URL}/api/v1/message/${messages[0].ID}`)).json();
      const match = message.Text.match(/\b(\d{6})\b/);
      if (match) {
        return match[1];
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Nessuna email con il codice");
}

test.afterAll(async () => {
  await Promise.all(created.map((id) => admin.auth.admin.deleteUser(id).catch(() => {})));
});

test("registrazione con il codice via email: senza consensi non si parte", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Chrome desktop", "Le email di prova sono contate: basta un browser");
  const email = uniqueEmail("nuova", testInfo);
  await seed(page);
  await page.goto("/");
  const dialog = await openAccount(page);
  await dialog.getByRole("button", { name: "Crea un account" }).click();
  await dialog.getByLabel("Nome da mostrare").fill("Giulia");
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel(/Password/).fill("debole");
  const submit = dialog.getByRole("button", { name: "Crea l'account" });
  await expect(submit).toBeDisabled();
  for (const box of await dialog.getByRole("checkbox").all()) {
    await box.check();
  }
  await submit.click();
  await expect(dialog.getByRole("alert")).toContainText("almeno 10 caratteri");

  await dialog.getByLabel(/Password/).fill(PASSWORD);
  await submit.click();
  await expect(dialog.getByRole("heading", { name: "Conferma l'email" })).toBeVisible();
  await dialog.getByLabel("Codice").fill(await readCode(email));
  await dialog.getByRole("button", { name: "Conferma" }).click();
  await expect(dialog.getByText("Dati salvati online")).toBeVisible({ timeout: 15000 });

  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((item) => item.email === email);
  created.push(user.id);
  const { data: consent } = await admin.from("consents").select("legal_version, health_data").eq("user_id", user.id).single();
  expect(consent).toEqual({ legal_version: LEGAL_VERSION, health_data: true });
});

test("accedo, i dati vanno online e su un altro dispositivo tornano giù", async ({ browser, page }, testInfo) => {
  const email = uniqueEmail("sync", testInfo);
  const userId = await makeUser("Sync", email);
  await seed(page, {
    jobs: [{ id: "j1", title: "Rinnovare il passaporto", notes: "", date: null, time: null, minutes: null, energy: "medium", done: false, doneAt: null, createdAt: "2026-10-30T09:00:00.000Z" }],
  });
  await page.goto("/");
  await signIn(page, email);
  await expect(async () => {
    const { data } = await admin.from("user_state").select("data").eq("user_id", userId).single();
    expect(data.data.jobs[0].title).toBe("Rinnovare il passaporto");
    expect(data.data.focus).toBeUndefined();
  }).toPass({ timeout: 10000 });

  // Un altro dispositivo con i dati di esempio: dopo il login sceglie quelli dell'account
  const other = await browser.newContext();
  const second = await other.newPage();
  await seed(second);
  await second.goto("/");
  await signIn(second, email, { expectChoice: true });
  await second.keyboard.press("Escape");
  await expect(second.getByRole("region", { name: "Da fare una volta" }).getByText("Rinnovare il passaporto")).toBeVisible();
  await other.close();
});

test("su un dispositivo nuovo accedo dall'onboarding e ritrovo i miei dati", async ({ browser, page }, testInfo) => {
  const email = uniqueEmail("ritorno", testInfo);
  const userId = await makeUser("Ritorno", email);
  await seed(page, {
    jobs: [{ id: "j1", title: "Prenotare il dentista", notes: "", date: null, time: null, minutes: null, energy: "low", done: false, doneAt: null, createdAt: "2026-10-30T09:00:00.000Z" }],
  });
  await page.goto("/");
  await signIn(page, email);
  await expect(async () => {
    const { data } = await admin.from("user_state").select("data").eq("user_id", userId).single();
    expect(data.data.jobs[0].title).toBe("Prenotare il dentista");
  }).toPass({ timeout: 10000 });

  // Dispositivo vuoto: niente onboarding da rifare, niente scelta tra dati diversi
  const fresh = await browser.newContext();
  const second = await fresh.newPage();
  await second.goto("/");
  await second.getByRole("button", { name: "Ho già un account" }).click();
  const dialog = second.getByRole("dialog", { name: "Accedi" });
  await dialog.getByLabel("Email").fill(email);
  await dialog.getByLabel("Password").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Accedi", exact: true }).click();
  await expect(second.getByText("Eccoci di nuovo: i tuoi dati sono qui")).toBeVisible({ timeout: 15000 });
  await expect(second.getByRole("dialog")).toHaveCount(0);
  await expect(second.getByRole("dialog", { name: "Quali dati tengo?" })).toHaveCount(0);
  await expect(second.getByRole("region", { name: "Da fare una volta" }).getByText("Prenotare il dentista")).toBeVisible();
  await fresh.close();
});

test("collego due persone con un invito e vedo gli impegni che mi mostrano", async ({ browser, page }, testInfo) => {
  // Due browser, due accessi e l'attesa della pubblicazione: sui profili mobili serve più tempo
  test.setTimeout(120000);
  const anna = uniqueEmail("anna", testInfo);
  const bea = uniqueEmail("bea", testInfo);
  await makeUser("Anna", anna);
  await makeUser("Bea", bea);
  const date = today();

  await seed(page, {
    activities: [{ id: "a1", name: "Lezione di piano", energy: "medium", type: "passion", status: "active", goal: { amount: 1, period: "week" }, resumeNote: "" }],
    blocks: [{ id: "b1", date, start: "23:00", end: "23:45", activityId: "a1", done: false }],
  });
  await page.goto("/");
  const annaDialog = await signIn(page, anna);
  await annaDialog.getByRole("button", { name: "Invita una persona" }).click();
  const code = (await annaDialog.locator(".people-code").textContent()).trim();
  expect(code).toMatch(/^[A-Za-z0-9_-]{24}$/);

  const context = await browser.newContext();
  const beaPage = await context.newPage();
  await seed(beaPage);
  await beaPage.goto("/");
  const beaDialog = await signIn(beaPage, bea);
  await beaDialog.getByLabel("Hai ricevuto un codice?").fill(`Collegati con me: http://x/#invite=${code}`);
  await beaDialog.getByRole("button", { name: "Collegati" }).click();
  await expect(beaDialog.getByText("Ora sei collegato con Anna.")).toBeVisible();

  // Anna mostra anche i titoli; riapre l'account per vedere Bea collegata
  await annaDialog.getByRole("button", { name: "Chiudi" }).click();
  const again = await openAccount(page);
  await again.getByLabel("Cosa mostri a Bea").selectOption("details");
  await again.getByRole("button", { name: "Chiudi" }).click();

  await beaDialog.getByRole("button", { name: "Chiudi" }).click();
  await expect(async () => {
    await beaPage.reload();
    await beaPage.locator('nav:is([aria-label="Sezioni"]):visible').getByRole("button", { name: "Calendario", exact: true }).click();
    await expect(beaPage.getByRole("region", { name: "Impegni condivisi" })).toContainText("Lezione di piano", { timeout: 3000 });
  }).toPass({ timeout: 25000 });
  await context.close();
});

test("cancello l'account: online sparisce tutto, sul dispositivo i dati restano", async ({ page }, testInfo) => {
  const email = uniqueEmail("addio", testInfo);
  const userId = await makeUser("Addio", email);
  await seed(page);
  await page.goto("/");
  const dialog = await signIn(page, email);
  await dialog.getByRole("button", { name: "Cancella l'account" }).click();
  const confirm = dialog.getByRole("button", { name: "Cancella per sempre" });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel("Conferma la cancellazione").fill("ELIMINA");
  await confirm.click();
  await expect(page.getByText("Account cancellato. I dati restano solo su questo dispositivo.")).toBeVisible();
  const { data } = await admin.auth.admin.getUserById(userId);
  expect(data.user).toBeNull();
  const { data: state } = await admin.from("user_state").select("user_id").eq("user_id", userId);
  expect(state).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Accedi o crea un account" })).toBeVisible();
});
