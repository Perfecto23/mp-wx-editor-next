import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:3550', permissions: ['clipboard-read', 'clipboard-write'],
    launchOptions: { executablePath: process.env.CHROMIUM_PATH }, trace: 'retain-on-failure' },
  webServer: { command: 'python3 -m http.server 3550 --bind 127.0.0.1 --directory out', url: 'http://127.0.0.1:3550', reuseExistingServer: false },
});
