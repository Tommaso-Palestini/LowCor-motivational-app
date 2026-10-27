import { expect, test } from "@playwright/test";
import { LEGAL_VERSION } from "../src/logic/consent.js";

// Dati di partenza: l'esempio dell'app, onboarding già fatto, nessun annuncio a schermo intero in mezzo.
async function seed(page, extra = {}) {
  await page.addInitScript((data) => {
    if (!sessionStorage.getItem("seeded")) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("daily-app-data", JSON.stringify(data));
    }
  }, { onboarded: true, consent: { version: LEGAL_VERSION, acceptedAt: "2026-10-27T09:00:00.000Z" }, settings: { fullGas: false, blockAlerts: false }, ...extra });
}

// Raccoglie gli errori della pagina: un test fallisce se ce ne sono
function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !/favicon|serviceWorker|sw\.js|Failed to load resource/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  return errors;
}

// La barra di navigazione visibile: in alto su desktop, in basso sul telefono
function nav(page) {
  return page.locator('nav:is([aria-label="Sezioni"], [aria-label="Sections"]):visible');
}

async function goTo(page, label) {
  await nav(page).getByRole("button", { name: label, exact: true }).click();
}

async function expectNoHorizontalScroll(page) {
  // Sui telefoni, se il contenuto è più largo dello schermo il browser allarga la viewport:
  // confrontiamo quindi anche con la larghezza reale del dispositivo.
  const { overflow, widened } = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    widened: window.innerWidth - screen.width,
  }));
  expect(overflow, "la pagina non deve scorrere in orizzontale").toBeLessThanOrEqual(1);
  expect(widened, "il contenuto non deve allargare la viewport del telefono").toBeLessThanOrEqual(1);
}

test("onboarding: modelli, prima settimana e ingresso nell'app", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "La tua giornata, in un anello." })).toBeVisible();
  await page.getByPlaceholder("Il tuo nome").fill("Giulia");
  await expect(page.getByRole("button", { name: "Cominciamo" })).toBeDisabled();
  await page.getByRole("link", { name: "l'informativa privacy" }).click();
  await expect(page.frameLocator(".legal-frame").getByRole("heading", { name: "Privacy" }).first()).toBeVisible();
  await page.getByRole("button", { name: "Chiudi" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Cominciamo" }).click();
  await page.getByRole("button", { name: /Leggere di più/ }).click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByRole("button", { name: "Avanti" }).click();
  await page.getByRole("button", { name: "Entra in LowCor" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".today-title")).toBeVisible();
  await expect(page.getByText(/© \d{4} LowCor/)).toBeAttached();
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

test("tutte le sezioni si aprono senza errori e senza scroll orizzontale", async ({ page }) => {
  const errors = watchErrors(page);
  await seed(page);
  await page.goto("/");
  for (const [label, heading] of [
    ["Attività", "Quello che conta per te"],
    ["Calendario", null],
    ["Obiettivi", "Lo schema 9×9"],
    ["Idee", null],
    ["Oggi", null],
  ]) {
    await goTo(page, label);
    if (heading) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
    await page.waitForTimeout(300);
    await expectNoHorizontalScroll(page);
  }
  expect(errors).toEqual([]);
});

test("aggiungo un blocco oggi e lo segno come fatto", async ({ page }) => {
  await seed(page, { blocks: [] });
  await page.goto("/");
  await page.getByLabel("Attività del blocco").selectOption({ label: "Palestra" });
  await page.getByLabel("Inizio").fill("23:00");
  await page.getByLabel("Fine").fill("23:30");
  await page.getByRole("button", { name: "Aggiungi blocco" }).click();
  const item = page.locator(".day-item").filter({ hasText: "Palestra" });
  await expect(item).toBeVisible();
  await item.getByRole("checkbox").check();
  await expect(item.getByRole("checkbox")).toBeChecked();
});

test("focus: parte, mostra il timer e si riduce a icona", async ({ page }) => {
  await seed(page);
  await page.goto("/");
  await page.locator(".topbar-focus").click();
  await page.getByRole("button", { name: /Inizia \d+ minuti/ }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.locator(".focus-timer-wedge")).toBeAttached();
  await page.getByRole("button", { name: "Marrone" }).click();
  await expect(page.getByRole("button", { name: "Marrone" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("slider", { name: "Volume" })).toBeVisible();
  await page.getByRole("button", { name: "Riduci a icona" }).click();
  await expect(page.getByRole("button", { name: /Torna al focus/ })).toBeVisible();
});

test("impostazioni: lingua inglese e stile del testo", async ({ page }) => {
  await seed(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByRole("button", { name: "English" }).click();
  await expect(nav(page).getByRole("button", { name: "Today", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Readable/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-font", "leggibile");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("calendario: settimana e finestra dei calendari esterni", async ({ page }) => {
  const errors = watchErrors(page);
  await seed(page);
  await page.goto("/");
  await goTo(page, "Calendario");
  await expect(page.locator(".week")).toBeVisible();
  await page.getByRole("button", { name: /Calendari esterni/ }).click();
  await expect(page.getByRole("heading", { name: "Calendari esterni" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Calendari esterni" })).toBeHidden();
  expect(errors).toEqual([]);
});

test("obiettivi: apro un pilastro isolato e torno alla panoramica", async ({ page }) => {
  await seed(page);
  await page.goto("/");
  await goTo(page, "Obiettivi");
  await page.locator("[data-pillar-cell], [data-pillar-block] .cell-open").first().click();
  await expect(page.getByRole("button", { name: "Torna alla panoramica 9×9" })).toBeVisible();
  await page.getByRole("button", { name: "Torna alla panoramica 9×9" }).click();
  await expect(page.getByRole("button", { name: "Torna alla panoramica 9×9" })).toHaveCount(0);
});

test("rito della settimana: quattro passi fino in fondo", async ({ page }) => {
  await seed(page);
  await page.goto("/");
  await goTo(page, "Attività");
  await page.getByRole("button", { name: "Rivedi la settimana" }).click();
  for (let step = 0; step < 3; step += 1) {
    await page.getByRole("button", { name: "Avanti" }).click();
  }
  await page.getByRole("button", { name: "Chiudi la settimana" }).click();
  await expect(page.getByRole("button", { name: "Chiudi la settimana" })).toHaveCount(0);
});

test("backup: salvo un file e lo ripristino", async ({ page }) => {
  const errors = watchErrors(page);
  await seed(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Impostazioni" }).click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Salva un backup" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^lowcor-backup-\d{4}-\d{2}-\d{2}\.json$/);

  await page.locator('input[type="file"][accept*="json"]').setInputFiles(await download.path());
  await expect(page.getByText("Sostituisce tutto quello che c'è ora")).toBeVisible();
  await page.getByRole("button", { name: "Ripristina", exact: true }).click();
  await expect(page.getByText("Backup ripristinato")).toBeVisible();
  expect(errors).toEqual([]);
});

test("privacy: chi usava già l'app accetta i termini, e può cancellare tutto", async ({ page }) => {
  const errors = watchErrors(page);
  await seed(page, { consent: undefined });
  await page.goto("/");
  const consent = page.getByRole("dialog", { name: "Privacy e termini d'uso" });
  await expect(consent).toBeVisible();
  await expect(consent.getByRole("button", { name: "Continua" })).toBeDisabled();
  await consent.getByRole("checkbox").check();
  await consent.getByRole("button", { name: "Continua" }).click();
  await expect(consent).toHaveCount(0);

  await page.getByRole("button", { name: "Impostazioni" }).click();
  await page.getByRole("button", { name: "Cancella tutti i dati" }).click();
  await page.getByRole("button", { name: "Cancella tutto" }).click();
  await expect(page.getByRole("heading", { name: "La tua giornata, in un anello." })).toBeVisible();
  expect(errors).toEqual([]);
});

test("pensieri al volo: li catturo e li smisto", async ({ page }) => {
  const errors = watchErrors(page);
  await seed(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Butta lì un pensiero" }).click();
  await page.getByRole("textbox", { name: "Pensiero" }).fill("Chiamare il dentista");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Un altro pensiero" }).click();
  await page.getByRole("textbox", { name: "Pensiero" }).fill("Imparare la chitarra");
  await page.getByRole("button", { name: "Metti da parte" }).click();

  const inbox = page.getByRole("region", { name: "Da smistare" });
  await expect(inbox.getByText("2 pensieri")).toBeVisible();
  await inbox.getByRole("listitem").filter({ hasText: "Chiamare il dentista" }).getByRole("button", { name: "Come promemoria" }).click();
  await inbox.getByRole("listitem").filter({ hasText: "Imparare la chitarra" }).getByRole("button", { name: "Come attività" }).click();
  await expect(inbox).toHaveCount(0);
  await expect(page.getByText("Chiamare il dentista")).toBeVisible();
  await expectNoHorizontalScroll(page);
  expect(errors).toEqual([]);
});

// Fluidità: misura i fotogrammi mentre la home scorre e l'anello ondeggia.
// In un browser headless i numeri sono indicativi, ma un rallentamento serio si vede.
test("fluidità della home", async ({ page }, testInfo) => {
  await seed(page);
  await page.goto("/");
  await page.waitForTimeout(800);
  const metrics = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const frames = [];
        let last = performance.now();
        const start = last;
        const height = document.documentElement.scrollHeight - innerHeight;
        function tick(now) {
          frames.push(now - last);
          last = now;
          const progress = (now - start) / 2000;
          window.scrollTo(0, Math.abs(Math.sin(progress * Math.PI)) * height);
          if (now - start < 2000) {
            requestAnimationFrame(tick);
          } else {
            const sorted = [...frames].sort((a, b) => a - b);
            resolve({
              frames: frames.length,
              fps: Math.round((frames.length / (now - start)) * 1000),
              p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
              longFrames: frames.filter((frame) => frame > 50).length,
            });
          }
        }
        requestAnimationFrame(tick);
      })
  );
  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType("navigation")[0];
    return entry ? Math.round(entry.domContentLoadedEventEnd) : null;
  });
  testInfo.annotations.push({ type: "fluidità", description: JSON.stringify({ ...metrics, domContentLoadedMs: navigation }) });
  console.log(`[${testInfo.project.name}] fps ${metrics.fps}, p95 ${metrics.p95} ms, fotogrammi lunghi ${metrics.longFrames}, DOM pronto in ${navigation} ms`);
  // Guardia contro i peggioramenti: senza GPU e con altri test in parallelo i valori sono pessimisti
  // (prima delle ottimizzazioni il 95° percentile era 230-430 ms, dopo 17-83 ms).
  expect(metrics.p95).toBeLessThan(150);
  expect(navigation).toBeLessThan(4000);
});
