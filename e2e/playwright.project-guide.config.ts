import { defineConfig } from '@playwright/test'

// 先启动隔离预览 API 5016 和用户端 18096；本专项不执行其他工作台的数据写入测试。
export default defineConfig({
  testDir: '.',
  testMatch: 'project-workspace-guide.spec.js',
  workers: 1,
  timeout: 45_000,
  retries: 0,
  reporter: [['list']],
  use: {
    headless: true,
    colorScheme: 'light',
    viewport: { width: 1440, height: 1000 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
