import { test, expect } from '@playwright/test'

// 内部工作台 X1 跨组协作：待接单桶（接单/拒绝）、交付对话框（payload 契约）、
// 子组汇总 tab（受限占位/无正文入口）、候选身份标注。mock 后端。

const BASE = 'http://127.0.0.1:18081/AMEII'

const ME_COORD = {
  code: 200, message: 'ok',
  data: {
    eligibility: { kind: 'member' }, is_governance: false,
    workspaces: [{ id: 1, club_group_id: 3, group_name: '软件组', status: 'active',
                   role: 'coordinator', subtree: true }],
    available_targets: [{ ws_id: 2, group_name: '运行保障组' },
                        { ws_id: 1, group_name: '软件组' }],
    todo: { pending_responses: 0, pending_transfers: 0, to_review: 0, due_soon: 0, overdue: 0 },
  },
}

const TODOS = {
  code: 200, message: 'ok',
  data: {
    pending_responses: [], pending_transfers: [], to_review: [], due: [],
    handoffs: [
      { id: 31, item_id: 101, item_title: '第三章修订', from_group_name: '软件组',
        to_group_name: '运行保障组', kind: '上架', deadline: '2026-10-03 12:00',
        status: 'offered' },
    ],
  },
}

const SUMMARY = {
  code: 200, message: 'ok',
  data: {
    items: [
      { id: 101, restricted: false, group_name: '硬件组', kind: 'task',
        title: '设备检修排期', status: 'in_progress', assignee_name: '王组员',
        due_at: '2026-10-01 18:00', overdue: true, last_activity_at: '2026-09-28 11:00' },
      { id: 102, restricted: true, group_name: '硬件组', kind: 'topic', status: 'open' },
    ],
    total: 2, page: 1, page_size: 20,
  },
}

const ITEM_DETAIL = {
  code: 200, message: 'ok',
  data: {
    id: 101, workspace_id: 1, group_name: '软件组', kind: 'task',
    title: '第三章修订', body: '正文', visibility: 'workspace', status: 'done',
    created_by: 21, version: 9, created_by_name: '陈干事', reply_count: 0,
    last_read_seq: 0, created_at: '2026-09-26 09:00', last_activity_at: '2026-09-28 11:20',
    participants: [], allowed_actions: ['reply', 'edit', 'handoff', 'invite'],
    item_access: { via: 'workspace', workspace_role: 'coordinator' },
    files: [], business_links: [],
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
      user: { role: 'user', User_Id: 21, User_Name: '陈干事' }, checkinInfo: {},
    }))
  })
}

test.describe('待接单桶', () => {
  test('渲染交付卡（用途/源组/期限），接单发 POST 并刷新', async ({ page }) => {
    await loginAsUser(page)
    const posts = []
    await page.route('http://127.0.0.1:5001/**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (url.includes('/work/handoffs/31/accept') && method === 'POST') {
        posts.push(url)
        return route.fulfill({ json: { code: 200, message: '已接单，任务已建到本组工作区',
                                        data: { handoff_id: 31, status: 'accepted', accepted_item_id: 205 } } })
      }
      if (url.includes('/work/me/todos')) return route.fulfill({ json: TODOS })
      if (url.includes('/work/me')) return route.fulfill({ json: ME_COORD })
      if (url.includes('/work/items')) {
        return route.fulfill({ json: { code: 200, data: { items: [], total: 0, page: 1, page_size: 20 } } })
      }
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
    await page.goto(`${BASE}/work`)
    await expect(page.getByText('待接单')).toBeVisible()
    await expect(page.getByText('[上架] 第三章修订')).toBeVisible()
    await expect(page.getByText('软件组 交付给本组')).toBeVisible()
    await page.getByRole('button', { name: '接单' }).click()
    await expect.poll(() => posts.length).toBe(1)
    await expect(page.getByText('任务已建到本组「小组工作」')).toBeVisible()
  })
})

test.describe('子组汇总 tab', () => {
  test('subtree 授权者可见：摘要卡 + 受限占位 + 点击不进正文', async ({ page }) => {
    await loginAsUser(page)
    await page.route('http://127.0.0.1:5001/**', (route) => {
      const url = route.request().url()
      if (url.includes('rollup=subtree')) return route.fulfill({ json: SUMMARY })
      if (url.includes('/work/me/todos')) {
        return route.fulfill({ json: { code: 200, data: {
          pending_responses: [], pending_transfers: [], to_review: [], due: [], handoffs: [] } } })
      }
      if (url.includes('/work/me')) return route.fulfill({ json: ME_COORD })
      if (url.includes('/work/items')) {
        return route.fulfill({ json: { code: 200, data: { items: [], total: 0, page: 1, page_size: 20 } } })
      }
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
    await page.goto(`${BASE}/work`)
    await expect(page.getByRole('button', { name: '子组汇总' })).toBeVisible()
    await page.getByRole('button', { name: '子组汇总' }).click()
    await expect(page.getByText('设备检修排期')).toBeVisible()
    await expect(page.getByText('（已逾期）')).toBeVisible()
    await expect(page.getByText('一项受限事项')).toBeVisible()
    await expect(page.getByText('仅摘要：标题 / 状态 / 负责人 / 截止')).toBeVisible()
    // 点击摘要卡：提示而非路由跳转
    await page.locator('.sum-card').first().click()
    await expect(page.getByText('摘要层不提供正文入口')).toBeVisible()
  })
})

test.describe('交付对话框', () => {
  test('填写目标组/用途/说明，POST 契约含全部字段', async ({ page }) => {
    await loginAsUser(page)
    const payloads = []
    await page.route('http://127.0.0.1:5001/**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (url.includes('/work/items/101/handoffs') && method === 'POST') {
        payloads.push(route.request().postDataJSON())
        return route.fulfill({ json: { code: 200, message: '交付已发起，等待对方组接单',
                                        data: { handoff_id: 31 } } })
      }
      if (url.includes('/work/items/101')) return route.fulfill({ json: ITEM_DETAIL })
      if (url.includes('/work/me/todos')) {
        return route.fulfill({ json: { code: 200, data: {
          pending_responses: [], pending_transfers: [], to_review: [], due: [], handoffs: [] } } })
      }
      if (url.includes('/work/me')) return route.fulfill({ json: ME_COORD })
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
    await page.goto(`${BASE}/work/items/101`)
    await page.getByRole('button', { name: '交付给其他组' }).click()
    await expect(page.getByText('跨组交付（目标组接单后在本组生成关联任务）')).toBeVisible()
    // EP2 select 的 input 被 placeholder span 拦截——点 select 本体
    await page.getByRole('dialog').locator('.el-select').first().click()
    await page.getByRole('option', { name: '运行保障组', exact: true }).click()
    await page.getByRole('dialog').getByRole('textbox', { name: /用途/ }).fill('上架')
    await page.getByRole('dialog').getByRole('textbox', { name: /交付说明/ }).fill('课程已就绪，请上架')
    await page.getByRole('button', { name: '确认执行' }).click()
    await expect.poll(() => payloads.length).toBe(1)
    expect(payloads[0]).toMatchObject({
      to_workspace_id: 2, kind: '上架', note: '课程已就绪，请上架' })
    await expect(page.getByText('等待对方组接单')).toBeVisible()
  })
})

test.describe('候选身份标注', () => {
  test('候选下拉显示「姓名（组名）」', async ({ page }) => {
    await loginAsUser(page)
    await page.route('http://127.0.0.1:5001/**', (route) => {
      const url = route.request().url()
      if (url.includes('/work/candidates')) {
        return route.fulfill({ json: { code: 200, data: { candidates: [
          { user_id: 22, username: '王组员', group_name: '硬件组', title: '组长' },
          { user_id: 23, username: '李干事', group_name: null, title: null }] } } })
      }
      if (url.includes('/work/items/101')) return route.fulfill({ json: ITEM_DETAIL })
      if (url.includes('/work/me/todos')) {
        return route.fulfill({ json: { code: 200, data: {
          pending_responses: [], pending_transfers: [], to_review: [], due: [], handoffs: [] } } })
      }
      if (url.includes('/work/me')) return route.fulfill({ json: ME_COORD })
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
    await page.goto(`${BASE}/work/items/101`)
    await page.getByRole('button', { name: '邀请参与者' }).click()
    await page.getByRole('combobox').click()
    await expect(page.getByRole('option', { name: /王组员/ })).toContainText('硬件组')
  })
})
