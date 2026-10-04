import { test, expect } from '@playwright/test'

// 内部工作台 X2 通用投影：看板 tab（对象行+认领）、事项关联卡（盲渲染 fields +
// 添加关联）、类型目录。mock 后端，契约对齐 services/work/projections.py 与 boards.py。

const BASE = 'http://127.0.0.1:18081/AMEII'

const ME_MEMBER = {
  code: 200, message: 'ok',
  data: {
    eligibility: { kind: 'member' }, is_governance: false,
    workspaces: [{ id: 1, club_group_id: 3, group_name: '软件组', status: 'active', role: 'coordinator' }],
    available_targets: [], subtree: false,
    todo: { pending_responses: 0, pending_transfers: 0, to_review: 0, due_soon: 0, overdue: 0 },
  },
}

const BOARD = {
  code: 200, message: 'ok',
  data: {
    workspace: { id: 1 },
    stewardable_types: ['course'],
    objects: [
      { source_type: 'course', label: '课程', source_id: 12, accessible: true,
        title: '解剖学入门', fields: { title: '解剖学入门', '状态': '在架', '章节数': 8 },
        claimed: true, claimed_by: 21, claimed_at: '2026-09-30 10:00',
        active_items: 2, overdue_items: 1, last_activity: '2026-09-30 11:00' },
      { source_type: 'feedback_ticket', label: '工单', source_id: 88, accessible: false,
        title: null, fields: null, claimed: false, claimed_by: null, claimed_at: null,
        active_items: 0, overdue_items: 0, last_activity: null },
    ],
  },
}

const TYPES = {
  code: 200, message: 'ok',
  data: { types: [
    { source_type: 'course', label: '课程', stewardable: true },
    { source_type: 'camp_session', label: '营期', stewardable: false },
    { source_type: 'feedback_ticket', label: '工单', stewardable: false },
  ] },
}

const ITEM_WITH_LINKS = {
  code: 200, message: 'ok',
  data: {
    id: 101, workspace_id: 1, group_name: '软件组', kind: 'task',
    title: '第三章修订', body: '正文', visibility: 'workspace', status: 'in_progress',
    created_by: 21, version: 7, created_by_name: '陈干事', reply_count: 0, last_read_seq: 0,
    created_at: '2026-09-26 09:00', last_activity_at: '2026-09-28 11:20',
    participants: [], allowed_actions: ['reply', 'edit', 'invite'],
    item_access: { via: 'workspace', workspace_role: 'coordinator' },
    files: [],
    business_links: [
      { source_type: 'course', source_id: 12, label: '课程', accessible: true,
        relation: 'related', fields: { title: '解剖学入门', '状态': '在架', '章节数': 8 } },
      { source_type: 'camp_session', source_id: 30, label: '营期', accessible: false,
        relation: 'related', fields: null },
    ],
    task: { assignee_user_id: 21, assignee_name: '陈干事', reviewer_user_id: null,
            reviewer_name: null, start_at: null, due_at: '2026-09-30 18:00',
            priority: 'normal', accept_criteria: null, overdue: false, submissions: [] },
  },
}

async function loginAsUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: 'user', User_Id: 21, User_Name: '陈干事', verification_status: 'verified' }, checkinInfo: {},
    }))
  })
}

test.describe('看板 tab', () => {
  test('对象行渲染：安全字段盲渲染 + 态势计数 + 认领状态；认领操作', async ({ page }) => {
    await loginAsUser(page)
    const posts = []
    await page.route('http://127.0.0.1:5001/**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (url.includes('/work/objects/claim') && method === 'POST') {
        posts.push(route.request().postDataJSON())
        return route.fulfill({ json: { code: 200, message: '已认领' } })
      }
      if (url.includes('/work/objects/board')) return route.fulfill({ json: BOARD })
      if (url.includes('/work/me/todos')) {
        return route.fulfill({ json: { code: 200, data: {
          pending_responses: [], pending_transfers: [], to_review: [], due: [], handoffs: [] } } })
      }
      if (url.includes('/work/me')) return route.fulfill({ json: ME_MEMBER })
      if (url.includes('/work/items')) {
        return route.fulfill({ json: { code: 200, data: { items: [], total: 0, page: 1, page_size: 20 } } })
      }
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
    await page.goto(`${BASE}/work`)
    // 工作台 III：看板为侧栏导航项，点击进 /work/board
    await page.locator('.ws-nav-item', { hasText: '看板' }).click()
    await expect(page).toHaveURL(new RegExp('/work/board'))

    await expect(page.getByText('解剖学入门')).toBeVisible()
    await expect(page.getByText('已认领', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('状态：在架')).toBeVisible()
    // 态势计数（对象行内 stat 格子）
    const stats = page.locator('.obj-card').first().locator('.stat-num')
    await expect(stats.nth(0)).toHaveText('2')
    await expect(stats.nth(1)).toHaveText('1')
    // 不可访问对象 → 占位（不显示工单标题）
    await expect(page.getByText('不可访问对象')).toBeVisible()
    // 取消认领（coordinator 可见按钮；mock 返回已认领故按钮为取消认领）
    await page.getByRole('button', { name: '取消认领' }).click()
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ source_type: 'course', source_id: 12, ws_id: 1, action: 'unclaim' })
  })
})

test.describe('事项关联卡', () => {
  test('盲渲染 fields + 不可访问占位 + 添加关联 POST 契约', async ({ page }) => {
    await loginAsUser(page)
    const posts = []
    await page.route('http://127.0.0.1:5001/**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (url.includes('/work/items/101/links') && method === 'POST') {
        posts.push(route.request().postDataJSON())
        return route.fulfill({ json: { code: 200, message: '已建立关联' } })
      }
      if (url.includes('/work/items/101')) return route.fulfill({ json: ITEM_WITH_LINKS })
      if (url.includes('/work/objects/types')) return route.fulfill({ json: TYPES })
      if (url.includes('/work/me/todos')) {
        return route.fulfill({ json: { code: 200, data: {
          pending_responses: [], pending_transfers: [], to_review: [], due: [], handoffs: [] } } })
      }
      if (url.includes('/work/me')) return route.fulfill({ json: ME_MEMBER })
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
    await page.goto(`${BASE}/work/items/101`)

    await expect(page.getByText('关联对象（2）')).toBeVisible()
    await expect(page.getByText('解剖学入门')).toBeVisible()
    await expect(page.getByText('章节数：8')).toBeVisible()
    await expect(page.getByText('不可访问（无该业务查看权限）')).toBeVisible()

    // 添加关联：类型下拉（注册表目录）+ 对象 ID
    await page.getByRole('button', { name: '添加关联' }).click()
    await page.locator('.el-dialog .el-select').click()
    await page.getByRole('option', { name: '营期' }).click()
    await page.locator('.el-dialog input[type="number"]').fill('30')
    await page.getByRole('button', { name: '关联', exact: true }).click()
    await expect.poll(() => posts.length).toBe(1)
    expect(posts[0]).toMatchObject({ source_type: 'camp_session', source_id: 30 })
    await expect(page.getByText('已建立关联')).toBeVisible()
  })

  test('页面无脚本错误（模板绑定安全网）', async ({ page }) => {
    await loginAsUser(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.route('http://127.0.0.1:5001/**', (route) => {
      const url = route.request().url()
      if (url.includes('/work/items/101')) return route.fulfill({ json: ITEM_WITH_LINKS })
      if (url.includes('/work/me/todos')) {
        return route.fulfill({ json: { code: 200, data: {
          pending_responses: [], pending_transfers: [], to_review: [], due: [], handoffs: [] } } })
      }
      if (url.includes('/work/me')) return route.fulfill({ json: ME_MEMBER })
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
    await page.goto(`${BASE}/work/items/101`)
    await expect(page.getByRole('heading', { name: '第三章修订' })).toBeVisible()
    await expect(errors).toEqual([])
  })
})
