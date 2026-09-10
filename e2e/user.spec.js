import { test, expect } from '@playwright/test'

// 用户端（apps/user）冒烟安全网：登录页渲染 / 前端路由跳转 / DewUI 组件库挂载
// 注意：无后端也能跑——三条用例只依赖前端渲染，不依赖接口成功

const BASE = 'http://127.0.0.1:18081/AMEII'

test('登录页正常渲染', async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await expect(page.locator('h2', { hasText: '登录账户' })).toBeVisible()
  await expect(page.locator('input[placeholder="请输入密码"]')).toBeVisible()
  await expect(page.locator('input[placeholder="请输入邮箱地址"]')).toBeVisible()
})

test('前端路由跳转：登录页 → 注册页', async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await page.getByRole('button', { name: '没有账户？立即注册' }).click()
  await expect(page).toHaveURL(/\/register/)
  await expect(page.locator('h2', { hasText: '创建账户' })).toBeVisible()
})

test('DewUI 组件库展示页挂载', async ({ page }) => {
  await page.goto(`${BASE}/ui-showcase`)
  await expect(page.locator('h1', { hasText: 'Dew UI 组件库' })).toBeVisible()
  await expect(page.getByRole('button', { name: '默认玻璃' })).toBeVisible()
})

test('顶部学期营入口直达当前主推营期', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { username: 'test_user', role: 'user' }, checkinInfo: {},
    }))
  })
  await page.route('http://127.0.0.1:5001/**', route => {
    const url = route.request().url()
    if (url.endsWith('/camp/featured')) {
      return route.fulfill({ json: { code: 200, session: { id: 10 }, is_member: false, my_request: null } })
    }
    if (url.endsWith('/camp/sessions')) {
      return route.fulfill({ json: { code: 200, sessions: [{ id: 10, name: '秋季学期营', status: 'selecting', is_member: false }] } })
    }
    if (url.endsWith('/camp/join-requests/mine')) {
      return route.fulfill({ json: { code: 200, requests: [] } })
    }
    return route.fulfill({ json: { code: 200 } })
  })

  await page.goto(`${BASE}/home`)
  await page.locator('.camp-nav-item').click()
  await expect(page).toHaveURL(/\/camp\?sid=10$/)
})

test('首页卡片轮播：正反切换时环形侧卡不覆盖退出卡', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { username: 'test_user', role: 'user' }, checkinInfo: {},
    }))
  })
  await page.route('http://127.0.0.1:5001/**', route => (
    route.fulfill({ json: { code: 200, data: [] } })
  ))

  await page.goto(`${BASE}/home`)
  await page.locator('.el-carousel__indicator').nth(0).click()
  await page.locator('.el-carousel__arrow--right').click()

  const layers = await page.locator('.el-carousel__item').evaluateAll(items => (
    items.map(item => Number(getComputedStyle(item).zIndex))
  ))
  expect(layers).toEqual([2, 3, 1])

  await page.locator('.el-carousel__indicator').nth(2).click()
  await page.waitForTimeout(500)
  await page.locator('.el-carousel__arrow--left').click()
  const reverseToSecondLayers = await page.locator('.el-carousel__item').evaluateAll(items => (
    items.map(item => Number(getComputedStyle(item).zIndex))
  ))
  expect(reverseToSecondLayers).toEqual([1, 3, 2])

  await page.waitForTimeout(500)
  await page.locator('.el-carousel__arrow--left').click()
  const reverseToFirstLayers = await page.locator('.el-carousel__item').evaluateAll(items => (
    items.map(item => Number(getComputedStyle(item).zIndex))
  ))
  expect(reverseToFirstLayers).toEqual([3, 2, 1])
})
