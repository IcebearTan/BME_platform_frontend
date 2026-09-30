import { test, expect } from '@playwright/test'

// 内部工作台 M4/M5：工作资料（附件索引）/工作记录（历史检索）/事项附件区/
// 移动端 375px 可用性（D02）/管理端治理工具区。mock 后端，契约对齐
// services/work/files.py 与 integrations.py。

const BASE = 'http://127.0.0.1:18081/AMEII'
const ADMIN_BASE = 'http://127.0.0.1:15173/admin'

const ME_GRANTED = {
  code: 200, message: 'ok',
  data: {
    eligibility: { kind: 'member', group_ids: [3] }, is_governance: false,
    workspaces: [{ id: 1, club_group_id: 3, group_name: '软件组', status: 'active', role: 'member' }],
    todo: { pending_responses: 0, pending_transfers: 0, to_review: 0, due_soon: 0, overdue: 0 },
  },
}

const FILES_INDEX = {
  code: 200, message: 'ok',
  data: {
    files: [
      { id: 5, display_name: '期中材料修订清单.txt', size: 2048, uploaded_by: '王组员',
        updated_at: '2026-09-28 15:00', item_id: 101, item_title: '期中材料修订排期' },
    ],
    total: 1, page: 1, page_size: 20,
  },
}

const RECORD_ITEMS = {
  code: 200, message: 'ok',
  data: {
    items: [
      { id: 101, group_name: '软件组', kind: 'topic', title: '已完结的排期讨论',
        visibility: 'workspace', status: 'closed', created_by: 21, version: 9,
        reply_count: 6, unread: false,
        last_activity_at: '2026-09-27 18:00', created_at: '2026-09-20 09:00' },
    ],
    total: 1, page: 1, page_size: 20,
  },
}

const ITEM_WITH_FILES = {
  code: 200, message: 'ok',
  data: {
    id: 101, workspace_id: 1, group_name: '软件组', kind: 'task',
    title: '期中材料修订排期', body: '正文',
    visibility: 'workspace', status: 'in_progress', created_by: 21, version: 7,
    created_by_name: '陈干事', reply_count: 0, last_read_seq: 0,
    created_at: '2026-09-26 09:00', last_activity_at: '2026-09-28 11:20',
    participants: [], allowed_actions: ['reply', 'edit', 'block', 'submit', 'cancel'],
    item_access: { via: 'workspace', workspace_role: 'coordinator' },
    business_links: [{ source_type: 'course', source_id: 3, relation: 'related',
                       title: '解剖学入门', accessible: true }],
    files: [
      { id: 5, item_id: 101, display_name: '交付说明.txt', status: 'active', link_id: 12,
        current_version: { id: 51, version_no: 2, size: 1024, content_type: 'text/plain',
                           format_check: 'passed', scan_status: 'not_required',
                           uploaded_by: 22, created_at: '2026-09-28 10:00' } },
    ],
    task: {
      assignee_user_id: 21, assignee_name: '陈干事', reviewer_user_id: null,
      reviewer_name: null, start_at: null, due_at: '2026-09-30 18:00',
      priority: 'normal', accept_criteria: null, overdue: false, submissions: [],
    },
  },
}

async function loginAsUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: 'user', User_Id: 21, User_Name: '陈干事' }, checkinInfo: {},
    }))
  })
}

async function mockUserApi(page) {
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/work/me/todos')) {
      return route.fulfill({ json: { code: 200, data: {
        pending_responses: [], pending_transfers: [], to_review: [], due: [] } } })
    }
    if (url.includes('/work/me')) return route.fulfill({ json: ME_GRANTED })
    if (url.match(/\/work\/files\?/)) return route.fulfill({ json: FILES_INDEX })
    if (url.includes('/work/files/5/versions')) {
      return route.fulfill({ json: { code: 200, data: { id: 5, display_name: '交付说明.txt',
        status: 'active', current_version: ITEM_WITH_FILES.data.files[0].current_version,
        versions: [
          { id: 50, version_no: 1, size: 512, content_type: 'text/plain',
            format_check: 'passed', scan_status: 'not_required', uploaded_by: 22,
            created_at: '2026-09-27 10:00' },
          { id: 51, version_no: 2, size: 1024, content_type: 'text/plain',
            format_check: 'passed', scan_status: 'not_required', uploaded_by: 22,
            created_at: '2026-09-28 10:00' },
        ] } } })
    }
    if (url.includes('/work/items/101')) return route.fulfill({ json: ITEM_WITH_FILES })
    if (url.includes('/work/items')) return route.fulfill({ json: RECORD_ITEMS })
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test.describe('工作资料与工作记录（M4/M5）', () => {
  test('工作资料：附件索引渲染并跳转事项', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page)
    await page.goto(`${BASE}/work?tab=files`)
    await expect(page.getByText('期中材料修订清单.txt')).toBeVisible()
    await expect(page.getByText('期中材料修订排期')).toBeVisible()
  })

  test('工作记录：历史检索渲染（含已完结状态）', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page)
    await page.goto(`${BASE}/work?tab=records`)
    await expect(page.getByText('已完结的排期讨论')).toBeVisible()
    await expect(page.getByText('已关闭', { exact: true }).first()).toBeVisible()
  })

  test('事项附件区：列表/业务关联投影/版本历史', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page)
    await page.goto(`${BASE}/work/items/101`)
    await expect(page.getByText('附件（1）')).toBeVisible()
    await expect(page.getByText('交付说明.txt')).toBeVisible()
    await expect(page.getByRole('button', { name: '上传附件' })).toBeVisible()
    await page.getByRole('button', { name: '版本', exact: true }).click()
    await expect(page.getByText('版本历史')).toBeVisible()
    await expect(page.getByText('v1')).toBeVisible()
    await expect(page.getByText('v2', { exact: true })).toBeVisible()
  })
})

test.describe('移动端可用性（D02，375px）', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('工作台移动端：四 tab 可用、无横向溢出', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page)
    await page.goto(`${BASE}/work`)
    await expect(page.getByRole('heading', { name: '内部工作台' })).toBeVisible()
    // tab 均可点
    for (const tab of ['小组工作', '工作资料', '工作记录', '我的待办']) {
      await page.getByRole('button', { name: tab }).click()
      await expect(page).toHaveURL(new RegExp(`tab=`))
    }
    // 无横向滚动（内容不溢出视口）
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(2)
  })

  test('事项详情移动端：标题与回复输入可见', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page)
    await page.goto(`${BASE}/work/items/101`)
    await expect(page.getByRole('heading', { name: '期中材料修订排期' })).toBeVisible()
    await expect(page.getByPlaceholder(/补充进展、说明阻碍或回复他人/)).toBeVisible()
  })
})

test.describe('管理端治理工具（M5）', () => {
  test('需接管队列与治理工具区渲染', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('bme-admin-token', 'e2e-mock-token')
      localStorage.setItem('bme-admin-state', JSON.stringify({
        token: 'e2e-mock-token',
        user: { role: 'super_admin', permissions: [], User_Name: 'e2e' },
        isLogin: true, isDarkMode: false,
      }))
    })
    await page.route('http://127.0.0.1:5001/**', (route) => {
      const url = route.request().url()
      if (url.includes('/user/user_index')) {
        return route.fulfill({ json: { code: 200, role: 'super_admin', permissions: [],
                                       User_Name: 'e2e', data: { username: 'e2e' } } })
      }
      if (url.includes('/work/governance/takeover-queue')) {
        return route.fulfill({ json: { code: 200, data: { items: [
          { item_id: 101, title: '设备检修排期', assignee_user_id: 22,
            assignee_name: '王组员', group_name: '软件组', status: 'in_progress' }] } } })
      }
      if (url.includes('/work/governance/handover')) {
        return route.fulfill({ json: { code: 200, data: {
          user: { id: 22, username: '王组员' },
          counts: { unfinished: 1, to_review: 0, pending_responses: 0, pending_transfers: 0 },
          grants: [{ id: 9, role: 'member', workspace_id: 1, effective: false, reason: '组归属已调整（授权绑定原组）' }] } } })
      }
      if (url.includes('/work/governance/workspaces')) {
        return route.fulfill({ json: { code: 200, data: { workspaces: [] } } })
      }
      if (url.includes('/work/governance/grants')) {
        return route.fulfill({ json: { code: 200, data: { grants: [], total: 0, page: 1, page_size: 20 } } })
      }
      if (url.includes('/user/user_list')) {
        return route.fulfill({ json: [{ User_Id: 22, User_Name: '王组员' }] })
      }
      if (url.includes('/admin/officers')) {
        return route.fulfill({ json: { code: 200, data: { officers: [], total: 0 } } })
      }
      if (url.includes('/admin/club/groups')) {
        return route.fulfill({ json: { code: 200, data: { groups: [] } } })
      }
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
    await page.goto(`${ADMIN_BASE}/organization/work-grants`)
    await expect(page.locator('.page-title', { hasText: '协作授权' })).toBeVisible()
    // 需接管队列
    await expect(page.getByText('需接管事项')).toBeVisible()
    await expect(page.getByText('设备检修排期')).toBeVisible()
    // 所属工作区列（takeover 行的 group_name 投影）
    await expect(page.locator('.el-table').filter({ hasText: '设备检修排期' })
      .getByText('软件组')).toBeVisible()
    // 治理工具：交接清单 + 紧急介入
    await expect(page.getByText('治理工具')).toBeVisible()
    await expect(page.getByText('交接清单（调组/卸任前生成）')).toBeVisible()
    // EP2 非聚焦态 placeholder 是 span 非 input 属性：按区块定位 select 本体
    await page.locator('.gov-tool', { hasText: '交接清单' }).locator('.el-select').click()
    await page.getByRole('option', { name: '王组员' }).click()
    await page.getByRole('button', { name: '生成清单' }).click()
    await expect(page.getByText('未完成任务')).toBeVisible()
    await expect(page.getByText('组归属已调整（授权绑定原组）')).toBeVisible()
  })
})
