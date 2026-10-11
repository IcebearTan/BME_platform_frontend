import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:18081/AMEII'

async function setup(page, { mode = 'daily', dark = false, attendance = true } = {}) {
  const requests = []
  await page.addInitScript((isDarkMode) => {
    localStorage.setItem('themeInitialized', 'true')
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode,
      user: { role: 'user', verification_status: 'verified' }, checkinInfo: {},
    }))
  }, dark)
  const dates = Array.from({ length: 12 }, (_, i) => `2026-10-${String(i + 1).padStart(2, '0')}`)
  const rows = [31, 32].map((id, i) => ({
    user_id: id, username: `测试学员${i + 1}`, role: 'student', roles: ['student'],
    team_mentor_id: null, joined_at: '2026-10-01', total_days: 6, total_hours: 24,
    weeks: dates.map((d, n) => ({ label: `第${String(n + 1).padStart(2, '0')}周`, start: d, end: d, days: 2, hours: 8 })),
    daily: Object.fromEntries(dates.map(d => [d, { status: 'present', total_hours: 8 }])),
  }))
  await page.route('http://127.0.0.1:5001/**', route => {
    const path = new URL(route.request().url()).pathname
    requests.push({ path, method: route.request().method() })
    let data = { code: 200, data: {} }
    if (path === '/camp/sessions') data = { code: 200, sessions: [{
      id: 7, name: '考勤模式测试营', category: 'learning', camp_type: 'short_term',
      status: 'running', start_date: '2026-10-01', end_date: '2026-10-30',
      is_member: false, has_camp_access: true, my_staff_role: 'owner',
      available_perspectives: ['teacher'], my_permissions: ['member.manage', 'attendance.read_all'],
      policy: { attendance_mode: mode === 'legacy' ? undefined : mode, capabilities: { attendance } },
    }] }
    if (path.endsWith('/teacher/overview')) data = { code: 200, overview: { counts: {}, work_items: [], my_staff_role: 'owner' } }
    if (path.endsWith('/members')) data = { code: 200, members: rows, total: 2, counts: { student: 2, mentor: 0 } }
    if (path === '/camp/attendance/dashboard/7') data = { code: 200, mode, rows, dates }
    if (path.startsWith('/camp/attendance/plan/')) data = { code: 200, dates: ['2026-10-01'], changes: [], range: { start: '2026-10-01', end: '2026-10-30' } }
    return route.fulfill({ json: data })
  })
  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('主负责人', { exact: true })).toBeVisible()
  return requests
}

for (const mode of ['weekly', 'daily']) {
  for (const dark of [false, true]) {
    test(`全营考勤 ${mode} ${dark ? '暗色' : '浅色'}：表头、条纹与固定列跟随主题`, async ({ page }, testInfo) => {
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.setViewportSize({ width: 1100, height: 900 })
      await setup(page, { mode, dark })
      await page.getByRole('button', { name: '全营考勤', exact: true }).click()
      const table = page.locator('.mentor-dashboard .el-table')
      await expect(table.locator('.el-table__body .el-table__row')).toHaveCount(2)
      await expect(page.locator('body')).toHaveClass(new RegExp(dark ? 'theme-dark' : 'theme-light'))
      const colors = await table.evaluate(el => {
        const ctx = document.createElement('canvas').getContext('2d')
        const rgb = color => {
          ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1)
          return Array.from(ctx.getImageData(0, 0, 1, 1).data)
        }
        return [...el.querySelectorAll('thead th, tbody tr:first-child td, tbody tr.el-table__row--striped td')].map(cell => {
          let surface = cell
          while (surface.parentElement && rgb(getComputedStyle(surface).backgroundColor)[3] === 0) surface = surface.parentElement
          return { bg: rgb(getComputedStyle(surface).backgroundColor), text: rgb(getComputedStyle(cell).color) }
        })
      })
      expect(colors.length).toBeGreaterThan(5)
      for (const { bg, text } of colors) {
        expect(bg[3]).toBeGreaterThanOrEqual(250)
        if (dark) {
          expect(Math.max(...bg.slice(0, 3))).toBeLessThan(80)
          expect(Math.min(...text.slice(0, 3))).toBeGreaterThan(120)
        } else {
          expect(Math.min(...bg.slice(0, 3))).toBeGreaterThan(200)
        }
      }
      await table.locator('tbody tr').nth(1).hover()
      await expect(table.locator('tbody tr').nth(1)).toHaveClass(/hover-row/)
      await page.screenshot({ path: testInfo.outputPath('attendance.png'), fullPage: true })
      expect(errors).toEqual([])
    })
  }
}

for (const [mode, attendance, visible] of [['weekly', true, false], ['none', false, false], ['daily', true, true], ['legacy', true, true]]) {
  test(`负责人出勤日入口：${mode} 模式${visible ? '保留' : '隐藏'}`, async ({ page }) => {
    const requests = await setup(page, { mode, attendance })
    await page.getByRole('button', { name: '成员管理', exact: true }).click()
    await expect(page.locator('.member-row')).toHaveCount(2)
    const buttons = page.getByRole('button', { name: '出勤日', exact: true })
    await expect(buttons).toHaveCount(visible ? 2 : 0)
    if (visible) {
      await buttons.first().click()
      await expect(page.getByText('承诺出勤日 · 测试学员1', { exact: true })).toBeVisible()
      expect(requests.filter(r => r.path.startsWith('/camp/attendance/plan/'))).toHaveLength(1)
    } else {
      expect(requests.filter(r => r.path.startsWith('/camp/attendance/plan/'))).toHaveLength(0)
    }
    expect(requests.filter(r => r.method !== 'GET')).toHaveLength(0)
  })
}
