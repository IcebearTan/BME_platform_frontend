import { test, expect } from '@playwright/test'

// 管理端·平台资料管理（学习资源中心第一期）：表格渲染 + 分类筛选。
// mock 后端，契约对齐 blueprints/resource_center.py（/resources/standalone*）。

const BASE = 'http://127.0.0.1:15173/admin'

const LIST = {
  code: 200, data: [
    { id: 1, name: 'SolidWorks安装包.zip', description: '2024 版安装包', size: 1503238553,
      category: 'software', content_type: 'application/zip', sort_order: 0,
      uploader: '白熊', created_at: '2026-09-20 10:00' },
    { id: 2, name: '实验室安全规范.pdf', description: null, size: 2097152,
      category: 'standard', content_type: 'application/pdf', sort_order: 1,
      uploader: '白熊', created_at: '2026-09-20 10:05' },
  ], total: 2, page: 1, per_page: 50, pages: 1,
}

async function loginAsStaff(page) {
  // 键名与 apps/admin 的 vuex-persistedstate / token 约定一致（对齐 admin.spec.js）
  await page.addInitScript(() => {
    localStorage.setItem('bme-admin-token', 'e2e-mock-token')
    localStorage.setItem(
      'bme-admin-state',
      JSON.stringify({
        token: 'e2e-mock-token',
        user: { role: 'super_admin', permissions: [], User_Name: 'e2e' },
        isLogin: true,
        isDarkMode: false,
      })
    )
  })
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/user/user_index')) {
      return route.fulfill({
        json: { code: 200, role: 'super_admin', permissions: [], data: { username: 'e2e' } },
      })
    }
    if (url.includes('/resources/standalone')) {
      return route.fulfill({ json: LIST })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('平台资料管理：表格渲染与分类筛选', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStaff(page)

  await page.goto(`${BASE}/content/resources`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.page-title', { hasText: '平台资料管理' })).toBeVisible()

  // 两行资料 + 分类 tag + 上传人
  await expect(page.locator('.el-table__row')).toHaveCount(2)
  await expect(page.locator('.el-table__row', { hasText: 'SolidWorks安装包.zip' }).getByText('软件工具')).toBeVisible()
  await expect(page.locator('.el-table__row', { hasText: '实验室安全规范.pdf' }).getByText('规范文档')).toBeVisible()
  await expect(page.locator('.el-table__row').first()).toContainText('白熊')

  // 分类筛选：只看规范文档
  await page.locator('.form-inline .el-select').click()
  await page.getByRole('option', { name: '规范文档' }).click()
  await expect(page.locator('.el-table__row')).toHaveCount(1)
  await expect(page.locator('.el-table__row').first()).toContainText('实验室安全规范.pdf')

  expect(errors).toEqual([])
})
