import { defineConfig } from '@playwright/test'

// 本地真实API专项；先启动隔离预览库与18096前端，避免使用积分分支的开发服务。
export default defineConfig({
  testDir: '.', testMatch: ['camp-project-workspace.spec.js', 'camp-project-workspace-release.spec.js'], workers: 1,
  timeout: 45_000, retries: 0, reporter: [['list']],
  use: { headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
})
