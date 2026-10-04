import { defineConfig } from "playwright/test";
export default defineConfig({
  testDir: ".", testMatch: "individual-owner.spec.mjs", workers: 1, timeout: 420000,
  use: { reducedMotion: "reduce", actionTimeout: 15000, navigationTimeout: 30000, baseURL: process.env.PLAYWRIGHT_BASE_URL, storageState: process.env.PLAYWRIGHT_STORAGE_STATE,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE, args: ["--disable-gpu", "--disable-lcd-text"] },
    screenshot: "only-on-failure", trace: "on", video: "off" },
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR,
  reporter: [["list"], ["json", { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME }]],
});
