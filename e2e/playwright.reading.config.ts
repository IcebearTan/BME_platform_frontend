import { defineConfig } from '@playwright/test'
import path from 'node:path'
const backend = path.resolve(process.env.READING_BACKEND_DIR || '../backend')
const python = process.env.READING_PYTHON || path.join(backend, process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python')
const database = path.join(backend, 'data/reading-local', `e2e-${Date.now()}.sqlite`)
export default defineConfig({
  testDir: '.', testMatch: 'reading-week-real.spec.js', workers: 1, timeout: 90_000,
  reporter: [['list'], ['json', { outputFile: path.resolve('test-results/reading-e2e.json') }]],
  use: { headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure', viewport: { width: 1440, height: 1000 } },
  webServer: [
    { command: `"${python}" scripts/run_reading_local.py --port 5003 --database "${database}"`, cwd: backend, url: 'http://127.0.0.1:5003/local/health', timeout: 60000, reuseExistingServer: false, env: { PYTHONUTF8: '1' } },
    { command: 'pnpm --filter @bme/user exec vite preview --outDir dist-reading --host 127.0.0.1 --port 18093 --strictPort', url: 'http://127.0.0.1:18093/AMEII/', env: { VITE_API_BASE_URL: 'http://127.0.0.1:5003' }, reuseExistingServer: false },
    { command: 'pnpm --filter @bme/admin exec vite preview --outDir dist-reading --host 127.0.0.1 --port 15193 --strictPort', url: 'http://127.0.0.1:15193/admin/', env: { VITE_API_BASE_URL: 'http://127.0.0.1:5003' }, reuseExistingServer: false },
  ],
})
