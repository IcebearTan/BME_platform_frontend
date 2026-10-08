import { test, expect } from '@playwright/test'

// 积分商城 SSO 跳转（2026-10-04）：服务台入口 → POST /points-sso/ticket 换 90 秒
// 一次性 ticket → 顶层表单 POST 到商城 /sso/callback。纯 mock：本平台接口与商城
// 回调全部拦截，不访问真实积分中心，也不校验 ticket 消费（属积分中心/商城职责）。

const BASE = 'http://127.0.0.1:18081/AMEII'
const STORE_CALLBACK = 'https://store.example.edu.cn/sso/callback'
const TICKET = 'e2e-ticket-8c4f9a01e3b5d278491c36ef20718ad4'

async function loginAsUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { username: 'e2e_user', role: 'user', User_Id: '0000021' }, checkinInfo: {},
    }))
  })
}

async function mockTicketEndpoint(page, handler) {
  // 其余后端请求一律 200，避免干扰页面挂载
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/points-sso/ticket')) {
      return handler(route)
    }
    return route.fulfill({ json: { code: 200 } })
  })
}

function storeCard(page) {
  // 用 desc 定位：请求期间标题会切换为「正在进入…」，desc 保持不变
  return page.locator('.entry-card').filter({ hasText: '使用积分兑换商城礼品' }).first()
}

test('成功跳转：以表单 POST 携带 ticket 提交到商城回调', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await mockTicketEndpoint(page, (route) =>
    route.fulfill({ json: { code: 200, message: 'ok', ticket: TICKET, expires_in: 90,
      store_callback_url: STORE_CALLBACK } }))

  let storeRequest = null
  await page.route(STORE_CALLBACK, (route) => {
    storeRequest = route.request()
    return route.fulfill({ contentType: 'text/html', body: '<html><body>mock store</body></html>' })
  })

  await page.goto(`${BASE}/service-hall`)
  await storeCard(page).click()

  // 浏览器已导航到商城回调的 mock 响应
  await expect(page.locator('body')).toContainText('mock store')
  expect(storeRequest).not.toBeNull()
  expect(storeRequest.method()).toBe('POST')
  expect(storeRequest.url()).toBe(STORE_CALLBACK)
  expect(storeRequest.postData()).toBe(`ticket=${TICKET}`)
  expect(pageErrors).toEqual([])
})

test('防重复点击：请求期间二次点击不产生并发 ticket 请求', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  let ticketCalls = 0
  let releaseTicket
  const ticketReady = new Promise((resolve) => { releaseTicket = resolve })
  await mockTicketEndpoint(page, async (route) => {
    ticketCalls += 1
    // 等第二次点击验证结束再返回，避免固定延时在高并发下提前导航。
    await ticketReady
    return route.fulfill({
      json: { code: 200, message: 'ok', ticket: TICKET, expires_in: 90,
        store_callback_url: STORE_CALLBACK } })
  })
  await page.route(STORE_CALLBACK, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body>mock store</body></html>' }))

  await page.goto(`${BASE}/service-hall`)
  const card = storeCard(page)
  await card.click()
  await expect(card).toContainText('正在进入')
  await card.click() // loading 期间二次点击，应被前端守卫拦下
  expect(ticketCalls).toBe(1)
  releaseTicket()
  await expect(page.locator('body')).toContainText('mock store')

  expect(ticketCalls).toBe(1)
  expect(pageErrors).toEqual([])
})

test('后端可读错误（非校园邮箱）透出文案且不导航', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await mockTicketEndpoint(page, (route) =>
    route.fulfill({ status: 400, json: { code: 400, message: '积分商城目前仅支持中大校园邮箱账号',
      error_code: 'EMAIL_DOMAIN' } }))

  let storeHit = 0
  await page.route(STORE_CALLBACK, (route) => {
    storeHit += 1
    return route.fulfill({ contentType: 'text/html', body: '' })
  })

  await page.goto(`${BASE}/service-hall`)
  await storeCard(page).click()

  await expect(page.locator('.el-message').first()).toContainText('中大校园邮箱')
  expect(storeHit).toBe(0)
  expect(page.url()).toContain('/service-hall')
  expect(pageErrors).toEqual([])
})

test('响应缺 ticket：提示异常且不导航', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await mockTicketEndpoint(page, (route) =>
    route.fulfill({ json: { code: 200, message: 'ok', expires_in: 90,
      store_callback_url: STORE_CALLBACK } }))

  let storeHit = 0
  await page.route(STORE_CALLBACK, (route) => {
    storeHit += 1
    return route.fulfill({ contentType: 'text/html', body: '' })
  })

  await page.goto(`${BASE}/service-hall`)
  await storeCard(page).click()

  await expect(page.locator('.el-message').first()).toContainText('积分商城返回异常')
  expect(storeHit).toBe(0)
  expect(pageErrors).toEqual([])
})
