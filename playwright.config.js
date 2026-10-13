import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/ui',
  use: { baseURL: 'http://127.0.0.1:5175', channel: 'chrome', headless: true },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5175', reuseExistingServer: !process.env.CI },
})
