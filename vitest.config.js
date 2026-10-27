import { defineConfig } from "vitest/config";

// I test girano sulla logica pura (src/logic), senza browser, con un fuso orario fisso
// così date e orari danno lo stesso risultato su ogni computer.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.js"],
    setupFiles: ["./src/logic/__tests__/setup.js"],
  },
});
