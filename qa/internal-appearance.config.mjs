import { defineConfig } from "playwright/test";
export default defineConfig({
  testDir: ".",
  testMatch: "internal-appearance.spec.mjs",
  workers: 1,
  timeout: 360000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
    screenshot: "only-on-failure",
    trace: process.env.PLAYWRIGHT_TRACE || "off",
    video: process.env.PLAYWRIGHT_VIDEO || "off",
  },
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR,
  reporter: [["list"], ["json", { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME }]],
});
