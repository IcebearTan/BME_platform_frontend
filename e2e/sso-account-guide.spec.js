import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:18081/AMEII'

test('登录：统一邮箱入口保留 MFA 二步和站内回跳', async ({ page }) => {
  const mfaRequests = []
  await page.route('http://127.0.0.1:5001/**', route => {
    const url = route.request().url()
    if (url.endsWith('/auth/session/config')) return route.fulfill({ json: { code: 200, refresh_cookie_enabled: false } })
    if (url.endsWith('/auth/login')) return route.fulfill({ json: { code: 200, mfa_required: true, mfa_token: 'test-mfa-challenge' } })
    if (url.endsWith('/auth/login/mfa')) {
      mfaRequests.push(route.request().postDataJSON())
      return route.fulfill({ json: { code: 200, token: 'e2e-mfa-access', refresh_token: 'e2e-mfa-refresh', role: 'user', User_Id: 11, User_Email: 'demo@mail.sysu.edu.cn', verification_status: 'verified' } })
    }
    return route.fulfill({ json: { code: 200, data: [] } })
  })
  await page.goto(`${BASE}/login?redirect=/service-hall`)
  await page.getByPlaceholder('请输入邮箱地址').fill('demo@mail.sysu.edu.cn')
  await page.getByPlaceholder('请输入密码', { exact: true }).fill('sample-password')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByPlaceholder('6 位动态验证码')).toBeVisible()
  expect(page.url()).toContain('/login')
  await page.getByPlaceholder('6 位动态验证码').fill('123456')
  await page.getByRole('button', { name: '验证并登录', exact: true }).click()
  await expect(page).toHaveURL(`${BASE}/service-hall`)
  expect(mfaRequests).toEqual([{ mfa_token: 'test-mfa-challenge', code: '123456' }])
})

for (const email of ['demo@example.com', 'demo@mail2.sysu.edu.cn']) {
  test(`登录：直接使用注册邮箱 ${email}`, async ({ page }) => {
    const logins = []
    await page.route('http://127.0.0.1:5001/**', route => {
      if (route.request().url().includes('/auth/login')) {
        logins.push(route.request().postDataJSON())
        return route.fulfill({ status: 400, json: { message: '测试登录响应' } })
      }
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto(`${BASE}/login`)
    await expect(page.getByRole('button', { name: '教育邮箱（SSO）' })).toHaveCount(0)
    await page.getByPlaceholder('请输入邮箱地址').fill(email)
    await page.getByPlaceholder('请输入密码').fill('sample-password')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page.getByText('测试登录响应')).toBeVisible()
    expect(logins).toHaveLength(1)
    expect(logins[0].User_Email).toBe(email)
    expect(logins[0].User_Password).toMatch(/^[a-f0-9]{32}$/)
  })
}

for (const [email, label] of [
  ['demo@mail2.sysu.edu.cn', 'SSO'], ['demo@mail.sysu.edu.cn', 'SSO'],
  ['demo@example.com', '普通邮箱'], ['demo@mail2.sysu.edu.cn.example.com', '普通邮箱'],
]) {
  test(`个人资料：紧凑邮箱标识 ${email}，手机可打开说明`, async ({ page }) => {
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.setViewportSize({ width: 400, height: 850 })
    await page.addInitScript(() => {
      localStorage.setItem('bme-user-token', 'e2e-mock-token')
      localStorage.setItem('bme-user-state', JSON.stringify({
        token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
        user: { role: 'user', User_Id: 11 }, checkinInfo: {},
      }))
    })
    await page.route('http://127.0.0.1:5001/**', route => {
      if (route.request().url().includes('/user/user_index')) {
        return route.fulfill({ json: { code: 200, role: 'user', User_Id: 11,
          User_Name: '测试用户', User_Email: email, User_Tags: [] } })
      }
      return route.fulfill({ json: { code: 200, data: {}, notifications: [] } })
    })
    await page.goto(`${BASE}/user-center/user-info`)
    const account = page.getByRole('group', { name: '账号邮箱' })
    await expect(account).toContainText(email)
    await expect(account.getByText(label, { exact: true })).toBeVisible()
    const details = page.getByRole('region', { name: 'SSO 与积分商城说明' })
    await expect(details).toBeHidden()
    await account.getByRole('button', { name: '了解 SSO 与积分商城' }).press('Enter')
    await expect(details).toBeVisible()
    await expect(details).toContainText('首次进入时，系统自动创建或关联积分中心账号')
    await expect(details).toContainText('进入商城时仍需校验账号状态与关联关系')
    const popup = page.locator('.sso-account-popover')
    await expect(popup).toHaveCSS('backdrop-filter', 'blur(40px) saturate(1.8)')
    const box = await popup.boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(400)
    await account.getByRole('button', { name: '了解 SSO 与积分商城' }).press('Escape')
    await expect(details).toBeHidden()
    expect(await account.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    expect(errors).toEqual([])
  })
}

test('注册：教育邮箱精确校验，切换保留输入，修改邮箱清空旧验证码', async ({ page }) => {
  const requests = []
  await page.route('http://127.0.0.1:5001/**', route => {
    if (route.request().url().includes('/auth/captcha/email')) requests.push(route.request().postDataJSON())
    return route.fulfill({ json: { code: 200 } })
  })
  await page.goto(`${BASE}/register`)
  await page.getByPlaceholder('请输入真实姓名').fill('测试用户')
  await page.getByPlaceholder('请输入邮箱地址').fill('demo@example.com')
  await page.getByPlaceholder('请输入密码', { exact: true }).fill('sample-password')
  await page.getByRole('button', { name: '中大教育邮箱', exact: true }).click()
  await expect(page.getByPlaceholder('请输入中大教育邮箱')).toHaveValue('demo@example.com')
  await expect(page.getByPlaceholder('请输入密码', { exact: true })).toHaveValue('sample-password')
  await page.getByRole('button', { name: '了解 SSO 与积分商城' }).press('Enter')
  await expect(page.getByRole('region', { name: 'SSO 与积分商城说明' })).toBeVisible()
  expect(requests).toHaveLength(0)
  await page.getByRole('button', { name: '了解 SSO 与积分商城' }).press('Escape')
  await page.getByPlaceholder('请输入中大教育邮箱').fill('demo@mail2.sysu.edu.cn.example.com')
  await page.getByRole('button', { name: '获取验证码', exact: true }).click()
  await expect(page.locator('.el-form-item__error')).toContainText(['请使用 @mail2.sysu.edu.cn 或 @mail.sysu.edu.cn 邮箱'])
  expect(requests).toHaveLength(0)
  for (const email of ['demo@mail2.sysu.edu.cn', 'demo@mail.sysu.edu.cn']) {
    await page.getByPlaceholder('请输入中大教育邮箱').fill(email)
    await page.getByRole('button', { name: '获取验证码', exact: true }).click()
    await expect(page.getByRole('button', { name: /s后重发/ })).toBeDisabled()
    await page.getByPlaceholder('请输入验证码').fill('123456')
  }
  await page.getByRole('button', { name: '普通邮箱', exact: true }).click()
  await page.getByPlaceholder('请输入邮箱地址').fill('demo@example.com')
  await expect(page.getByPlaceholder('请输入验证码')).toHaveValue('')
  await page.getByRole('button', { name: '获取验证码', exact: true }).click()
  await expect(page.getByRole('button', { name: /s后重发/ })).toBeDisabled()
  expect(requests.map(r => r.User_Email)).toEqual(['demo@mail2.sysu.edu.cn', 'demo@mail.sysu.edu.cn', 'demo@example.com'])
  expect(requests.every(r => r.purpose === 'register')).toBe(true)
})

test('注册：旧邮箱的迟到验证码响应不会污染新邮箱', async ({ page }) => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  let calls = 0
  await page.route('http://127.0.0.1:5001/auth/captcha/email', async route => {
    calls++
    await gate
    return route.fulfill({ json: { code: 200 } })
  })
  await page.goto(`${BASE}/register`)
  await page.getByPlaceholder('请输入邮箱地址').fill('old@example.com')
  await page.getByRole('button', { name: '获取验证码', exact: true }).click()
  await expect.poll(() => calls).toBe(1)
  await expect(page.getByRole('button', { name: '获取验证码', exact: true })).toBeDisabled()
  await page.getByPlaceholder('请输入邮箱地址').fill('new@example.com')
  release()
  await expect(page.getByRole('button', { name: '获取验证码', exact: true })).toBeEnabled()
  await expect(page.getByText('验证码已发送到您的邮箱，请查收')).toHaveCount(0)
})


for (const [kind, email] of [['普通邮箱', 'demo@example.com'], ['中大教育邮箱', 'demo@mail.sysu.edu.cn']]) {
  test(`注册：${kind}沿用验证码与注册接口`, async ({ page }) => {
    const registrations = []
    await page.route('http://127.0.0.1:5001/**', route => {
      if (route.request().url().includes('/auth/register')) {
        registrations.push(route.request().postDataJSON())
        return route.fulfill({ status: 400, json: { message: '模拟注册拒绝' } })
      }
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto(`${BASE}/register`)
    await page.getByRole('button', { name: kind, exact: true }).click()
    await page.getByPlaceholder('请输入真实姓名').fill('测试用户')
    await page.getByPlaceholder(kind === '普通邮箱' ? '请输入邮箱地址' : '请输入中大教育邮箱').fill(email)
    await page.getByPlaceholder('请输入密码', { exact: true }).fill('sample-password')
    await page.getByPlaceholder('请确认密码', { exact: true }).fill('sample-password')
    await page.getByPlaceholder('请输入验证码').fill('123456')
    await page.getByRole('button', { name: '创建账户', exact: true }).click()
    await expect(page.getByText('注册失败', { exact: true })).toBeVisible()
    expect(registrations).toHaveLength(1)
    expect(registrations[0]).toMatchObject({ User_Name: '测试用户', User_Email: email, User_Captcha: '123456' })
    expect(registrations[0].User_Password).toMatch(/^[a-f0-9]{32}$/)
  })
}
