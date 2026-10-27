import { defineConfig, devices } from "@playwright/test";

// Test end-to-end sulla build di produzione, su desktop e sui principali dispositivi.
// WebKit è il motore di Safari: i profili iPhone e iPad lo usano, come Safari su iOS.
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
    { name: "Chrome desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "Firefox desktop", use: { ...devices["Desktop Firefox"] } },
    { name: "Safari desktop", use: { ...devices["Desktop Safari"] } },
    { name: "iPhone 15", use: { ...devices["iPhone 15"] } },
    { name: "iPad", use: { ...devices["iPad (gen 7)"] } },
    { name: "Pixel 7", use: { ...devices["Pixel 7"] } },
    { name: "Galaxy S9+", use: { ...devices["Galaxy S9+"] } },
  ],
});
