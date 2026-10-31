import { defineConfig, devices } from "@playwright/test";

// Test end-to-end sulla build di produzione, con i due motori dell'app desktop:
// WebKit (su Linux Tauri usa WebKitGTK) e Chromium (su Windows Tauri usa WebView2).
// Una finestra stretta prova il layout quando la finestra viene rimpicciolita.
export default defineConfig({
  testDir: "./e2e",
  timeout: 45000,
  fullyParallel: true,
  // Pochi processi insieme: la misura della fluidità non deve competere per la CPU
  workers: 2,
  retries: 1,
  reporter: [["list"], ["json", { outputFile: "test-results/e2e.json" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    timezoneId: "Europe/Rome",
    locale: "it-IT",
  },
  webServer: {
    command: "npm run build && npx vite preview --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    { name: "Chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "WebKit", use: { ...devices["Desktop Safari"] } },
    { name: "Finestra stretta", use: { ...devices["Desktop Chrome"], viewport: { width: 480, height: 800 } } },
  ],
});
