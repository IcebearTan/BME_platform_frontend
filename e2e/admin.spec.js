import { test, expect } from '@playwright/test'

// 管理端（apps/admin）冒烟安全网：登录页渲染 / 布局壳挂载 / TinyMCE 编辑器挂载
// 布局壳与编辑器页的 created() 会调 /user/user_index，失败即踢回 /login。
// 故在测试上下文预置 token 并 mock 该接口——用例不依赖后端与真实账号。

const BASE = 'http://localhost:5173/admin'

async function loginAsStaff(page) {
  // store 初始 token 读 localStorage；vuex-persistedstate 从 my-app 恢复 state，两处都预置
  await page.addInitScript(() => {
    localStorage.setItem('token', 'e2e-mock-token')
    localStorage.setItem(
      'my-app',
      JSON.stringify({ token: 'e2e-mock-token', isLogin: true, isDarkMode: false })
    )
  })
  await page.route('**/user/user_index*', (route) =>
    route.fulfill({
      json: { code: 200, role: 'super_admin', permissions: [], data: { username: 'e2e' } },
    })
  )
}

test('登录页正常渲染', async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await expect(page.locator('input[placeholder="输入密码"]')).toBeVisible()
  await expect(page.locator('input[placeholder="输入邮箱"]')).toBeVisible()
})

test('管理布局壳挂载（侧边栏 + 主区域）', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto(`${BASE}/`)
  await expect(page.locator('.admin-layout')).toBeVisible()
  await expect(page.locator('.sidebar-container')).toBeVisible()
})

test('md-editor-v3 编辑器挂载', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto(`${BASE}/editor`)
  // /editor 路由挂的是 ArticleEditorV2（md-editor-v3）；TinyMCE 组件在 admin
  // 是死代码（EditorView/CreateView 未挂路由），清债批次另行处置
  await expect(page.locator('.md-editor').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeVisible()
})
