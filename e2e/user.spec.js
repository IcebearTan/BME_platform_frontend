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
