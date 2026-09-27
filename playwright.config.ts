import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env["E2E_BASE_URL"];
const baseURL = externalBaseURL ?? "http://localhost:8080";
// Permite apontar para um Chromium já presente na máquina/CI (evita download).
const executablePath = process.env["E2E_CHROMIUM_PATH"];

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env["CI"] ? 1 : 0,
  reporter: [["list"]],
  // Sem E2E_BASE_URL, sobe o servidor local (no CI e na máquina) antes dos testes.
  // `bun --bun` garante WebSocket nativo para o supabase-js no SSR.
  webServer: externalBaseURL
    ? undefined
    : {
        command: "bun --bun run dev --port 8080 --strictPort",
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: !process.env["CI"],
        stdout: "ignore",
        stderr: "pipe",
      },
  // A primeira visita a cada rota compila o módulo no dev server; aquece antes.
  globalSetup: "./tests/e2e/warmup.ts",
  use: {
    baseURL,
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],
});
