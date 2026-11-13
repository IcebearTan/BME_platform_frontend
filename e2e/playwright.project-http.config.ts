import {defineConfig} from '@playwright/test'

export default defineConfig({
  testDir: '.', testMatch: 'project-http.spec.js', workers: 1, timeout: 45000, retries: 0,
  outputDir: '../playwright-report/project-http',
  reporter: [['list']], use: {headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure'},
  webServer: {command: 'VITE_API_BASE_URL=/api pnpm --filter @bme/user exec vite --config vite.http-check.config.js --mode test',
    url: 'http://127.0.0.1:18098/AMEII/', reuseExistingServer: false, timeout: 60000},
})
