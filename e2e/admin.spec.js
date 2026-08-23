import { test, expect } from '@playwright/test'

// 管理端（apps/admin）冒烟安全网：登录页渲染 / 布局壳挂载 / TinyMCE 编辑器挂载
// 布局壳与编辑器页的 created() 会调 /user/user_index，失败即踢回 /login。
// 故在测试上下文预置 token 并 mock 该接口——用例不依赖后端与真实账号。

const BASE = 'http://localhost:5173/admin'

async function loginAsStaff(page) {
  // store 初始 token 读 localStorage；vuex-persistedstate 从 bme-admin-state 恢复 state，两处都预置
  // 键名与批次 3 键分离后的 apps/admin 保持一致
  await page.addInitScript(() => {
    localStorage.setItem('bme-admin-token', 'e2e-mock-token')
    localStorage.setItem(
      'bme-admin-state',
      JSON.stringify({ token: 'e2e-mock-token', isLogin: true, isDarkMode: false })
    )
  })
  // 拦截全部后端请求：user_index 提供角色；其余统一 200 空数据，
  // 避免假 token 触发批次 3 新增的 401 拦截把页面踢回登录页
  await page.route('http://127.0.0.1:5001/**', (route) => {
    if (route.request().url().includes('/user/user_index')) {
      return route.fulfill({
        json: { code: 200, role: 'super_admin', permissions: [], data: { username: 'e2e' } },
      })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
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
