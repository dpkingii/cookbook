import { defineConfig } from "@playwright/test";

const PORT = 3199;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  globalTeardown: "./e2e/teardown.ts",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    // The installed Chrome, so no browser download is needed.
    channel: "chrome",
    viewport: { width: 412, height: 839 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: baseURL,
    env: { BETTER_AUTH_URL: baseURL },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
