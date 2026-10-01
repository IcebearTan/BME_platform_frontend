import { test, expect } from '@playwright/test'

// 工作台 III 应用外壳（WorkShell）：侧栏导航 / 旧 URL tab= 重定向兼容 /
// 通知深链 / 待办徽标 / subtree 条件导航 / 无资格空态。mock 后端，
// 契约对齐 blueprints/work.py（feature/work-collab 工作台 III）。

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

const ME_SUBTREE = {
  code: 200, message: 'ok',
  data: {
    eligibility: { kind: 'officer', officer_id: 9, group_id: 3 },
    is_governance: false,
    workspaces: [{ id: 1, club_group_id: 3, group_name: '软件组', status: 'active',
                   role: 'coordinator', subtree: true }],
    todo: { pending_responses: 0, pending_transfers: 0, to_review: 0, due_soon: 0, overdue: 0 },
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
    ],
    total: 1, page: 1, page_size: 20,
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
    ],
    has_more: false, next_after_seq: 1, last_reply_seq: 1,
  },
}

const ORG = {
  code: 200, message: 'ok',
  data: {
    president: { id: 1, username: '社长', title: '社长' },
    management: [{ id: 2, username: '副社长', title: '副社长' }],
    tree: [
      {
        id: 3, name: '软件组', leader: { id: 21, username: '陈干事' }, oversee_by: null,
        counts: { primary: 2, secondary: 0 },
        members: [{ id: 21, username: '陈干事', slot: 'primary', is_leader: true }],
        children: [
          { id: 31, name: '前端小组', leader: null, oversee_by: null,
            counts: { primary: 1, secondary: 0 }, members: [], children: [] },
        ],
      },
      { id: 4, name: '硬件组', leader: null, oversee_by: null,
        counts: { primary: 0, secondary: 0 }, members: [], children: [] },
    ],
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
    if (url.includes('/work/objects/board')) {
      return route.fulfill({ json: { code: 200, data: { objects: [], stewardable_types: [] } } })
    }
    if (url.includes('/work/files')) {
      return route.fulfill({ json: { code: 200, data: { files: [], total: 0, page: 1, page_size: 20 } } })
    }
    if (url.match(/\/work\/items\?/)) return route.fulfill({ json: ITEMS })
    if (url.includes('/work/items/101/replies')) return route.fulfill({ json: REPLIES })
    if (url.includes('/work/items/101/events')) {
      return route.fulfill({ json: { code: 200, data: { events: [], total: 0, page: 1, page_size: 30 } } })
    }
    if (url.includes('/work/items/101')) return route.fulfill({ json: ITEM_DETAIL })
    if (url.includes('/work/candidates')) {
      return route.fulfill({ json: { code: 200, data: { candidates: [] } } })
    }
    if (url.includes('/organization')) return route.fulfill({ json: ORG })
    if (url.includes('/notification/')) {
      return route.fulfill({ json: { code: 200, data: {} } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test.describe('外壳与导航', () => {
  test('外壳渲染：顶栏+侧栏+概览待办；子组汇总无 subtree 不出现', async ({ page }) => {
    await loginAsUser(page, ME_GRANTED)
    await page.goto(`${BASE}/work`)
    // 顶栏
    await expect(page.locator('.ws-back', { hasText: '返回平台' })).toBeVisible()
    await expect(page.locator('.ws-crumb-root', { hasText: '内部工作台' })).toBeVisible()
    // 侧栏导航（无 subtree：子组汇总不渲染）
    await expect(page.locator('.ws-nav-item', { hasText: '概览' })).toBeVisible()
    await expect(page.locator('.ws-nav-item', { hasText: '小组事项' })).toBeVisible()
    await expect(page.locator('.ws-nav-item', { hasText: '看板' })).toBeVisible()
    await expect(page.locator('.ws-nav-item', { hasText: '成员' })).toBeVisible()
    await expect(page.locator('.ws-nav-item', { hasText: '工作资料' })).toBeVisible()
    await expect(page.locator('.ws-nav-item', { hasText: '工作记录' })).toBeVisible()
    await expect(page.locator('.ws-nav-item', { hasText: '子组汇总' })).toHaveCount(0)
    // 概览待办徽标 = 五桶之和（1+0+0+2+0=3）
    await expect(page.locator('.ws-nav-badge', { hasText: '3' })).toBeVisible()
    // 概览内容：数字块（五桶计数）+ 待回复行动桶 + 信息区
    await expect(page.locator('.stat-block', { hasText: '待回复' })).toBeVisible()
    await expect(page.locator('.todo-title', { hasText: '期中材料修订排期' })).toBeVisible()
    await expect(page.locator('.info-title', { hasText: '最近活动' })).toBeVisible()
  })

  test('subtree 授权者出现「子组汇总」导航且可进入', async ({ page }) => {
    await loginAsUser(page, ME_SUBTREE)
    await page.goto(`${BASE}/work`)
    const nav = page.locator('.ws-nav-item', { hasText: '子组汇总' })
    await expect(nav).toBeVisible()
    await nav.click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/work/summary`))
    await expect(page.locator('.ws-crumb-view', { hasText: '子组汇总' })).toBeVisible()
  })

  test('侧栏导航切换：URL 即导航，激活态跟随', async ({ page }) => {
    await loginAsUser(page)
    await page.goto(`${BASE}/work`)
    await page.locator('.ws-nav-item', { hasText: '小组事项' }).click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/work/items`))
    await expect(page.locator('.ws-nav-item--active', { hasText: '小组事项' })).toBeVisible()
    // 小组事项视图渲染表格（WorkItemsTable）
    await expect(page.locator('.cell-title', { hasText: '期中材料修订排期' })).toBeVisible()
    await page.locator('.ws-nav-item', { hasText: '工作记录' }).click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/work/records`))
  })
})

test.describe('旧 URL 兼容重定向', () => {
  test('tab=group 重定向到 /work/items，ws= 透传', async ({ page }) => {
    await loginAsUser(page)
    await page.goto(`${BASE}/work?tab=group&ws=1`)
    await expect(page).toHaveURL(new RegExp(`${BASE}/work/items\\?ws=1$`))
  })

  test('tab=files 重定向到 /work/files', async ({ page }) => {
    await loginAsUser(page)
    await page.goto(`${BASE}/work?tab=files`)
    await expect(page).toHaveURL(new RegExp(`${BASE}/work/files$`))
  })

  test('tab=todo 停留概览并剥离 tab 参数', async ({ page }) => {
    await loginAsUser(page)
    await page.goto(`${BASE}/work?tab=todo`)
    await expect(page).toHaveURL(new RegExp(`${BASE}/work$`))
    await expect(page.locator('.stat-block', { hasText: '待回复' })).toBeVisible()
  })
})

test.describe('成员看板', () => {
  test('全社名录：管理层+分组渲染，我的工作区置顶标记，点成员进主页', async ({ page }) => {
    await loginAsUser(page)
    await page.goto(`${BASE}/work/members`)
    // 顶栏面包屑 + 工具栏计数（社长+副社长+陈干事=3）
    await expect(page.locator('.ws-crumb-view', { hasText: '成员' })).toBeVisible()
    await expect(page.locator('.total-hint')).toContainText('共 3 名成员')
    // 管理层分区 + 成员卡
    await expect(page.locator('.sec-title', { hasText: '社长与管理层' })).toBeVisible()
    await expect(page.locator('.member-name', { hasText: '副社长' })).toBeVisible()
    // 我的工作区（软件组 club_group_id=3 匹配 ME_GRANTED）：带标记，且在分组序列首位（置顶）；
    // first：子组「软件组 / 前端小组」的父路径文本也含「软件组」
    const swHead = page.locator('.sec-head', { hasText: '软件组' }).first()
    await expect(swHead).toContainText('我的工作区')
    const groupHeads = page.locator('.sec-title--link')
    await expect(groupHeads.first()).toContainText('软件组')
    await expect(page.locator('.member-name', { hasText: '陈干事' })).toBeVisible()
    // 组长标签
    await expect(page.locator('.member-chip', { hasText: '陈干事' }).first()).toContainText('组长')
    // 点成员进个人主页
    await page.locator('.member-chip', { hasText: '陈干事' }).first().click()
    await expect(page).toHaveURL(new RegExp('/profile/21'))
  })

  test('检索与组筛选：关键词过滤成员与分区，无结果有提示', async ({ page }) => {
    await loginAsUser(page)
    await page.goto(`${BASE}/work/members`)
    // 按姓名搜：只剩匹配成员所在分区
    await page.locator('.filter-bar input').first().fill('陈干事')
    await expect(page.locator('.member-name', { hasText: '陈干事' })).toBeVisible()
    await expect(page.locator('.member-name', { hasText: '副社长' })).toHaveCount(0)
    // 按组名搜：分区名匹配时整组保留（含空成员组提示）
    await page.locator('.filter-bar input').first().fill('硬件')
    await expect(page.locator('.sec-title--link', { hasText: '硬件组' })).toBeVisible()
    await expect(page.locator('.sec-empty')).toContainText('本组暂无直挂成员')
    // 无结果
    await page.locator('.filter-bar input').first().fill('不存在的名字')
    await expect(page.getByText('没有匹配「不存在的名字」的成员')).toBeVisible()
  })

  test('组名深链组织页；点组名跳转带 ?group=', async ({ page }) => {
    await loginAsUser(page)
    await page.goto(`${BASE}/work/members`)
    await page.locator('.sec-title--link', { hasText: '硬件组' }).click()
    await expect(page).toHaveURL(new RegExp('/organization\\?group=4'))
  })
})

test.describe('深链与门禁', () => {
  test('移动端（375px）：侧栏收抽屉，汉堡开关可用，无横向溢出', async ({ page }) => {
    await loginAsUser(page)
    await page.setViewportSize({ width: 375, height: 720 })
    await page.goto(`${BASE}/work`)
    // 桌面侧栏收起为抽屉：默认不可见，汉堡点开
    await expect(page.locator('.ws-side')).not.toBeVisible()
    await page.locator('.ws-icon-btn').click()
    await expect(page.locator('.ws-side--open')).toBeVisible()
    // 抽屉内点导航：跳转并自动收起
    await page.locator('.ws-side--open .ws-nav-item', { hasText: '小组事项' }).click()
    await expect(page).toHaveURL(new RegExp(`${BASE}/work/items`))
    await expect(page.locator('.ws-side--open')).toHaveCount(0)
    // 无横向溢出
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('通知深链 /work/items/:id：详情渲染，面包屑显示事项详情，小组事项高亮', async ({ page }) => {
    await loginAsUser(page)
    await page.goto(`${BASE}/work/items/101`)
    await expect(page.locator('.item-title', { hasText: '期中材料修订排期' })).toBeVisible()
    await expect(page.locator('.ws-crumb-view', { hasText: '事项详情' })).toBeVisible()
    await expect(page.locator('.ws-nav-item--active', { hasText: '小组事项' })).toBeVisible()
  })

  test('无资格直开：空态卡渲染，侧栏不出现', async ({ page }) => {
    await loginAsUser(page, ME_EMPTY)
    await page.goto(`${BASE}/work`)
    await expect(page.locator('.state-title', { hasText: '内部工作台' })).toBeVisible()
    await expect(page.locator('.ws-nav')).toHaveCount(0)
  })

  test('页面无脚本错误（模板绑定安全网）', async ({ page }) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    await loginAsUser(page)
    await page.goto(`${BASE}/work`)
    await page.locator('.ws-nav-item', { hasText: '看板' }).click()
    await page.locator('.ws-nav-item', { hasText: '工作资料' }).click()
    await page.goto(`${BASE}/work/items/101`)
    await expect(errors).toEqual([])
  })
})
