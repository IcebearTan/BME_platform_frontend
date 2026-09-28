import { test, expect } from '@playwright/test'

// 内部工作台 M1 骨架：用户端 /work 三态（无资格空态 / 有权限概览）+
// 管理端「组织架构 → 协作授权」治理页（工作区表 + 授权记录 + 开通表单）。
// mock 后端，契约对齐 blueprints/work.py（feature/work-collab M1）。

const USER_BASE = 'http://127.0.0.1:18081/AMEII'
const ADMIN_BASE = 'http://127.0.0.1:15173/admin'

const ME_EMPTY = {
  code: 200, message: 'ok',
  data: { eligibility: null, is_governance: false, workspaces: [],
          todo: { pending_responses: 0, pending_transfers: 0, to_review: 0, due_soon: 0, overdue: 0 } },
}

const ME_GRANTED = {
  code: 200, message: 'ok',
  data: {
    eligibility: { kind: 'officer', officer_id: 8, group_id: 3 },
    is_governance: false,
    workspaces: [{ id: 1, club_group_id: 3, group_name: '软件组', status: 'active', role: 'coordinator' }],
    todo: { pending_responses: 2, pending_transfers: 0, to_review: 1, due_soon: 3, overdue: 0 },
  },
}

async function loginAsUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: 'user' }, checkinInfo: {},
    }))
  })
}

async function mockUserApi(page, meData) {
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/work/me')) {
      return route.fulfill({ json: meData })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test.describe('用户端 /work 工作台骨架', () => {
  test('无资格：空态说明与组织架构引导，不渲染工作区', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page, ME_EMPTY)
    await page.goto(`${USER_BASE}/work`)

    await expect(page.getByRole('heading', { name: '内部工作台' })).toBeVisible()
    await expect(page.getByText('社团工作人员的内部协作区')).toBeVisible()
    await expect(page.getByRole('button', { name: '查看社团组织架构' })).toBeVisible()
    await expect(page.getByText('我的工作区')).toHaveCount(0)
  })

  test('有权限：待办摘要计数与 tab（M2 版工作台主页）', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page, ME_GRANTED)
    await page.goto(`${USER_BASE}/work`)

    await expect(page.getByRole('heading', { name: '内部工作台' })).toBeVisible()
    // 待办摘要：待回复 2 / 待验收 1 / 即将到期 3（数值高亮区）
    const chips = page.locator('.todo-chip')
    await expect(chips).toHaveCount(5)
    await expect(chips.filter({ hasText: '待回复' })).toContainText('2')
    await expect(chips.filter({ hasText: '待验收' })).toContainText('1')
    // 两个主 tab
    await expect(page.getByRole('button', { name: '我的待办' })).toBeVisible()
    await expect(page.getByRole('button', { name: '小组工作' })).toBeVisible()
    // 无治理身份不出现治理提示
    await expect(page.getByText('协作治理身份')).toHaveCount(0)
  })

  test('页面无脚本错误（模板绑定安全网）', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page, ME_GRANTED)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${USER_BASE}/work`)
    await expect(page.getByRole('heading', { name: '内部工作台' })).toBeVisible()
    await expect(errors).toEqual([])
  })
})

test.describe('管理端 协作授权治理页', () => {
  const WORKSPACES = {
    code: 200, message: 'ok',
    data: { workspaces: [
      { id: 1, club_group_id: 3, group_name: '软件组', status: 'active', group_status: 'active', active_grants: 2 },
      { id: 2, club_group_id: 4, group_name: '硬件组', status: 'disabled', group_status: 'active', active_grants: 0 },
    ] },
  }

  const GRANTS = {
    code: 200, message: 'ok',
    data: {
      grants: [
        { id: 11, user_id: 21, username: '陈干事', role: 'coordinator', workspace_id: 1,
          workspace_group_name: '软件组', source_type: 'officer', source_id: 8,
          group_id_snapshot: null, valid_from: null, valid_until: null, status: 'active',
          revoke_reason: null, granted_by: 1, grant_reason: '运行保障值班',
          effective: true, ineffective_reason: null, created_at: '2026-09-28 10:00' },
        { id: 12, user_id: 22, username: '王组员', role: 'member', workspace_id: 1,
          workspace_group_name: '软件组', source_type: 'membership', source_id: 31,
          group_id_snapshot: 3, valid_from: null, valid_until: null, status: 'active',
          revoke_reason: null, granted_by: 1, grant_reason: '软件组开通',
          effective: false, ineffective_reason: '组归属已调整（授权绑定原组）',
          created_at: '2026-09-28 10:05' },
      ],
      total: 2, page: 1, page_size: 20,
    },
  }

  async function loginAsStaff(page) {
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
        return route.fulfill({
          json: { code: 200, role: 'super_admin', permissions: [], User_Name: 'e2e', data: { username: 'e2e' } },
        })
      }
      if (url.includes('/work/governance/workspaces')) {
        return route.fulfill({ json: WORKSPACES })
      }
      if (url.includes('/work/governance/grants')) {
        return route.fulfill({ json: GRANTS })
      }
      if (url.includes('/user/user_list')) {
        return route.fulfill({ json: [
          { User_Id: 21, User_Name: '陈干事' }, { User_Id: 22, User_Name: '王组员' },
        ] })
      }
      if (url.includes('/admin/officers')) {
        return route.fulfill({ json: { code: 200, message: 'ok', data: {
          officers: [{ id: 8, user_id: 21, title: '组长', department: '软件组', status: 'active' }],
          total: 1, page: 1, per_page: 100 } } })
      }
      if (url.includes('/admin/club/groups')) {
        return route.fulfill({ json: { code: 200, message: 'ok', data: { groups: [] } } })
      }
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
  }

  test('工作区表与授权记录渲染，失效原因可见', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto(`${ADMIN_BASE}/organization/work-grants`)

    // 管理端页面标题为 div.page-title（仓内范式），非 heading 元素
    await expect(page.locator('.page-title', { hasText: '协作授权' })).toBeVisible()
    // 工作区表：软件组启用 / 硬件组停用
    await expect(page.getByText('软件组').first()).toBeVisible()
    await expect(page.getByText('已失效：组归属已调整（授权绑定原组）')).toBeVisible()
    await expect(page.getByText('生效中').first()).toBeVisible()
    // 开通表单三档岗位
    await expect(page.getByRole('radio', { name: '组员' })).toBeVisible()
    await expect(page.getByRole('radio', { name: '协调员' })).toBeVisible()
    await expect(page.getByRole('radio', { name: '治理' })).toBeVisible()
  })
})
