import { test, expect } from '@playwright/test'

// 项目广场（功能扩展轮 §五 MVP）：列表/筛选/卡片投影字段 + 分享弹窗。
// mock 后端，零依赖真实库；契约对齐 blueprints/showcase.py。

const BASE = 'http://127.0.0.1:18081/AMEII'

const LIST = {
  code: 200, total: 3, all_tags: ['硬件', '医工交叉'],
  projects: [
    { id: 801, source: 'camp', source_text: '营期项目', title: '智能输液监护系统',
      summary: '病房输液看护样机', tags: ['医工交叉'], project_status: 'ongoing', project_status_text: '进行中',
      status: 'visible', view_count: 42, members: [], links: [], camp_name: '秋季项目营',
      owner_name: 'proj_leader', created_at: '2026-09-01T10:00:00', favorited: false, can_manage: false },
    { id: 802, source: 'community', source_text: '自由分享', title: '宿舍智能门锁',
      summary: '旧平板改造的宿舍门禁', tags: ['硬件'], project_status: 'done', project_status_text: '已完成',
      status: 'visible', view_count: 7, members: ['proj_s1'], links: [{ label: '开源仓库', url: 'https://example.com' }],
      owner_name: 'proj_s1', created_at: '2026-08-20T10:00:00', favorited: true, can_manage: true },
    { id: 803, source: 'community', source_text: '自由分享', title: '课程表壁纸生成器',
      summary: '一键生成周课表壁纸', tags: [], project_status: 'idea', project_status_text: '构思中',
      status: 'visible', view_count: 1, members: [], links: [], owner_name: 'proj_s2',
      created_at: '2026-09-10T10:00:00', favorited: false, can_manage: false },
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
    if (url.includes('/showcase/projects')) {
      if (route.request().method() === 'POST') {
        return route.fulfill({ json: { code: 200, message: '已发布到项目广场（免审上架）',
          project: { ...LIST.projects[2], id: 900, title: '新分享' } } })
      }
      // 列表按查询参数过滤（对齐后端 source/project_status 语义）
      const u = new URL(url)
      let rows = LIST.projects
      const src = u.searchParams.get('source')
      if (src) rows = rows.filter((p) => p.source === src)
      const ps = u.searchParams.get('project_status')
      if (ps) rows = rows.filter((p) => p.project_status === ps)
      return route.fulfill({ json: { ...LIST, total: rows.length, projects: rows } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('项目广场：双来源卡片渲染与来源/状态筛选', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page)

  await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'XLAB' })).toBeVisible()
  // 三张卡片：来源标（营期=success 系/自由分享）+ 状态字 + 营期溯源
  await expect(page.locator('.p-card')).toHaveCount(3)
  await expect(page.locator('.p-card', { hasText: '智能输液监护系统' }).locator('.src-camp')).toBeVisible()
  await expect(page.locator('.p-card', { hasText: '智能输液监护系统' }).getByText('秋季项目营')).toBeVisible()
  await expect(page.locator('.p-card', { hasText: '宿舍智能门锁' }).getByText('已完成')).toBeVisible()

  // 来源筛选：只看营期项目
  await page.getByRole('button', { name: '营期项目' }).click()
  await expect(page.locator('.p-card')).toHaveCount(1)
  // 状态筛选重置来源
  await page.getByRole('button', { name: '全部来源' }).click()
  await page.getByRole('button', { name: '已完成' }).click()
  await expect(page.locator('.p-card')).toHaveCount(1)
  await expect(page.locator('.p-card').first()).toContainText('宿舍智能门锁')

  expect(errors).toEqual([])
})

test('项目广场：分享我的项目弹窗（community 免审上架）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page)

  await page.goto(`${BASE}/projects`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '分享我的项目' }).click()
  const dlg = page.locator('.xlab-dialog').filter({ hasText: '分享我的项目' })
  await expect(dlg).toBeVisible()
  await expect(dlg.getByText('自由分享免审上架', { exact: false })).toBeVisible()
  await expect(dlg.getByRole('button', { name: '发布' })).toBeDisabled()
  await dlg.locator('input').first().fill('桌面天气站')
  await expect(dlg.getByRole('button', { name: '发布' })).toBeEnabled()
  await dlg.getByRole('button', { name: '发布' }).click()
  await expect(page.getByText('已发布到项目广场（免审上架）')).toBeVisible()

  expect(errors).toEqual([])
})
