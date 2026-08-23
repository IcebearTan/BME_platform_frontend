import { defineConfig } from '@playwright/test'

// BME 前端 monorepo e2e 安全网（清债批次 1 建立）
// 双 webServer：用户端 8081（/AMEII/）+ 管理端 5173（/admin/）
// 已有 dev server 在跑时复用（reuseExistingServer），本地与 CI 均适用
export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: {
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm dev:user',
      url: 'http://localhost:8081/AMEII/',
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: 'pnpm dev:admin',
      url: 'http://localhost:5173/admin/',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
