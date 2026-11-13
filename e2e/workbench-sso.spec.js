import { test, expect } from '@playwright/test'
const BASE = 'http://127.0.0.1:18081/AMEII'
const params = { client_id: 'workbench', response_type: 'code', scope: 'workbench:access',
  redirect_uri: 'http://172.25.56.83:8080/workbench/api/auth/callback', state: 's'.repeat(43),
  code_challenge: 'c'.repeat(43), code_challenge_method: 'S256' }

async function setup(page, status) {
  await page.addInitScript(() => localStorage.setItem('bme-user-token', 'isolated-test-token'))
  let body
  await page.route('http://127.0.0.1:5001/**', (route) => {
    if (new URL(route.request().url()).pathname === '/workbench-sso/authorize') {
      body = route.request().postDataJSON()
      return route.fulfill({ status, json: status === 200 ? { redirect_url: 'http://workbench.test/callback?code=one-use&state=test' } : { message: '需要有效社团身份才能进入工作台' } })
    }
    return route.fulfill({ json: { code: 200, data: {} } })
  })
  await page.route('http://workbench.test/**', (route) => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<p>工作台回调</p>' }))
  return () => body
}

test('工作台授权使用训练营现有登录，完整提交PKCE与固定回调字段', async ({ page }) => {
  const body = await setup(page, 200)
  await page.goto(BASE + '/workbench-login?' + new URLSearchParams(params))
  await expect(page.getByText('工作台回调')).toBeVisible()
  expect(body()).toEqual(params)
})

test('无社团资格时停留授权页并展示原因，不进入工作台', async ({ page }) => {
  await setup(page, 403)
  await page.goto(BASE + '/workbench-login?' + new URLSearchParams(params))
  await expect(page.getByRole('alert')).toHaveText('需要有效社团身份才能进入工作台')
  await expect(page).toHaveURL(/workbench-login/)
})

async function entrySetup(page, eligible) {
  const calls = []
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'isolated-test-token')
    localStorage.setItem('bme-user-state', JSON.stringify({ token: 'isolated-test-token', isLogin: true,
      user: { username: '测试成员', role: 'user', User_Id: '7' }, checkinInfo: {} }))
  })
  await page.route('http://127.0.0.1:5001/**', route => {
    const path = new URL(route.request().url()).pathname
    calls.push(path)
    if (path === '/work/me') return route.fulfill({ status: 410, json: { message: '旧工作台已退役' } })
    if (path === '/workbench-sso/me') return route.fulfill({ json: { code: 200, data: {
      eligibility: eligible ? { kind: 'member' } : null,
      external_url: 'http://workbench.test/workbench', workspaces: [], is_governance: false, todo: {} } } })
    if (path === '/workbench-sso/config') return route.fulfill({ json: { enabled: true, workbench_url: 'http://workbench.test/workbench' } })
    return route.fulfill({ json: { code: 200, data: {} } })
  })
  await page.route('http://workbench.test/**', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<p>独立工作台入口</p>' }))
  return calls
}

test('未设置构建入口变量时，独立成员仍可从服务台进入工作台', async ({ page }) => {
  const calls = await entrySetup(page, true)
  await page.goto(BASE + '/service-hall')
  const card = page.locator('.entry-card').filter({ hasText: '组内协作、任务跟进与工作留痕' })
  await expect(card).toBeVisible()
  await card.click()
  await expect(page).toHaveURL('http://workbench.test/workbench/work')
  expect(calls).toContain('/workbench-sso/me')
  expect(calls).toContain('/workbench-sso/config')
  expect(calls).not.toContain('/work/me')
})

test('普通用户仍不显示工作台入口', async ({ page }) => {
  const calls = await entrySetup(page, false)
  await page.goto(BASE + '/service-hall')
  await expect.poll(() => calls.includes('/workbench-sso/me')).toBe(true)
  await expect(page.locator('.entry-card').filter({ hasText: '组内协作、任务跟进与工作留痕' })).toHaveCount(0)
  expect(calls).not.toContain('/work/me')
})

test('工作台旧深链接按运行时配置转到独立站并保留查询参数', async ({ page }) => {
  await entrySetup(page, true)
  await page.goto(BASE + '/work/items/18?from=notification')
  await expect(page).toHaveURL('http://workbench.test/workbench/work/items/18?from=notification')
})
