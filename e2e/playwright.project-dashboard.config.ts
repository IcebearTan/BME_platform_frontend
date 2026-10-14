import { defineConfig } from '@playwright/test'

// 独立端口，避免与积分分支的开发/检查进程共用服务。
export default defineConfig({
  testDir: '.', testMatch: 'camp-project-dashboard.spec.js', timeout: 60_000,
  retries: 0, workers: 2, reporter: [['list']],
  use: { headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'pnpm --filter @bme/user run dev:test --port 18091', url: 'http://127.0.0.1:18091/AMEII/', reuseExistingServer: false, timeout: 60_000 },
    { command: 'pnpm --filter @bme/admin run dev:test --port 15183', url: 'http://127.0.0.1:15183/admin/', reuseExistingServer: false, timeout: 60_000 },
  ],
})
