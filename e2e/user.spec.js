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

// 09-15 用户定：撤首页主推营动态帧（「报名进行中/新营期筹备中」状态化 banner）——
// 相关两用例（主推帧/兜底帧）随之移除，第一帧回归静态「营期中心」入口

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

// ── 社团干事身份（功能扩展轮 §四）：主页身份卡 + 社区卡片徽章 ──

async function loginAsUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { username: 'e2e_user', role: 'user', User_Id: '0000021' }, checkinInfo: {},
    }))
  })
}

test('个人主页：社团身份卡渲染，同职位多组合并', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/user/user_index')) {
      return route.fulfill({ json: { code: 200, message: 'ok', User_Name: 'e2e_user', User_Id: '0000021',
        officers: [
          { title: '社长', department: null, term_start: '2026-09-01' },
          { title: '副团支书', department: '品牌建设组', term_start: '2026-09-05' },
          { title: '副团支书', department: '行业交流组', term_start: '2026-09-05' },
        ] } })
    }
    return route.fulfill({ json: { code: 200 } })
  })

  await page.goto(`${BASE}/user`)
  await expect(page.getByText('社团身份')).toBeVisible()
  // 社长无组 → 统筹全局 + 任期起 2026.09
  await expect(page.getByText('统筹全局')).toBeVisible()
  await expect(page.getByText('2026.09 起').first()).toBeVisible()
  // 副团支书两行合并为一行：品牌建设组 / 行业交流组
  await expect(page.getByText('品牌建设组 / 行业交流组')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('个人主页：无任职不渲染身份卡（普通社员）', async ({ page }) => {
  await loginAsUser(page)
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/user/user_index')) {
      return route.fulfill({ json: { code: 200, message: 'ok', User_Name: 'e2e_user', User_Id: '0000021', officers: [] } })
    }
    return route.fulfill({ json: { code: 200 } })
  })
  await page.goto(`${BASE}/user`)
  await page.waitForTimeout(600)
  await expect(page.getByText('社团身份')).toHaveCount(0)
})

test('社区广场：讨论卡与文章卡作者徽章', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/community/feed')) {
      return route.fulfill({ json: { code: 200, data: [
        { type: 'discussion', id: 31, title: '打卡挑战周报', summary: '本周打卡汇总',
          author_id: 11, author_name: '陈嘉树', author_avatar: '', author_badge: '社长',
          created_at: '2026-09-12 09:00:00', reply_count: 2, like_count: 1, view_count: 9,
          is_pinned: false, replies: [] },
        { type: 'article', id: 41, article_id: 41, article_version: 2, title: '柔性电子入门',
          summary: '器件与制备工艺综述', author_id: 12, author_name: '林知遥', author_avatar: '',
          author_badge: '组长', created_at: '2026-09-11 20:00:00', reply_count: 0, like_count: 3,
          view_count: 20, is_pinned: false },
      ], total: 2, page: 1, per_page: 10, pages: 1 } })
    }
    return route.fulfill({ json: { code: 200 } })
  })

  await page.goto(`${BASE}/community`)
  await expect(page.getByText('打卡挑战周报')).toBeVisible()
  // 讨论卡作者行徽章
  await expect(page.locator('.dc-author').filter({ hasText: '陈嘉树' }).getByText('社长')).toBeVisible()
  // 文章卡作者行徽章
  await expect(page.locator('.ac-author').filter({ hasText: '林知遥' }).getByText('组长')).toBeVisible()
  expect(pageErrors).toEqual([])
})
