import { test, expect } from '@playwright/test'

// 学习资源中心（第一期）：左栏来源导航（平台分类 + 课程归组）/ 默认来源列表 /
// 课程资料多选批量工具栏 / 全局搜索跨来源标注。mock 后端，契约对齐
// blueprints/resource_center.py + 既有 /course/resources。

const BASE = 'http://127.0.0.1:18081/AMEII'

const CATALOG = {
  code: 200,
  categories: [
    { key: 'software', label: '软件工具', count: 2 },
    { key: 'handbook', label: '学习手册', count: 0 },
    { key: 'standard', label: '规范文档', count: 0 },
    { key: 'other', label: '其他', count: 0 },
  ],
  courses: [
    { id: 12, title: '解剖学入门', count: 1 },
    { id: 34, title: '3D建模基础', count: 2 },
  ],
}

const STANDALONE = {
  code: 200, data: [
    { id: 1, name: 'SolidWorks安装包.zip', description: '2024 版安装包', size: 1503238553,
      category: 'software', content_type: 'application/zip', sort_order: 1,
      uploader: 'admin', created_at: '2026-09-20 10:00' },
    { id: 2, name: '建模规范手册.pdf', description: null, size: 2097152,
      category: 'software', content_type: 'application/pdf', sort_order: 2,
      uploader: 'admin', created_at: '2026-09-20 10:05' },
  ], total: 2, page: 1, per_page: 20, pages: 1,
}

const COURSE_RESOURCES = {
  code: 200, data: [
    { id: 101, course_id: 12, name: '第一章课件.pptx', size: 5242880,
      content_type: 'application/vnd...', sort_order: 1, created_at: '2026-09-01 09:00' },
  ],
}

const SEARCH = {
  code: 200, items: [
    { source: 'standalone', id: 2, name: '建模规范手册.pdf', size: 2097152,
      created_at: '2026-09-20 10:05', category: 'software', tag_label: '软件工具' },
    { source: 'course', id: 102, name: '建模基础讲义.pdf', size: 10485760,
      created_at: '2026-09-02 09:00', course_id: 34, tag_label: '3D建模基础' },
  ],
}

async function loginAsUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: 'user' }, checkinInfo: {},
    }))
  })
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/resources/catalog')) {
      return route.fulfill({ json: CATALOG })
    }
    if (url.includes('/resources/search')) {
      return route.fulfill({ json: SEARCH })
    }
    if (url.includes('/resources/standalone')) {
      return route.fulfill({ json: STANDALONE })
    }
    if (url.includes('/course/resources')) {
      return route.fulfill({ json: COURSE_RESOURCES })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('资源中心：默认来源列表 + 左栏分组导航', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page)

  await page.goto(`${BASE}/resources`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '学习资源中心' })).toBeVisible()

  // 默认来源 = 第一个有资料的平台分类（软件工具），2 行
  await expect(page.locator('.rfl-row')).toHaveCount(2)
  await expect(page.locator('.rc-list-title')).toContainText('软件工具')

  // 左栏两组：平台资料四分类 + 课程资料两门课（带计数）
  await expect(page.locator('.dew-sidebar__item', { hasText: '软件工具 (2)' })).toBeVisible()
  await expect(page.locator('.dew-sidebar__item', { hasText: '学习手册' })).toBeVisible()
  await expect(page.locator('.dew-sidebar__item', { hasText: '解剖学入门 (1)' })).toBeVisible()
  await expect(page.locator('.dew-sidebar__item', { hasText: '3D建模基础 (2)' })).toBeVisible()

  expect(errors).toEqual([])
})

test('资源中心：切到课程来源出现批量工具栏', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page)

  await page.goto(`${BASE}/resources`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.rfl-row')).toHaveCount(2)

  // 课程资料按课程归组，不打散
  await page.locator('.dew-sidebar__item', { hasText: '解剖学入门' }).click()
  await expect(page.locator('.rfl-row')).toHaveCount(1)
  await expect(page.locator('.rfl-row', { hasText: '第一章课件.pptx' })).toBeVisible()
  await expect(page.locator('.rc-list-title')).toContainText('解剖学入门')

  // 课程来源：多选工具栏（全选 + 一键下载）
  await expect(page.locator('.rfl-toolbar')).toBeVisible()
  await expect(page.getByRole('button', { name: /一键下载/ })).toBeVisible()

  expect(errors).toEqual([])
})

test('资源中心：全局搜索跨来源标注', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page)

  await page.goto(`${BASE}/resources`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.rfl-row')).toHaveCount(2)

  // 输入关键词（防抖 300ms 后触发搜索）
  await page.getByPlaceholder('搜索资料名称').fill('建模')
  await expect(page.locator('.rfl-row')).toHaveCount(2)
  // 来源标注：平台资料→分类标签，课程资料→课程名标签
  await expect(page.locator('.rfl-row', { hasText: '建模规范手册.pdf' }).getByText('软件工具')).toBeVisible()
  await expect(page.locator('.rfl-row', { hasText: '建模基础讲义.pdf' }).getByText('3D建模基础')).toBeVisible()

  // 点击课程资料行 → 跳到该课程来源
  await page.locator('.rfl-row', { hasText: '建模基础讲义.pdf' }).click()
  await expect(page.locator('.rc-list-title')).toContainText('3D建模基础')

  expect(errors).toEqual([])
})
