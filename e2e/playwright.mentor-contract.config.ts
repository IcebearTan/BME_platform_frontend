import { defineConfig } from '@playwright/test'

// Start user dev:test (18081) and the disposable backend fixture (5014) first.
export default defineConfig({
  testDir: '.',
  testMatch: 'mentor-overview-contract.live.js',
  workers: 1,
  timeout: 45_000,
  retries: 0,
  reporter: [['list']],
  use: { headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
})
