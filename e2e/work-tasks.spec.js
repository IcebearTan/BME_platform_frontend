import { test, expect } from '@playwright/test'

// 内部工作台 M3：任务闭环前端——四桶待办（转交接手/待回复/待验收/到期逾期）、
// 任务详情（属性面板+提交历史+命令栏 expected_version）、创建任务表单、版本冲突提示。
// mock 后端，契约对齐 services/work/tasks.py 与 items.py 任务段。

const BASE = 'http://127.0.0.1:18081/AMEII'

const ME_GRANTED = {
  code: 200, message: 'ok',
  data: {
    eligibility: { kind: 'member', group_ids: [3] },
    is_governance: false,
    workspaces: [{ id: 1, club_group_id: 3, group_name: '软件组', status: 'active', role: 'coordinator' }],
    todo: { pending_responses: 1, pending_transfers: 1, to_review: 1, due_soon: 1, overdue: 1 },
  },
}

const TODOS = {
  code: 200, message: 'ok',
  data: {
    pending_responses: [
      { request_id: 55, item_id: 101, item_title: '期中材料修订', requested_by: '陈干事',
        due_at: '2026-09-30 18:00', created_at: '2026-09-28 09:00' },
    ],
    pending_transfers: [
      { transfer_id: 9, item_id: 103, item_title: '设备检修排期',
        from_user_id: 21, expires_at: '2026-10-01 12:00' },
    ],
    to_review: [
      { item_id: 104, item_title: '新社员培训材料', due_at: '2026-09-30 10:00' },
    ],
    due: [
      { item_id: 105, item_title: '值班表更新', due_at: '2026-09-27 18:00', overdue: true },
      { item_id: 106, item_title: '仓库盘点', due_at: '2026-09-29 18:00', overdue: false },
    ],
  },
}

const TASK_DETAIL = {
  code: 200, message: 'ok',
  data: {
    id: 103, workspace_id: 1, group_name: '软件组', kind: 'task',
    title: '设备检修排期', body: '检修计划如下',
    visibility: 'workspace', status: 'in_progress', created_by: 21, version: 7,
    created_by_name: '陈干事', reply_count: 1, last_read_seq: 1,
    created_at: '2026-09-26 09:00', last_activity_at: '2026-09-28 11:20',
    participants: [{ user_id: 22, username: '王组员', ptype: 'collaborator' }],
    allowed_actions: ['reply', 'edit', 'block', 'submit', 'reschedule', 'reassign',
                      'cancel', 'transfer'],
    item_access: { via: 'workspace', workspace_role: 'coordinator' },
    task: {
      assignee_user_id: 21, assignee_name: '陈干事',
      reviewer_user_id: 30, reviewer_name: '李验收',
      start_at: '2026-09-27 09:00', due_at: '2026-09-29 18:00',
      priority: 'high', accept_criteria: '按清单完成全部检修项',
      overdue: false,
      submissions: [
        { id: 71, seq: 1, submitted_by: 21, submitted_by_name: '陈干事',
          result_note: '第一批完成', decision: 'returned',
          decision_note: '漏了三号设备', decided_at: '2026-09-28 10:00',
          created_at: '2026-09-28 09:30' },
        { id: 72, seq: 2, submitted_by: 21, submitted_by_name: '陈干事',
          result_note: '补齐三号设备', decision: null,
          decision_note: null, decided_at: null, created_at: '2026-09-28 11:00' },
      ],
    },
  },
}

const REPLIES = {
  code: 200, message: 'ok',
  data: { replies: [], has_more: false, next_after_seq: 0, last_reply_seq: 0 },
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

async function mockApi(page, { commandResponse } = {}) {
  await page.route('http://127.0.0.1:5001/**', async (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.includes('/work/me/todos')) return route.fulfill({ json: TODOS })
    if (url.includes('/work/me')) return route.fulfill({ json: ME_GRANTED })
    if (url.includes('/work/items/103/replies')) return route.fulfill({ json: REPLIES })
    if (url.includes('/work/items/103/events')) {
      return route.fulfill({ json: { code: 200, data: { events: [], total: 0, page: 1, page_size: 30 } } })
    }
    if (url.includes('/work/items/103') && method === 'POST' && url.includes('commands')) {
      if (commandResponse === 'conflict') {
        return route.fulfill({ status: 409, json: { code: 409, message: '事项已被他人更新，请刷新后重试', data: null } })
      }
      return route.fulfill({ json: { code: 200, message: '已执行',
                                      data: { id: 103, status: 'blocked', version: 8 } } })
    }
    if (url.includes('/work/items/103')) return route.fulfill({ json: TASK_DETAIL })
    if (url.includes('/work/candidates')) {
      return route.fulfill({ json: { code: 200, data: { candidates: [
        { user_id: 22, username: '王组员' }, { user_id: 30, username: '李验收' }] } } })
    }
    if (url.includes('/work/items')) {
      return route.fulfill({ json: { code: 200, data: { items: [], total: 0, page: 1, page_size: 20 } } })
    }
    if (url.includes('/notification/')) return route.fulfill({ json: { code: 200, data: {} } })
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test.describe('待办四桶', () => {
  test('待接手/待回复/待验收/到期四桶齐渲染，逾期高亮，转交可接手', async ({ page }) => {
    await loginAsUser(page)
    await mockApi(page)
    // 专用路由须在 mockApi 之后注册（后注册者优先，否则被兜底拦截）
    const transfers = []
    await page.route('http://127.0.0.1:5001/work/transfers/9/accept', (route) => {
      transfers.push(route.request().method())
      return route.fulfill({ json: { code: 200, message: '已接手，你现在是该任务的负责人',
                                      data: { transfer_id: 9, status: 'accepted' } } })
    })
    await page.goto(`${BASE}/work`)

    await expect(page.locator('.bucket-title', { hasText: '待接手' })).toBeVisible()
    await expect(page.locator('.bucket-title', { hasText: '待回复' })).toBeVisible()
    await expect(page.locator('.bucket-title', { hasText: '待验收' })).toBeVisible()
    await expect(page.locator('.bucket-title', { hasText: '到期任务' })).toBeVisible()
    // 逾期红显（分桶行内的「（已逾期）」后缀，避开摘要条的同名标签）
    await expect(page.getByText('（已逾期）')).toBeVisible()
    // 接手转交
    await page.getByRole('button', { name: '接手' }).click()
    await expect.poll(() => transfers.length).toBe(1)
    await expect(page.getByText('你现在是该任务的负责人')).toBeVisible()
  })
})

test.describe('任务详情', () => {
  test('属性面板与提交历史渲染；命令栏按钮执行并携带 expected_version', async ({ page }) => {
    await loginAsUser(page)
    await mockApi(page)
    const payloads = []
    await page.route('http://127.0.0.1:5001/work/items/103/commands', async (route) => {
      if (route.request().method() === 'POST') {
        payloads.push(route.request().postDataJSON())
        return route.fulfill({ json: { code: 200, message: '已执行',
                                        data: { id: 103, status: 'blocked', version: 8 } } })
      }
      return route.fulfill({ json: TASK_DETAIL })
    })
    await page.goto(`${BASE}/work/items/103`)

    // 属性面板：验收人/验收标准/提交历史
    await expect(page.getByRole('heading', { name: '设备检修排期' })).toBeVisible()
    await expect(page.locator('.task-panel')).toContainText('陈干事')
    await expect(page.locator('.task-panel')).toContainText('李验收')
    await expect(page.locator('.task-panel')).toContainText('按清单完成全部检修项')
    // 提交历史：退回意见 + 待验收
    await expect(page.locator('.task-panel')).toContainText('漏了三号设备')
    await expect(page.getByText('待验收', { exact: true })).toBeVisible()
    // 命令栏按钮按 allowed_actions 渲染
    await expect(page.getByRole('button', { name: '标记受阻' })).toBeVisible()
    await expect(page.getByRole('button', { name: '转交负责人' })).toBeVisible()
    await expect(page.getByRole('button', { name: '开始任务' })).toHaveCount(0)

    // 参数化命令：标记受阻 → 填原因 → 执行（expected_version=7 随行）
    await page.getByRole('button', { name: '标记受阻' }).click()
    await expect(page.getByText('标记受阻（记录原因与跟进时间）')).toBeVisible()
    await page.getByRole('dialog').getByRole('textbox', { name: /受阻原因/ })
      .fill('等配件到货')
    await page.getByRole('button', { name: '确认执行' }).click()
    await expect.poll(() => payloads.length).toBe(1)
    expect(payloads[0]).toMatchObject({ command: 'block', expected_version: 7, blocker_reason: '等配件到货' })
  })

  test('版本冲突 409：提示「已被他人更新」并自动刷新', async ({ page }) => {
    await loginAsUser(page)
    await mockApi(page, { commandResponse: 'conflict' })
    await page.goto(`${BASE}/work/items/103`)
    await page.getByRole('button', { name: '标记受阻' }).click()
    await page.getByRole('dialog').getByRole('textbox', { name: /受阻原因/ })
      .fill('等配件到货')
    await page.getByRole('button', { name: '确认执行' }).click()
    await expect(page.getByText('内容已被他人更新，正在刷新')).toBeVisible()
  })

  test('页面无脚本错误（模板绑定安全网）', async ({ page }) => {
    await loginAsUser(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await mockApi(page)
    await page.goto(`${BASE}/work/items/103`)
    await expect(page.getByRole('heading', { name: '设备检修排期' })).toBeVisible()
    await expect(errors).toEqual([])
  })
})

test.describe('创建任务', () => {
  test('任务模式：负责人/截止必填校验与 payload.task 结构', async ({ page }) => {
    await loginAsUser(page)
    await mockApi(page)
    const creates = []
    await page.route('http://127.0.0.1:5001/work/items', async (route) => {
      if (route.request().method() === 'POST') {
        creates.push(route.request().postDataJSON())
        return route.fulfill({ json: { code: 200, message: '已创建草稿', data: { id: 201 } } })
      }
      return route.fulfill({ json: { code: 200, data: { items: [], total: 0, page: 1, page_size: 20 } } })
    })
    await page.goto(`${BASE}/work?tab=group`)
    // 09-30 #58：入口改「发起事项」（对话框内再选类型）
    await page.getByRole('button', { name: '发起事项' }).click()
    // radio 的原生 input 被可见 label 拦截，点可见按钮本体
    await page.locator('.el-radio-button', { hasText: '任务' }).click()
    await page.getByPlaceholder('一句话说清这件事是什么').fill('筹备招新宣讲')
    // 未选负责人/截止：发布禁用
    const publishBtn = page.getByRole('button', { name: '发布任务' })
    await expect(publishBtn).toBeDisabled()
    // 填齐
    // EP2 select 的 placeholder 是 span 非 input 属性，按可访问名定位 combobox
    await page.getByRole('combobox', { name: /负责人/ }).click()
    await page.getByRole('option', { name: '王组员' }).click()
    const dateInput = page.getByPlaceholder('只选日期则截止当天 23:59')
    await dateInput.fill('2026-10-10')
    await dateInput.press('Enter')          // el-date-picker 手输需回车确认解析
    await expect(publishBtn).toBeEnabled({ timeout: 10000 })
    await publishBtn.click()
    await expect.poll(() => creates.length).toBe(1)
    expect(creates[0]).toMatchObject({
      kind: 'task',
      task: { assignee_user_id: 22, due_at: '2026-10-10', priority: 'normal' },
    })
  })
})
