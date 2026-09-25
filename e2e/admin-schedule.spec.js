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
    editable: [
      { key: 'SCHEDULE_INTENT_ENABLED', label: 'AI 意图录入开关', type: 'bool',
        component: 'POST /schedule/captures', note: '关闭仅阻止新的 AI 录入请求',
        default_value: true, desired_value: null, effective_value: true,
        overridden: false, version: 0, updated_at: null, updated_by_name: null, reason: null },
      { key: 'SCHEDULE_INTENT_DAILY_LIMIT', label: 'AI 录入每日限额', type: 'int',
        unit: '次/天（每用户）',
        component: 'POST /schedule/captures 限流', note: '单位=提交次数：一句话记 1 次',
        default_value: 50, desired_value: '20', effective_value: 20,
        overridden: true, version: 3, updated_at: NOW, updated_by_name: 'admin', reason: '试点收紧' },
      { key: 'SCHEDULE_INTENT_MODEL', label: '意图理解模型', type: 'str',
        component: 'intent.parse_capture', note: '留空恢复回退链',
        default_value: null, desired_value: null, effective_value: 'deepseek-chat',
        overridden: false, version: 0, updated_at: null, updated_by_name: null, reason: null },
      { key: 'DEEPSEEK_API_KEY', label: 'DeepSeek API Key', type: 'secret',
        component: 'litellm_chat.chat_completion', note: '平台覆盖 > .env；值只写不读',
        default_value: '环境变量', desired_value: null, effective_value: '已配置（平台配置）',
        configured: true, overridden: true, version: 2, updated_at: NOW, updated_by_name: 'admin', reason: null },
    ],
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
    if (overrides.match?.(url, route)) return overrides.respond(route, url)
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

test('服务设置：在线配置渲染 + 发布流差异确认与打点', async ({ page }) => {
  const published = []
  await loginAsStaff(page)
  await mockBackend(page, {
    match: (url, route) => url.includes('/admin/schedule/settings') && route.request().method() === 'PATCH',
    respond: (route) => {
      published.push(route.request().postDataJSON())
      return route.fulfill({ json: { code: 200, data: { changes: [{ key: 'SCHEDULE_INTENT_DAILY_LIMIT', to: '100', version: 4 }],
        editable: SETTINGS.data.editable } } })
    },
  })
  await page.goto(`${BASE}/operations/schedule?tab=settings`)

  // 在线配置区：覆盖态徽标 + 生效值 + 默认值对照
  await expect(page.getByText('在线配置（发布后即时生效）')).toBeVisible()
  await expect(page.getByText('平台覆盖 v3')).toBeVisible()
  await expect(page.getByText(/最近发布：.* by admin/).first()).toBeVisible()

  // 模型与密钥行渲染（密钥不回显值，只显示配置状态）
  await expect(page.getByText('意图理解模型', { exact: true })).toBeVisible()
  await expect(page.getByText('已配置（平台配置）').first()).toBeVisible()

  // 限额单位明示
  await expect(page.getByText('次/天（每用户）').first()).toBeVisible()
  await expect(page.getByText('20 次/天（每用户）').first()).toBeVisible()

  // 修改限额 + 填新密钥 → 发布 → 差异确认弹窗（密钥显示不回显）→ 打点
  const limitInput = page.locator('.edit-control .el-input-number input')
  await limitInput.fill('100')
  await page.locator('.edit-control input[type="password"]').fill('sk-e2e-new-key-000000000000')
  await page.getByRole('button', { name: '发布变更' }).click()
  await expect(page.getByText('确认发布以下配置变更？发布后即时生效。')).toBeVisible()
  await expect(page.getByText('AI 录入每日限额 → 100')).toBeVisible()
  await expect(page.getByText('DeepSeek API Key → 已更新（不回显）')).toBeVisible()
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await expect(page.getByText('配置已发布并即时生效')).toBeVisible({ timeout: 5000 })
  expect(published.length).toBe(1)
  const limitUpdate = published[0].updates.find((u) => u.key === 'SCHEDULE_INTENT_DAILY_LIMIT')
  const keyUpdate = published[0].updates.find((u) => u.key === 'DEEPSEEK_API_KEY')
  expect(limitUpdate.value).toBe(100)
  expect(keyUpdate.value).toBe('sk-e2e-new-key-000000000000')

  // 只读区（env/代码键）仍无任何写控件
  await expect(page.getByText('提醒扫描（只读，需改环境变量或代码）')).toBeVisible()
  await expect(page.getByText('DEEPSEEK_API_KEY')).toBeVisible()
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

test('服务设置：409 冲突后保留已填值，刷新版本可重试', async ({ page }) => {
  let patchCount = 0
  const seenPayloads = []
  // GET 版本基线 v3（模拟页面上已有旧版本）
  const STALE_SETTINGS = JSON.parse(JSON.stringify(SETTINGS))
  STALE_SETTINGS.data.editable = STALE_SETTINGS.data.editable.map((i) =>
    i.key === 'SCHEDULE_INTENT_MODEL' ? { ...i, version: 2 } : i)   // 页面持有 v2，服务端实际 v3
  await loginAsStaff(page)
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.includes('/admin/schedule/settings') && method === 'PATCH') {
      patchCount += 1
      seenPayloads.push(route.request().postDataJSON())
      if (patchCount === 1) {
        return route.fulfill({ json: { code: 409, message: '意图理解模型 已被他人修改，请刷新后重试' } })
      }
      return route.fulfill({ json: { code: 200, data: { changes: [], editable: SETTINGS.data.editable } } })
    }
    if (url.includes('/admin/schedule/settings')) {
      // 首次 GET 给旧版本 v2（页面陈旧）；409 触发重拉后给 v3（他人已更新的现状）
      const fresh = patchCount >= 1
      const body = fresh
        ? { ...STALE_SETTINGS, data: { ...STALE_SETTINGS.data,
            editable: STALE_SETTINGS.data.editable.map((i) =>
              i.key === 'SCHEDULE_INTENT_MODEL' ? { ...i, version: 3 } : i) } }
        : STALE_SETTINGS
      return route.fulfill({ json: body })
    }
    if (url.includes('/user/user_index')) {
      return route.fulfill({ json: { code: 200, role: 'super_admin', User_Name: 'e2e' } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
  await page.goto(`${BASE}/operations/schedule?tab=settings`)

  // 用旧版本发布 → 409 → 提示刷新版本，输入框内容保留
  await page.getByPlaceholder('留空跟随回退链').fill('deepseek-reasoner')
  await page.getByRole('button', { name: '发布变更' }).click()
  await expect(page.getByText('确认发布以下配置变更？发布后即时生效。')).toBeVisible()
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await expect(page.getByText('版本已刷新；请再次点击「发布变更」', { exact: false })).toBeVisible({ timeout: 5000 })
  await expect(page.getByPlaceholder('留空跟随回退链')).toHaveValue('deepseek-reasoner')

  // 再次发布 → 携带刷新后的版本（3）与保留的值
  await page.getByRole('button', { name: '发布变更' }).click()
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await expect(page.getByText('配置已发布并即时生效')).toBeVisible({ timeout: 5000 })
  expect(seenPayloads.length).toBe(2)
  expect(seenPayloads[1].updates[0].value).toBe('deepseek-reasoner')
  expect(seenPayloads[1].updates[0].expected_version).toBe(3)
})
