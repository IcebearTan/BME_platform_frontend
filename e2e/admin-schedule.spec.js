import { test, expect } from '@playwright/test'

// 管理端日程服务面板（批次 A 只读观测）：mock 后端，零依赖真实库。
// 覆盖：三页签渲染与 URL 深链 / 记录筛选 URL 唯一真相源 + 详情抽屉 /
// 设置只读（无写入口）+ 密钥只显配置状态 / 工作台日程风险行深链。

const BASE = 'http://127.0.0.1:15173/admin'

const NOW = '2026-09-25 10:00:00'

const OVERVIEW = {
  code: 200,
  data: {
    as_of: NOW, timezone: 'Asia/Shanghai',
    day_window: { from: '2026-09-25 00:00:00', to: '2026-09-26 00:00:00' },
    metrics: {
      capture_users_today: 3,
      capture_status_today: { done: 2, clarify_needed: 1 },
      reminder_backlog: { pending: 2, retryable: 1, exhausted: 1, total: 4 },
      manual_review: { exhausted_reminders: 1, stalled_captures: 2, total: 3 },
    },
    services: {
      reminder_scan: { key: 'reminder_scan', enabled: true, state: 'ok',
        last_success_at: NOW, last_outcome: 'success' },
      intent: { key: 'intent', enabled: true, state: 'ok', last_finished_at: NOW },
      planner: { key: 'planner', enabled: true, state: 'ok', last_applied_at: NOW },
    },
    risks: [
      { camp_id: null, camp_name: null, rule: 'schedule_reminder_exhausted',
        detail: '1 条提醒重试耗尽，需人工排查', count: 1,
        target: { tab: 'records', type: 'reminder', bucket: 'exhausted' } },
    ],
    source_status: {},
  },
}

const REMINDERS = {
  code: 200,
  data: {
    items: [
      { id: 301, user_id: 52, target_type: 'task', target_id: 61, target_version: 3,
        kind: 'due', trigger_at: NOW, status: 'failed', status_reason_code: null,
        delivered_at: null, attempts: 5, next_retry_at: null, last_error_code: 'notification_write_failed' },
      { id: 302, user_id: 52, target_type: 'event', target_id: 41, target_version: 1,
        kind: 'start', trigger_at: NOW, status: 'expired', status_reason_code: 'stale_version',
        delivered_at: null, attempts: 0, next_retry_at: null, last_error_code: null },
    ],
    total: 2, page: 1, page_size: 20,
  },
  enums: { status: ['pending', 'delivered', 'cancelled', 'expired', 'failed'],
           reason: ['target_gone', 'stale_version'] },
}

const REMINDER_DETAIL = {
  code: 200,
  data: { ...REMINDERS.data.items[0], notification_id: 901,
    created_at: NOW, updated_at: NOW, target_alive: true, target_current_version: 4 },
}

const SETTINGS = {
  code: 200,
  data: {
    as_of: NOW,
    scope_note: '以下为本 API 进程有效值',
    groups: [
      { section: '提醒扫描', items: [
        { key: 'SCHEDULE_REMINDER_SCAN_ENABLED', value: true, source: 'default',
          component: 'schedule_scheduler', restart_needed: true },
      ] },
      { section: 'AI 意图理解', items: [
        { key: 'SCHEDULE_INTENT_MODEL', value: 'deepseek-chat', source: 'default',
          component: 'intent.parse_capture', restart_needed: false },
      ] },
    ],
    secrets: [
      { key: 'DEEPSEEK_API_KEY', configured: true, value: null, note: '密钥只显示配置状态' },
    ],
  },
}

const WORKBENCH_SUMMARY = {
  code: 200,
  data: {
    pending: {}, pending_by_camp: {}, pending_camps: [], oldest_pending_at: {},
    running_camps: [],
    risks: [
      { camp_id: null, camp_name: null, rule: 'schedule_capture_stalled',
        detail: '2 条 AI 录入处理停滞超过 3 分钟', count: 2 },
    ],
    source_status: {},
    section_status: { running_camps: 'ok', risks: 'ok', schedule: 'ok' },
    as_of: NOW,
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
}

async function mockBackend(page, overrides = {}) {
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (overrides.match?.(url)) return overrides.respond(route, url)
    if (url.includes('/admin/workbench/summary')) return route.fulfill({ json: WORKBENCH_SUMMARY })
    if (url.includes('/admin/schedule/overview')) return route.fulfill({ json: OVERVIEW })
    if (url.includes('/admin/schedule/reminders/301')) return route.fulfill({ json: REMINDER_DETAIL })
    if (url.includes('/admin/schedule/reminders')) return route.fulfill({ json: REMINDERS })
    if (url.includes('/admin/schedule/settings')) return route.fulfill({ json: SETTINGS })
    if (url.includes('/user/user_index')) {
      return route.fulfill({ json: { code: 200, role: 'super_admin', User_Name: 'e2e' } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('日程服务页：三页签渲染与概览指标/服务状态/风险行', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStaff(page)
  await mockBackend(page)
  await page.goto(`${BASE}/operations/schedule`)

  await expect(page.locator('.page-title')).toContainText('日程服务')
  await expect(page.getByText('今日 AI 录入用户')).toBeVisible()
  await expect(page.locator('.metric-value').first()).toContainText('3')
  await expect(page.getByText('1 条提醒重试耗尽，需人工排查')).toBeVisible()
  await expect(page.getByRole('cell', { name: '提醒扫描' })).toBeVisible()
  await expect(page.getByText('正常').first()).toBeVisible()

  // 页签深链与 URL 状态
  await page.getByText('服务设置', { exact: true }).click()
  await expect(page).toHaveURL(/tab=settings/)
  await expect(page.getByText('SCHEDULE_INTENT_MODEL')).toBeVisible()
  expect(errors).toEqual([])
})

test('运行记录：筛选保留在 URL、状态脱敏渲染、详情抽屉', async ({ page }) => {
  await loginAsStaff(page)
  await mockBackend(page)
  await page.goto(`${BASE}/operations/schedule?tab=records`)

  await expect(page.getByRole('row', { name: /#61/ })).toBeVisible()
  await expect(page.getByText('投递失败').first()).toBeVisible()
  await expect(page.getByText('目标版本过期').first()).toBeVisible()

  // 筛选切换 → URL 同步 + 重置页码
  await page.getByText('AI 录入', { exact: true }).click()
  await expect(page).toHaveURL(/type=capture/)
  await page.getByText('提醒记录', { exact: true }).click()

  // 详情抽屉：元数据字段 + 脱敏说明，无私人内容字段
  await page.locator('.clickable-row').first().click()
  await expect(page.locator('.el-drawer')).toBeVisible()
  await expect(page.getByText('目标当前版本')).toBeVisible()
  await expect(page.getByText('为保护用户隐私', { exact: false })).toBeVisible()
  await expect(page.getByText('4', { exact: true }).first()).toBeVisible()   // target_current_version
})

test('服务设置：只读展示、密钥只显配置状态、无写入口', async ({ page }) => {
  await loginAsStaff(page)
  await mockBackend(page)
  await page.goto(`${BASE}/operations/schedule?tab=settings`)

  await expect(page.getByText('以下为本 API 进程有效值', { exact: false })).toBeVisible()
  await expect(page.getByText('需重启').first()).toBeVisible()
  await expect(page.getByText('DEEPSEEK_API_KEY')).toBeVisible()
  await expect(page.getByText('已配置').first()).toBeVisible()
  // 批次 A 无任何保存/编辑控件
  const saveButtons = await page.getByRole('button', { name: /保存|发布|编辑/ }).count()
  expect(saveButtons).toBe(0)
})

test('工作台：日程风险行展示并深链到记录页筛选', async ({ page }) => {
  await loginAsStaff(page)
  await mockBackend(page)
  await page.goto(`${BASE}/`)

  const riskRow = page.getByText('2 条 AI 录入处理停滞超过 3 分钟')
  await expect(riskRow).toBeVisible({ timeout: 8000 })
  await riskRow.click()
  await expect(page).toHaveURL(/operations\/schedule\?tab=records&type=capture&bucket=stalled/)
})
