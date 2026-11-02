import { defineConfig } from '@playwright/test'

process.env.BME_FEEDBACK_USER_BASE = 'http://127.0.0.1:18082/AMEII'
process.env.BME_FEEDBACK_ADMIN_BASE = 'http://127.0.0.1:15174/admin'

export default defineConfig({
  testDir: '.', testMatch: 'feedback-workflow.spec.js', outputDir: 'output/feedback-e2e', workers: 1, timeout: 45_000,
  retries: 0, reporter: [['list']],
  use: { headless: true, viewport: { width: 1440, height: 1000 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'pnpm --filter @bme/user exec vite --mode test --host 127.0.0.1 --port 18082 --strictPort', url: 'http://127.0.0.1:18082/AMEII/', reuseExistingServer: false },
    { command: 'pnpm --filter @bme/admin exec vite --mode test --host 127.0.0.1 --port 15174 --strictPort', url: 'http://127.0.0.1:15174/admin/', reuseExistingServer: false },
  ],
})
