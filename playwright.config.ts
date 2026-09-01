import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env["PIM_E2E_BASE_URL"] ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1280, height: 1000 },
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Zo kan de test ook draaien op een machine met een al aanwezige
        // Chromium (CI-cache of sandbox) zonder extra download.
        launchOptions: process.env["PIM_E2E_CHROMIUM"]
          ? { executablePath: process.env["PIM_E2E_CHROMIUM"] }
          : {},
      },
    },
  ],
  webServer: process.env["PIM_E2E_BASE_URL"]
    ? undefined
    : {
        command: "bun run dev",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
