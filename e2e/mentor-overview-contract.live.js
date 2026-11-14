// Explicit live fixture check; excluded from default *.spec.js discovery.
// Backend: python scripts/serve_meeting_contract_fixture.py (isolated SQLite, port 5014).
import { test, expect } from '@playwright/test'

test('真实组会接口：日期分组、导生搜索、游标分页和日期范围配套', async ({ page, request }) => {
  const response = await request.get('http://127.0.0.1:5014/audit/session')
  expect(response.ok()).toBe(true)
  const fixture = await response.json(), errors = [], apiCalls = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(token => {
    localStorage.setItem('bme-user-token', token)
    localStorage.setItem('themeInitialized', 'true')
    localStorage.setItem('bme-user-state', JSON.stringify({ token, isLogin: true,
      isDarkMode: false, user: { role: 'user' }, checkinInfo: {} }))
  }, fixture.token)
  await page.route('http://127.0.0.1:5001/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/meetings/all') || url.pathname.endsWith('/progress/board')) {
      apiCalls.push(url.href)
      const real = await route.fetch({ url: 'http://127.0.0.1:5014' + url.pathname + url.search })
      expect(real.status()).toBe(200)
      return route.fulfill({ response: real })
    }
    if (url.pathname === '/camp/sessions') return route.fulfill({ json: { code: 200, sessions: [{
      id: fixture.sid, name: '真实接口隔离验证营', category: 'learning', status: 'running',
      start_date: '2026-09-01', end_date: '2026-12-31', is_member: false,
      my_staff_role: 'teacher', available_perspectives: ['teacher'], has_camp_access: true,
      my_permissions: ['member.manage'], policy: { capabilities: {} },
    }] } })
    return route.fulfill({ json: { code: 200, refresh_cookie_enabled: false,
      overview: { counts: {}, work_items: [] }, data: {}, notifications: [], unread_count: 0 } })
  })
  await page.goto(`http://127.0.0.1:18081/AMEII/camp?sid=${fixture.sid}`)
  await page.getByRole('button', { name: '组会总览', exact: true }).click()
  await expect(page.locator('.week-roster .week-team')).toHaveCount(2)
  await expect(page.locator('.week-error')).toHaveCount(0)
  await page.getByRole('button', { name: '按日期查看', exact: true }).click()
  await expect(page.getByText('全营组会（14）')).toBeVisible()
  await expect(page.locator('.folder-list .folder')).toHaveCount(10)
  const search = page.getByPlaceholder('输入导生姓名')
  await search.fill(fixture.mentor_name)
  await search.press('Enter')
  await expect(page.getByText('全营组会（13）')).toBeVisible()
  await page.getByRole('button', { name: '加载更早的组会' }).click()
  await expect(page.locator('.folder-list .folder')).toHaveCount(11)
  expect(apiCalls.some(url => url.includes('before_date='))).toBe(true)
  await page.getByRole('button', { name: '按日期筛选', exact: true }).click()
  await page.locator('.date-field input').nth(0).fill('2026-11-10')
  await page.locator('.date-field input').nth(1).fill('2026-11-12')
  await page.getByRole('button', { name: '确定', exact: true }).click()
  await expect(page.getByText('全营组会（1）')).toBeVisible()
  await expect(page.locator('.folder-list .folder')).toHaveCount(1)
  await page.getByRole('button', { name: '学习进度', exact: true }).click()
  await expect(page.locator('.teacher-progress .error-box')).toHaveCount(0)
  await expect(page.getByPlaceholder('输入导生姓名')).toBeVisible()
  expect(errors).toEqual([])
})
