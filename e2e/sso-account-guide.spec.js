import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:18081/AMEII'

test('登录：SSO 选项说明统一邮箱，切换保留输入并提交原有登录接口', async ({ page }) => {
  const errors = []
  const logins = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('http://127.0.0.1:5001/**', (route) => {
    if (route.request().url().includes('/auth/login')) {
      logins.push(route.request().postDataJSON())
      return route.fulfill({ status: 400, json: { message: '测试登录响应' } })
    }
    return route.fulfill({ json: { code: 200, data: {} } })
  })
  await page.goto(`${BASE}/login`)
  await page.getByPlaceholder('请输入邮箱地址').fill('demo@mail2.sysu.edu.cn')
  await page.getByPlaceholder('请输入密码').fill('sample-password')
  await page.getByRole('button', { name: '教育邮箱（SSO）' }).focus()
  await page.keyboard.press('Enter')
  const guide = page.getByRole('region', { name: '统一账号（SSO）说明' })
  await expect(guide).toBeVisible()
  await expect(guide).toContainText('BME_notebook')
  await expect(guide).toContainText('积分商城')
  await expect(guide).toContainText('本平台密码')
  await expect(page.getByPlaceholder('请输入你的中大教育邮箱')).toHaveValue('demo@mail2.sysu.edu.cn')
  expect(logins).toHaveLength(0)
  await page.getByRole('button', { name: '普通账号', exact: true }).click()
  await expect(guide).toBeHidden()
  await expect(page.getByPlaceholder('请输入邮箱地址')).toHaveValue('demo@mail2.sysu.edu.cn')
  await page.getByRole('button', { name: '教育邮箱（SSO）' }).click()
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByText('测试登录响应')).toBeVisible()
  expect(logins).toHaveLength(1)
  expect(logins[0].User_Email).toBe('demo@mail2.sysu.edu.cn')
  expect(logins[0].User_Password).toMatch(/^[a-f0-9]{32}$/)
  expect(errors).toEqual([])
})

for (const [email, label] of [
  ['demo@mail2.sysu.edu.cn', '教育邮箱'],
  ['demo@mail.sysu.edu.cn', '教育邮箱'],
  ['demo@example.com', '普通邮箱'],
  ['demo@mail2.sysu.edu.cn.example.com', '普通邮箱'],
]) {
  test(`个人中心：展示当前邮箱 ${email} 及统一账号说明`, async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width: 400, height: 850 })
    await page.addInitScript(() => {
      localStorage.setItem('bme-user-token', 'e2e-mock-token')
      localStorage.setItem('bme-user-state', JSON.stringify({
        token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
        user: { role: 'user', User_Id: 11 }, checkinInfo: {},
      }))
    })
    await page.route('http://127.0.0.1:5001/**', (route) => {
      if (route.request().url().includes('/user/user_index')) {
        return route.fulfill({ json: { code: 200, role: 'user', User_Id: 11,
          User_Name: '测试用户', User_Email: email, User_Tags: [] } })
      }
      return route.fulfill({ json: { code: 200, data: {}, notifications: [] } })
    })
    await page.goto(`${BASE}/user-center/user-info`)
    const guide = page.getByRole('region', { name: '统一账号（SSO）说明' })
    await expect(guide).toBeVisible()
    await expect(guide.locator('dd')).toContainText(email)
    await expect(guide.locator('dd')).toContainText(label)
    await expect(guide).toContainText('BME_notebook')
    if (label === '普通邮箱') await expect(guide).toContainText('联系平台管理员')
    await expect(guide.getByRole('link')).toHaveCount(0)
    expect(await guide.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}
