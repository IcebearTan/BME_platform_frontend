import { test, expect } from '@playwright/test'

// 内部工作台 M2：入口（服务台卡/顶栏项）+ 工作台 tab（待办/小组工作）+ 事项详情
// （回复时间线/发送幂等键/引用/不可访问空态）。mock 后端，契约对齐
// blueprints/work.py 与 services/work/items.py（feature/work-collab M2）。

const BASE = 'http://127.0.0.1:18081/AMEII'

const ME_GRANTED = {
  code: 200, message: 'ok',
  data: {
    eligibility: { kind: 'officer', officer_id: 8, group_id: 3 },
    is_governance: false,
    workspaces: [{ id: 1, club_group_id: 3, group_name: '软件组', status: 'active', role: 'coordinator' }],
    todo: { pending_responses: 1, pending_transfers: 0, to_review: 0, due_soon: 2, overdue: 0 },
  },
}

const ME_EMPTY = {
  code: 200, message: 'ok',
  data: { eligibility: null, is_governance: false, workspaces: [],
          todo: { pending_responses: 0, pending_transfers: 0, to_review: 0, due_soon: 0, overdue: 0 } },
}

const ITEMS = {
  code: 200, message: 'ok',
  data: {
    items: [
      { id: 101, workspace_id: 1, group_name: '软件组', kind: 'topic', title: '期中材料修订排期',
        visibility: 'workspace', status: 'open', created_by: 21, version: 3, reply_count: 4,
        unread: true, last_activity_at: '2026-09-28 11:20', created_at: '2026-09-27 09:00' },
      { id: 102, workspace_id: 1, group_name: '软件组', kind: 'topic', title: '受限：值班安排调整',
        visibility: 'participants', status: 'open', created_by: 22, version: 2, reply_count: 1,
        unread: false, last_activity_at: '2026-09-28 10:10', created_at: '2026-09-26 15:00' },
    ],
    total: 2, page: 1, page_size: 20,
  },
}

const TODOS = {
  code: 200, message: 'ok',
  data: {
    pending_responses: [
      { request_id: 55, item_id: 101, item_title: '期中材料修订排期', kind: 'topic',
        requested_by: '陈干事', due_at: '2026-09-29 18:00', created_at: '2026-09-28 09:00' },
    ],
  },
}

const ITEM_DETAIL = {
  code: 200, message: 'ok',
  data: {
    id: 101, workspace_id: 1, group_name: '软件组', kind: 'topic',
    title: '期中材料修订排期', body: '## 背景\n需要修订期中材料',
    visibility: 'workspace', status: 'open', created_by: 21, version: 3,
    created_by_name: '陈干事', reply_count: 2, last_read_seq: 0,
    created_at: '2026-09-27 09:00', last_activity_at: '2026-09-28 11:20',
    participants: [{ user_id: 22, username: '王组员', ptype: 'collaborator' }],
    allowed_actions: ['reply', 'edit', 'close', 'invite'],
    item_access: { via: 'workspace', workspace_role: 'coordinator' },
  },
}

const REPLIES = {
  code: 200, message: 'ok',
  data: {
    replies: [
      { id: 9001, seq: 1, author_id: 21, author_name: '陈干事', body: '第一轮：我先梳理目录',
        reply_to_id: null, edited_at: null, removed: false, created_at: '2026-09-27 10:00' },
      { id: 9002, seq: 2, author_id: 22, author_name: '王组员', body: '收到，我负责第三章',
        reply_to_id: 9001, edited_at: null, removed: false, created_at: '2026-09-27 11:00' },
    ],
    has_more: false, next_after_seq: 2, last_reply_seq: 2,
  },
}

async function loginAsUser(page, meData = ME_GRANTED) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: 'user', User_Id: 21, User_Name: '陈干事' }, checkinInfo: {},
    }))
  })
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/work/me/todos')) return route.fulfill({ json: TODOS })
    if (url.includes('/work/me')) return route.fulfill({ json: meData })
    if (url.match(/\/work\/items\?/) || url.includes('/work/items&')) return route.fulfill({ json: ITEMS })
    if (url.includes('/work/items/101/replies')) return route.fulfill({ json: REPLIES })
    if (url.includes('/work/items/101/events')) {
      return route.fulfill({ json: { code: 200, data: { events: [], total: 0, page: 1, page_size: 30 } } })
    }
    if (url.includes('/work/items/101')) return route.fulfill({ json: ITEM_DETAIL })
    if (url.includes('/work/candidates')) {
      return route.fulfill({ json: { code: 200, data: { candidates: [
        { user_id: 22, username: '王组员' }, { user_id: 23, username: '李干事' }] } } })
    }
    if (url.includes('/notification/')) {
      return route.fulfill({ json: { code: 200, data: {} } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test.describe('入口显隐', () => {
  test('服务台：有资格显示「内部工作台」卡并可进入', async ({ page }) => {
    await loginAsUser(page, ME_GRANTED)
    await page.goto(`${BASE}/service-hall`)
    const card = page.locator('.entry-card', { hasText: '内部工作台' })
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/work`))
  })

  test('服务台与头像下拉：无资格不渲染（学员不可见）', async ({ page }) => {
    await loginAsUser(page, ME_EMPTY)
    await page.goto(`${BASE}/service-hall`)
    await expect(page.locator('.entry-card', { hasText: '内部工作台' })).toHaveCount(0)
    // 头像下拉中也不出现（导航栏无一级入口，个人域入口按资格显隐）
    await page.locator('.user-avatar .el-avatar').first().click()
    await expect(page.locator('.avatar-pop__action', { hasText: '内部工作台' })).toHaveCount(0)
  })

  test('头像下拉：有资格显示内部工作台（含待办徽标）并可进入；导航栏不再占位', async ({ page }) => {
    await loginAsUser(page, ME_GRANTED)
    await page.goto(`${BASE}/home`)
    // 快速入口移入头像下拉（个人域），顶栏导航不占位
    await expect(page.locator('.el-menu-item', { hasText: '工作台' })).toHaveCount(0)
    await page.locator('.user-avatar .el-avatar').first().click()
    const action = page.locator('.avatar-pop__action', { hasText: '内部工作台' })
    await expect(action).toBeVisible()
    // 待办徽标：口径 = 摘要条五桶之和（ME_GRANTED fixture：待回复 1 + 即将到期 2 = 3 项待办）
    await expect(page.locator('.avatar-pop__badge')).toHaveText('3 项待办')
    await action.click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/work`))
  })
})

test.describe('个人中心整合（工作分组）', () => {
  test('有资格：侧栏出现「工作」分组并可直达；无资格不显示', async ({ page }) => {
    await loginAsUser(page, ME_GRANTED)
    await page.route('**/user/user_index', (route) => route.fulfill({
      json: { code: 200, User_Name: '陈干事', User_Id: 21, role: 'user',
              data: { username: '陈干事' } } }))
    await page.goto(`${BASE}/user-center/user-info`)
    const workItem = page.locator('.dew-sidebar, aside').getByText('内部工作台', { exact: true })
    await expect(workItem).toBeVisible()
    await workItem.click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/work`))

    const page2 = await page.context().browser().newPage()
    await loginAsUser(page2, ME_EMPTY)
    await page2.route('**/user/user_index', (route) => route.fulfill({
      json: { code: 200, User_Name: '学员', User_Id: 22, role: 'user',
              data: { username: '学员' } } }))
    await page2.goto(`${BASE}/user-center/user-info`)
    await expect(page2.getByText('内部工作台', { exact: true })).toHaveCount(0)
    await page2.close()
  })
})

test.describe('工作台主页（工作台 III：概览仪表盘 + 侧栏导航）', () => {
  test('待办数字块与待回复列表；侧栏切到小组事项并渲染表格', async ({ page }) => {
    await loginAsUser(page)
    await page.goto(`${BASE}/work`)

    // 数字块：待回复 1
    const block = page.locator('.stat-block', { hasText: '待回复' })
    await expect(block).toContainText('1')
    // 概览待办：待回复桶（请求人 + 时限；标题同时出现在「最近活动」，用桶内定位）
    await expect(page.locator('.todo-title', { hasText: '期中材料修订排期' }).first()).toBeVisible()
    await expect(page.getByText('请求你回复')).toBeVisible()

    // 切到小组事项：表格渲染（未读点 + 参与档锁标记列）
    await page.locator('.ws-nav-item', { hasText: '小组事项' }).click()
    await expect(page).toHaveURL(new RegExp('/work/items'))
    await expect(page.locator('.cell-title', { hasText: '期中材料修订排期' })).toBeVisible()
    await expect(page.locator('.cell-title', { hasText: '受限：值班安排调整' })).toBeVisible()
  })

  test('表格行点击进入事项详情（旧 URL tab=group 兼容重定向）', async ({ page }) => {
    await loginAsUser(page)
    await page.goto(`${BASE}/work?tab=group`)
    // tab=group → /work/items 重定向后表格就位
    await expect(page).toHaveURL(new RegExp('/work/items'))
    await page.locator('.cell-title', { hasText: '期中材料修订排期' }).click()
    await expect(page).toHaveURL(new RegExp('/work/items/101'))
    await expect(page.getByRole('heading', { name: '期中材料修订排期' })).toBeVisible()
  })
})

test.describe('组织架构页树选择与工作区入口', () => {
  // 主从分栏重构（工作台 III 同期）：树常驻+URL 选中态，替代钻入栈与面包屑。
  // 回归背景：进入工作区按钮曾引入 props 引用笔误致整层空白（组织页 e2e 因此补上）。
  const ORG_TREE = {
    code: 200, message: 'ok',
    data: {
      president: { id: 1, username: '社长', title: '社长' },
      management: [],
      tree: [
        {
          id: 3, name: '软件组', level: 1, leader: { id: 21, username: '陈干事' },
          oversee_by: null, counts: { primary: 2, secondary: 0 },
          members: [{ id: 21, username: '陈干事', slot: 'primary', is_leader: true }],
          children: [
            { id: 31, name: '前端小组', level: 2, leader: null, oversee_by: null,
              counts: { primary: 1, secondary: 0 }, members: [], children: [] },
          ],
        },
        { id: 4, name: '硬件组', level: 1, leader: null, oversee_by: null,
          counts: { primary: 0, secondary: 0 }, members: [], children: [] },
      ],
    },
  }

  async function mockOrgPage(page, meData) {
    await page.addInitScript(() => {
      localStorage.setItem('bme-user-token', 'e2e-mock-token')
      localStorage.setItem('bme-user-state', JSON.stringify({
        token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
        user: { role: 'user', User_Id: 21, User_Name: '陈干事' }, checkinInfo: {},
      }))
    })
    await page.route('http://127.0.0.1:5001/**', (route) => {
      const url = route.request().url()
      if (url.includes('/organization')) return route.fulfill({ json: ORG_TREE })
      if (url.includes('/work/me/todos')) {
        return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
      }
      if (url.includes('/work/me')) return route.fulfill({ json: meData })
      if (url.match(/\/work\/items\?/)) {
        return route.fulfill({ json: { code: 200, message: 'ok', data: { items: [], total: 0 } } })
      }
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
  }

  test('树选择组别：URL 选中态+详情渲染；子组树内可达；全社可回跳', async ({ page }) => {
    await mockOrgPage(page, ME_EMPTY)
    await page.goto(`${BASE}/organization`)

    // 全社态：树常驻 + 总览面板（社长行卡/组别一览）
    await expect(page.locator('.org-root-item--active')).toBeVisible()
    await expect(page.locator('.tree-node-name', { hasText: '软件组' })).toBeVisible()
    await expect(page.locator('.officer-row--hero', { hasText: '社长' })).toBeVisible()
    // 默认展开到二级：子组 前端小组 直接可见（不再需要钻入父组）
    await expect(page.locator('.tree-node-name', { hasText: '前端小组' })).toBeVisible()
    // 各组人数一览行
    await expect(page.locator('.org-group-row', { hasText: '软件组' })).toBeVisible()

    // 树选择：组态渲染（选中态进 URL）
    await page.locator('.tree-node-name', { hasText: '软件组' }).click()
    await expect(page).toHaveURL(new RegExp('group=3'))
    await expect(page.locator('.ogd-name', { hasText: '软件组' })).toBeVisible()
    await expect(page.getByText('成员名录')).toBeVisible()
    // 树高亮跟随
    await expect(page.locator('.el-tree-node.is-current', { hasText: '软件组' })).toBeVisible()

    // 子组选择（树内直达，无需面包屑）
    await page.locator('.tree-node-name', { hasText: '前端小组' }).click()
    await expect(page).toHaveURL(new RegExp('group=31'))
    await expect(page.locator('.ogd-name', { hasText: '前端小组' })).toBeVisible()

    // 全社回跳：树顶「全社总览」
    await page.locator('.org-root-item', { hasText: '全社总览' }).click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/organization$`))
    await expect(page.locator('.org-group-row', { hasText: '软件组' })).toBeVisible()
  })

  test('深链与无效回落：?group=31 直达子组并高亮；未知 id 回全社', async ({ page }) => {
    await mockOrgPage(page, ME_EMPTY)
    await page.goto(`${BASE}/organization?group=31`)
    await expect(page.locator('.ogd-name', { hasText: '前端小组' })).toBeVisible()
    await expect(page.locator('.el-tree-node.is-current', { hasText: '前端小组' })).toBeVisible()
    // 无效 group：回落全社总览（不渲染组态）
    await page.goto(`${BASE}/organization?group=999`)
    await expect(page.locator('.org-root-item--active')).toBeVisible()
    await expect(page.locator('.ogd-name')).toHaveCount(0)
  })

  test('有权限：组头显示「进入工作区」并直达小组事项（tab=group 兼容重定向）', async ({ page }) => {
    await mockOrgPage(page, ME_GRANTED)
    await page.goto(`${BASE}/organization`)
    await page.locator('.tree-node-name', { hasText: '软件组' }).click()
    const btn = page.locator('.ogd-work-btn')
    await expect(btn).toBeVisible()
    await btn.click()
    // 工作台 III：/work?ws=1&tab=group 重定向到 /work/items?ws=1
    await expect(page).toHaveURL(new RegExp(`${BASE}/work/items\\?ws=1$`))
  })

  test('无权限：不显示「进入工作区」按钮（学员不可见）', async ({ page }) => {
    await mockOrgPage(page, ME_EMPTY)
    await page.goto(`${BASE}/organization`)
    await page.locator('.tree-node-name', { hasText: '软件组' }).click()
    await expect(page.locator('.ogd-name', { hasText: '软件组' })).toBeVisible()
    await expect(page.locator('.ogd-work-btn')).toHaveCount(0)
  })
})

test.describe('事项详情', () => {
  test('渲染正文与回复时间线（引用标记），发送回复携带幂等键', async ({ page }) => {
    const replyPayloads = []
    await loginAsUser(page)
    await page.route('**/work/items/101/replies', async (route) => {
      if (route.request().method() === 'POST') {
        replyPayloads.push(route.request().postDataJSON())
        return route.fulfill({ json: { code: 200, message: '已发送', data: { id: 9100, seq: 3 } } })
      }
      return route.fulfill({ json: REPLIES })
    })
    await page.goto(`${BASE}/work/items/101`)

    await expect(page.getByRole('heading', { name: '期中材料修订排期' })).toBeVisible()
    // 正文 Markdown 渲染
    await expect(page.getByText('背景')).toBeVisible()
    // 时间线：两条回复 + 引用标记 + 动作按钮（协调员可关闭/邀请）
    await expect(page.getByText('第一轮：我先梳理目录')).toBeVisible()
    await expect(page.getByText('收到，我负责第三章')).toBeVisible()
    await expect(page.getByText('引用 #1')).toBeVisible()
    await expect(page.getByRole('button', { name: '关闭话题' })).toBeVisible()

    // 发送回复：幂等键随请求携带
    await page.getByPlaceholder('补充进展、说明阻碍或回复他人（纯文本，换行保留）').fill('明天前给终稿')
    await page.getByRole('button', { name: '发送', exact: true }).click()
    await expect.poll(() => replyPayloads.length).toBe(1)
    expect(replyPayloads[0].body).toBe('明天前给终稿')
    expect(replyPayloads[0].client_request_id).toBeTruthy()
  })

  test('404 统一渲染「内容不可访问」空态（撤权后通知点击）', async ({ page }) => {
    await loginAsUser(page)
    await page.route('http://127.0.0.1:5001/work/items/999', (route) => {
      return route.fulfill({ status: 404, json: { code: 404, message: '事项不存在', data: null } })
    })
    await page.goto(`${BASE}/work/items/999`)
    await expect(page.getByText('内容不可访问')).toBeVisible()
    await expect(page.getByRole('button', { name: '返回工作台' })).toBeVisible()
  })

  test('页面无脚本错误（模板绑定安全网）', async ({ page }) => {
    await loginAsUser(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${BASE}/work/items/101`)
    await expect(page.getByRole('heading', { name: '期中材料修订排期' })).toBeVisible()
    await expect(errors).toEqual([])
  })
})
