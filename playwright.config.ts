import { defineConfig } from "@playwright/test";

/**
 * E2E contra el stack real (backend Go :8080 + Next :3001).
 *
 * En CI el workflow `.github/workflows/e2e.yml` levanta postgres/redis
 * (services), el backend (auto-migra al arrancar) + seed, y `next start`.
 * En local se asume que el stack ya está corriendo (los servicios systemd
 * `coffee-api`/`coffee-web` de esta máquina) con la DB seedeada.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // un solo browser; las specs son flujos de usuario
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
