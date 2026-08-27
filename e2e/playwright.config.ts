import { defineConfig } from '@playwright/test'

// BME 前端 monorepo e2e 安全网（清债批次 1 建立）
// 测试前端使用独立端口，避免复用开发/预览服务后加载错误的 API 环境。
// 5002 预览 API 可复用，但 preview-api.spec.js 会校验其契约，旧实例无法静默通过。
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
      command: 'pnpm --filter @bme/user dev:test',
      url: 'http://127.0.0.1:18081/AMEII/',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @bme/admin dev:test',
      url: 'http://127.0.0.1:15173/admin/',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm dev:preview:api',
      url: 'http://127.0.0.1:5002/camp/sessions/1',
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
})
