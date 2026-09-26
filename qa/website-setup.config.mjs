import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: ".", testMatch: "website-setup.spec.mjs", workers: 1, timeout: 180000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
    screenshot: "only-on-failure", trace: "on", video: "off",
    viewport: { width: 1440, height: 900 },
  },
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR,
  reporter: [["list"], ["json", { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME }]],
});
