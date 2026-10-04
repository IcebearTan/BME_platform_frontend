// D1 身份安全地基 e2e：会话门面（cookie/compat 双模式）、401 machine 语义、
// MFA 二步表单、安全设置页挂载。mock 策略与既有 spec 一致（route 拦 5001 +
// localStorage 播种），不依赖真实后端。
import { test, expect } from '@playwright/test'

const USER_BASE = 'http://127.0.0.1:18081/AMEII'
const ADMIN_BASE = 'http://127.0.0.1:15173/admin'
const API = 'http://127.0.0.1:5001'

test('cookie 模式：bootstrap 经 typed refresh 恢复会话（刷新页不掉登录）', async ({ page }) => {
  await page.route(`${API}/**`, (route) => {
    const url = route.request().url()
    if (url.endsWith('/auth/session/config')) {
      return route.fulfill({ json: { code: 200, refresh_cookie_enabled: true,
        legacy_deadline: '2099-01-01T00:00:00', mfa_enforced_for_admin: false } })
    }
    if (route.request().method() === 'POST' && url.endsWith('/auth/user/refresh')) {
      return route.fulfill({ json: { code: 200, token: 'e2e-cookie-access',
        role: 'user', permissions: [], level: 1 } })
    }
    // 首页公开数据兜底（登录态由门面恢复，非 401 即不触发续期）
    return route.fulfill({ json: { code: 200, data: [] } })
  })

  // 不播种任何 localStorage token——cookie 模式的登录态只来自 refresh
  await page.goto(`${USER_BASE}/home`)
  await expect(page).toHaveURL(/\/home/)
  // 门面状态经 window 可观察：已认证（拿回了 access）
  const authenticated = await page.evaluate(async () => {
    const { authSession } = await import('/AMEII/src/api.js')
    return authSession.state === 'authenticated' && authSession.getToken() === 'e2e-cookie-access'
  })
  expect(authenticated).toBe(true)
})

test('cookie 模式：refresh 终态（SESSION_REVOKED）直接终止会话并跳登录，不无限重试', async ({ page }) => {
  let refreshCalls = 0
  await page.route(`${API}/**`, (route) => {
    const url = route.request().url()
    if (url.endsWith('/auth/session/config')) {
      return route.fulfill({ json: { code: 200, refresh_cookie_enabled: true,
        legacy_deadline: '2099-01-01T00:00:00', mfa_enforced_for_admin: false } })
    }
    if (route.request().method() === 'POST' && url.endsWith('/auth/user/refresh')) {
      refreshCalls += 1
      return route.fulfill({ status: 401, json: { code: 401, machine: 'SESSION_REVOKED',
        message: '登录已失效，请重新登录' } })
    }
    return route.fulfill({ json: { code: 200, data: [] } })
  })

  await page.goto(`${USER_BASE}/home`)
  await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  // 终态不触发续期循环：refresh 只会被 bootstrap 调一次
  await page.waitForTimeout(600)
  expect(refreshCalls).toBeLessThanOrEqual(1)
})

test('compat 模式：并发 401 只触发一次 refresh（单飞重放）', async ({ page }) => {
  let refreshCalls = 0
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-stale-access')
    localStorage.setItem('bme-user-token-refresh', 'e2e-rt')
  })
  await page.route(`${API}/**`, (route) => {
    const url = route.request().url()
    if (url.endsWith('/auth/session/config')) {
      return route.fulfill({ json: { code: 200, refresh_cookie_enabled: false } })
    }
    if (route.request().method() === 'POST' && url.endsWith('/auth/refresh')) {
      refreshCalls += 1
      return route.fulfill({ json: { code: 200, token: 'e2e-new-access',
        refresh_token: 'e2e-rt2', role: 'user', permissions: [], level: 1 } })
    }
    // 业务请求一律 401（无 machine）——触发静默续期重放
    return route.fulfill({ status: 401, json: { code: 401, message: '访问令牌已过期' } })
  })

  await page.goto(`${USER_BASE}/home`)
  await page.waitForTimeout(1200)
  expect(refreshCalls).toBe(1)
})

test('管理端 MFA 二步：凭据通过后出现验证码视图与恢复码切换', async ({ page }) => {
  const posted = []
  await page.route(`${API}/**`, (route) => {
    const url = route.request().url()
    if (route.request().method() === 'POST' && url.endsWith('/auth/admin_login')) {
      posted.push(route.request().postDataJSON())
      return route.fulfill({ json: { code: 200, mfa_required: true, mfa_token: 'e2e-ticket' } })
    }
    if (route.request().method() === 'POST' && url.endsWith('/auth/admin_login/mfa')) {
      return route.fulfill({ json: { code: 200, token: 'e2e-mfa-access', refresh_token: 'e2e-mfa-rt',
        User_Name: 'e2e', role: 'super_admin', permissions: [] } })
    }
    return route.fallback()
  })

  await page.goto(`${ADMIN_BASE}/login`)
  await page.locator('input[placeholder="输入邮箱"]').fill('admin@seed.dev')
  await page.locator('input[placeholder="输入密码"]').fill('12345678')
  await page.getByRole('button', { name: /^登录$/ }).click()

  // 二步视图出现
  await expect(page.locator('input[placeholder="6 位动态验证码"]')).toBeVisible()
  // 恢复码切换
  await page.getByRole('button', { name: '使用恢复码' }).click()
  await expect(page.locator('input[placeholder="恢复码（8 位）"]')).toBeVisible()
  await page.getByRole('button', { name: '使用动态验证码' }).click()
  await expect(page.locator('input[placeholder="6 位动态验证码"]')).toBeVisible()
  // 返回重输密码
  await page.getByRole('button', { name: '返回重输密码' }).click()
  await expect(page.locator('input[placeholder="输入密码"]')).toBeVisible()
  expect(posted).toHaveLength(1)
})

test('安全设置页挂载：状态卡与入口按钮', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bme-admin-token', 'e2e-mock-token')
    localStorage.setItem('bme-admin-state', JSON.stringify({
      user: { role: 'super_admin', permissions: [], User_Name: 'e2e' }, isDarkMode: false,
    }))
  })
  await page.route(`${API}/**`, (route) => {
    const url = route.request().url()
    if (url.endsWith('/auth/session/config')) {
      return route.fulfill({ json: { code: 200, refresh_cookie_enabled: false } })
    }
    if (url.endsWith('/auth/mfa/status')) {
      return route.fulfill({ json: { code: 200, enabled: false, pending: false,
        recovery_codes_remaining: 0, enforced: false } })
    }
    if (url.endsWith('/user/user_index')) {
      // 壳层 HomeView 校验 super_admin，缺 role 会被当非管理员踢回登录页
      return route.fulfill({ json: { code: 200, role: 'super_admin', permissions: [], User_Name: 'e2e' } })
    }
    return route.fulfill({ json: { code: 200, data: [] } })
  })

  await page.goto(`${ADMIN_BASE}/system/security`)
  await expect(page.locator('.page-title', { hasText: '安全设置' })).toBeVisible()
  await expect(page.locator('.status-item', { hasText: '动态口令（TOTP）' })).toBeVisible()
  await expect(page.getByRole('button', { name: '绑定动态口令' })).toBeVisible()
})
