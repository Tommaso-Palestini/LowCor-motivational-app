import { defineConfig } from "vitest/config";

// Test del backend: servono lo stack locale avviato (npx supabase start) e Docker.
// Girano in sequenza perché i casi si costruiscono uno sull'altro (inviti, collegamenti, cancellazione).
export default defineConfig({
  test: {
    environment: "node",
    include: ["supabase/tests/**/*.test.js"],
    testTimeout: 20000,
    hookTimeout: 60000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
