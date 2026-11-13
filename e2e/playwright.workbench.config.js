import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  testMatch: 'workbench-sso.spec.js',
  timeout: 30_000,
  workers: 2,
  retries: 0,
  reporter: [['list']],
  use: { headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: 'pnpm --filter @bme/user dev:test',
    url: 'http://127.0.0.1:18081/AMEII/',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
