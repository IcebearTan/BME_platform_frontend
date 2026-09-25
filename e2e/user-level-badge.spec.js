import { test, expect } from '@playwright/test'

// 等级徽标（2026-09-22）：个人主页用户名旁 + 个人中心左侧栏（替代旧 超管/同学 身份标签）。
// 全局 .lv-badge 色阶单源在 @bme/styles/tokens.css；超管走 warning 琥珀（同 MenuComponent 约定：
// 管理员无等级语义，别让人误读成 LV1 普通用户）。纯 mock，不依赖后端。

const BASE = 'http://127.0.0.1:18081/AMEII'

async function loginAsUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { username: 'e2e_user', role: 'user', User_Id: '0000021' }, checkinInfo: {},
    }))
  })
}

test('个人主页（自己）：用户名旁渲染等级徽标', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/user/user_index')) {
      return route.fulfill({ json: { code: 200, message: 'ok', User_Name: 'e2e_user', User_Id: '0000021',
        role: 'user', level: 3, officers: [] } })
    }
    return route.fulfill({ json: { code: 200 } })
  })

  await page.goto(`${BASE}/user`)
  const badge = page.locator('.user-info .username .lv-badge')
  await expect(badge).toBeVisible()
  await expect(badge).toHaveText('LV3')
  await expect(badge).toHaveClass(/lv-3/)
  expect(pageErrors).toEqual([])
})

test('个人主页（他人 /profile/:id）：profile 回包 level 驱动徽标', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/**', (route) =>
    route.fulfill({ json: { code: 200 } }))
  await page.route('http://127.0.0.1:5001/user/profile/52', (route) =>
    route.fulfill({ json: { code: 200, User_Name: '学员小一', User_Id: '0000052',
      role: 'user', level: 2, officers: [], data: null } }))

  await page.goto(`${BASE}/profile/52`)
  const badge = page.locator('.user-info .username .lv-badge')
  await expect(badge).toBeVisible()
  await expect(badge).toHaveText('LV2')
  await expect(badge).toHaveClass(/lv-2/)
  expect(pageErrors).toEqual([])
})

test('个人中心左侧栏：等级徽标替代旧身份标签', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/user/user_index')) {
      return route.fulfill({ json: { code: 200, message: 'ok', User_Name: 'e2e_user', User_Id: '0000021',
        role: 'user', level: 4, officers: [] } })
    }
    return route.fulfill({ json: { code: 200 } })
  })

  await page.goto(`${BASE}/user-center/user-info`)
  const badge = page.locator('.uc-profile .lv-badge')
  await expect(badge).toBeVisible()
  await expect(badge).toHaveText('LV4')
  await expect(badge).toHaveClass(/lv-4/)
  // 旧「同学/超管」身份标签不复存在
  await expect(page.locator('.uc-role--student')).toHaveCount(0)
  expect(pageErrors).toEqual([])
})

test('超管不显示 LV（无等级语义），显示超管徽标', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/user/user_index')) {
      return route.fulfill({ json: { code: 200, message: 'ok', User_Name: 'admin_e2e', User_Id: '0000021',
        role: 'super_admin', level: 1, officers: [] } })
    }
    return route.fulfill({ json: { code: 200 } })
  })

  // 个人主页：超管徽标（warning 琥珀），复用 lv-badge 药丸度量但不挂 lv-N 等级色阶
  await page.goto(`${BASE}/user`)
  await expect(page.locator('.user-info .username .username-badge--staff')).toHaveText('超管')
  await expect(page.locator('.user-info .username .username-badge--staff')).not.toHaveClass(/lv-[1-4]/)

  // 个人中心侧栏：同口径
  await page.goto(`${BASE}/user-center/user-info`)
  await expect(page.locator('.uc-profile .uc-role--staff')).toHaveText('超管')
  await expect(page.locator('.uc-profile .lv-badge')).toHaveCount(0)
  expect(pageErrors).toEqual([])
})
