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
