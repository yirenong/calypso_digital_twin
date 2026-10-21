import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/backend-ui',
  workers: 1,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:5177', channel: 'chrome', headless: true },
  webServer: { command: 'npx vite --mode backend-test --host 127.0.0.1 --port 5177', url: 'http://127.0.0.1:5177', reuseExistingServer: false },
})
