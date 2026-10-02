import { test, expect } from '@playwright/test'

// 平台更新日志页（/changelog，v3.3 起）+ 关于页挂载回归（mount 曾丢失致整页空白）+
// 页脚「更新日志」入口。全 mock：公开页，兜底 200 防 401 误跳登录。

const BASE = 'http://127.0.0.1:18081/AMEII'

test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:5001/**', (route) =>
    route.fulfill({ json: { code: 200, message: 'ok', data: {} } }))
})

test.describe('更新日志页', () => {
  test('渲染版本条目；首卡带当前版本标记；页脚两入口可见', async ({ page }) => {
    await page.goto(`${BASE}/changelog`)
    await expect(page.locator('.page-title', { hasText: '更新日志' })).toBeVisible()
    // 版本无关断言：至少一条版本卡，且首卡（最新）带「当前版本」标记——
    // 曾写死 v3.3，v3.4 上线即挂（10-02 实测教训）
    const cards = page.locator('.version-card')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(1)
    await expect(cards.first()).toContainText('当前版本')
    await expect(page.locator('.version-no').first()).toContainText('v')
    // 页脚：「关于我们」栏下「更新日志」入口
    await expect(page.locator('footer').getByText('更新日志').first()).toBeVisible()
    await expect(page.locator('footer').getByText('关于我们').first()).toBeVisible()
  })

  test('关于页挂载回归：开发团队介绍内容渲染（mount 曾丢失）', async ({ page }) => {
    await page.goto(`${BASE}/about`)
    await expect(page.getByRole('heading', { name: '关于开发者团队' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '我们的故事' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '我们的使命' })).toBeVisible()
  })

  test('页面无脚本错误（模板绑定安全网）', async ({ page }) => {
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${BASE}/changelog`)
    await page.goto(`${BASE}/about`)
    await expect(errors).toEqual([])
  })
})
