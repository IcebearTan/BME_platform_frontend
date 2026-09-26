import { test, expect } from '@playwright/test'

// 我的日程 Phase 1：mock 后端，零依赖真实库。
// 覆盖：今日页签渲染（时间线/待处理）+ 页签切换与 ?tab= URL 状态 +
// 新建任务弹窗闭环（提交打点）+ 日程通知「日程」页签浮现与深链回 /schedule。

const BASE = 'http://127.0.0.1:18081/AMEII'

const pad = (n) => String(n).padStart(2, '0')
const d = new Date()
const TODAY = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const NOW = `${TODAY} 10:00`

const AGENDA = {
  code: 200,
  data: {
    from: TODAY, to: TODAY,
    events: [
      { id: 1, title: '组会汇报', description: null, location: '会议室 A', start_at: `${TODAY} 14:00`, end_at: `${TODAY} 15:00`, all_day: false, busy: true, status: 'active', reminder_minutes: null, version: 1 },
    ],
    blocks: [
      { id: 2, task_id: 11, task_title: '写实验报告', start_at: `${TODAY} 16:00`, end_at: `${TODAY} 17:00`, locked: true, status: 'planned', version: 1 },
    ],
    conflicts: [],
    day_stats: { available_minutes: 300, conflict_count: 0 },
  },
}

const TASK = (id, title, extra = {}) => ({
  id, title, description: null, status: 'open',
  due_at: null, due_date: null, deadline_precision: 'none',
  estimated_minutes: null, remaining_minutes: null, priority: 'medium',
  splittable: true, reminder_minutes: null, version: 1,
  completed_at: null, created_at: NOW, updated_at: NOW, ...extra,
})

const TASKS_BY_BUCKET = {
  unscheduled: { code: 200, data: { items: [TASK(11, '写实验报告'), TASK(12, '复习 Python 基础', { due_at: `${TODAY} 23:00`, deadline_precision: 'datetime' })], total: 2, page: 1, per_page: 20, pages: 1 } },
  overdue: { code: 200, data: { items: [TASK(13, '交开题表', { due_date: '2026-09-20', deadline_precision: 'date' })], total: 1, page: 1, per_page: 20, pages: 1 } },
  today_due: { code: 200, data: { items: [], total: 0, page: 1, per_page: 20, pages: 1 } },
  all: { code: 200, data: { items: [TASK(11, '写实验报告')], total: 1, page: 1, per_page: 20, pages: 1 } },
}

const PREFERENCES = {
  code: 200,
  data: { id: 1, user_id: 52, timezone: 'Asia/Shanghai', day_start_time: '09:00', day_end_time: '22:00', default_reminder_minutes: 15, automation_mode: 'manual', version: 1 },
}

const NOTIFICATIONS = {
  code: 200,
  data: {
    notifications: [
      { id: 301, title: '日程提醒', content: '「写实验报告」将于 16:00 开始', category: 'schedule', source_type: 'schedule_reminder', source_id: 9, camp_session_id: null, is_read: false, is_important: false, created_at: NOW },
    ],
  },
}

const UNREAD = {
  code: 200,
  data: { unread_count: 1, total: 1, by_category: { schedule: 1 } },
}

async function loginAs(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: 'user' }, checkinInfo: {},
    }))
  })
}

async function mockScheduleBackend(page, handlers = {}) {
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (handlers.match?.(url, route)) {
      return handlers.respond(route, url)
    }
    if (url.includes('/schedule/agenda')) {
      return route.fulfill({ json: AGENDA })
    }
    if (url.includes('/schedule/tasks')) {
      for (const [bucket, body] of Object.entries(TASKS_BY_BUCKET)) {
        if (url.includes(`bucket=${bucket}`)) return route.fulfill({ json: body })
      }
      return route.fulfill({ json: TASKS_BY_BUCKET.all })
    }
    if (url.includes('/schedule/preferences')) {
      return route.fulfill({ json: PREFERENCES })
    }
    if (url.includes('/notification/unread_count')) {
      return route.fulfill({ json: UNREAD })
    }
    if (url.includes('/notification/list')) {
      return route.fulfill({ json: NOTIFICATIONS })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('今日页签：时间线区分固定/任务块，待处理三区就位', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  await mockScheduleBackend(page)
  await page.goto(`${BASE}/schedule`)

  await expect(page.getByRole('heading', { name: '我的日程' })).toBeVisible()
  await expect(page.getByText('今日时间线')).toBeVisible()
  await expect(page.getByText('组会汇报').first()).toBeVisible()
  await expect(page.getByText('写实验报告').first()).toBeVisible()
  await expect(page.getByText('固定', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('任务块').first()).toBeVisible()
  // 待处理：已逾期 + 待安排 两区有 mock 数据
  await expect(page.getByText('交开题表').first()).toBeVisible()
  await expect(page.getByText('复习 Python 基础').first()).toBeVisible()
  expect(errors).toEqual([])
})

test('页签切换 URL 即状态，直链可恢复', async ({ page }) => {
  await loginAs(page)
  await mockScheduleBackend(page)

  await page.goto(`${BASE}/schedule`)
  await page.getByRole('button', { name: '周历' }).click()
  await expect(page).toHaveURL(/tab=week/)
  await page.getByRole('button', { name: '待安排' }).click()
  await expect(page).toHaveURL(/tab=backlog/)
  await expect(page.locator('.backlog-panel').getByText('写实验报告')).toBeVisible()

  // 直链恢复 + 设置页签渲染
  await page.goto(`${BASE}/schedule?tab=settings`)
  await expect(page.getByText('日程偏好')).toBeVisible()
  // 非法 tab 归一化回今日
  await page.goto(`${BASE}/schedule?tab=nonsense`)
  await expect(page.getByText('今日时间线')).toBeVisible()
})

test('新建任务闭环：弹窗提交打到 /schedule/tasks', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let created = null
  await loginAs(page)
  await mockScheduleBackend(page, {
    match: (url, route) => url.includes('/schedule/tasks') && route.request().method() === 'POST',
    respond: (route, url) => {
      created = route.request().postDataJSON()
      return route.fulfill({ json: { code: 200, data: { task: TASK(99, created.title, created), reminder_created: true } } })
    },
  })
  await page.goto(`${BASE}/schedule`)

  await page.getByRole('button', { name: '新建' }).click()
  await page.getByRole('button', { name: '任务' }).click()
  await expect(page.getByText('新建任务')).toBeVisible()
  await page.fill('input[placeholder="要做什么"]', '买笔记本电池')
  await page.getByRole('button', { name: '创建' }).click()

  await expect(page.getByText('任务已创建', { exact: false })).toBeVisible({ timeout: 5000 })
  expect(created?.title).toBe('买笔记本电池')
  expect(created?.deadline_precision).toBe('none')
  expect(errors).toEqual([])
})

test('日程通知：收件箱「日程」页签浮现，点击深链回 /schedule', async ({ page }) => {
  await loginAs(page)
  await mockScheduleBackend(page)
  await page.goto(`${BASE}/notifications`)

  // schedule 域有内容 → 页签浮现（条件浮现，community 同款）
  await expect(page.getByRole('button', { name: '日程' })).toBeVisible()
  await page.getByRole('button', { name: '日程' }).click()
  await expect(page.getByText('「写实验报告」将于 16:00 开始')).toBeVisible()

  // 点击通知行 → 深链到 /schedule 今日
  await page.getByText('「写实验报告」将于 16:00 开始').click()
  await expect(page).toHaveURL(/\/schedule/)
  await expect(page.getByText('今日时间线')).toBeVisible()
})

// ── Phase 2：文字意图 + 智能排程 ───────────────────────────────────────────

const CAPTURE_DONE = {
  code: 200,
  data: {
    id: 501, input_type: 'text', text: '明早九点开组会，六点前交实验报告两小时',
    status: 'done', error: null, error_code: null, created_at: NOW,
    result: {
      version: 1, now: NOW, unparsed: [], plan_ids: [71],
      items: [
        { index: 0, kind: 'event', title: '组会', evidence: '明早九点开组会', status: 'scheduled',
          fields: {}, duration_source: 'user', ambiguities: [], answers: {},
          result: { task_id: null, event_id: 41, block_ids: [], plan_id: 71, message: '已创建日程：09-25 09:00–10:00' } },
        { index: 1, kind: 'task', title: '实验报告', evidence: '六点前交实验报告两小时', status: 'scheduled',
          fields: {}, duration_source: 'user', ambiguities: [], answers: {},
          result: { task_id: 61, event_id: null, block_ids: [81], plan_id: 71, message: '已安排 09-25 10:15–12:15' } },
        { index: 2, kind: 'task', title: '三点做实验', evidence: '三点做实验', status: 'needs_clarification',
          fields: {}, duration_source: 'user',
          ambiguities: [{ field: 'start_at', question: '上午 3 点还是下午 3 点？',
            options: [{ label: '上午', value: `${TODAY} 03:00` }, { label: '下午', value: `${TODAY} 15:00` }] }],
          answers: {}, result: null },
      ],
    },
  },
}

function phase2Backend(page, extra = {}) {
  return page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (extra.match?.(url, route)) return extra.respond(route, url)
    if (url.includes('/schedule/captures') || url.includes('/schedule/plans')) {
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    }
    if (url.includes('/schedule/agenda')) return route.fulfill({ json: AGENDA })
    if (url.includes('/schedule/tasks')) return route.fulfill({ json: TASKS_BY_BUCKET.all })
    if (url.includes('/schedule/preferences')) return route.fulfill({ json: PREFERENCES })
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

const quickSend = (page) => page.locator('.quick-input').getByRole('button', { name: '安排' })

test('说一句录入：提交轮询到结果卡分区渲染', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let posted = null
  let pollCount = 0
  await loginAs(page)
  await phase2Backend(page, {
    match: (url, route) => url.includes('/schedule/captures') && route.request().method() === 'POST',
    respond: (route) => {
      posted = route.request().postDataJSON()
      return route.fulfill({ status: 202, json: { code: 200, data: { capture: { id: 501, status: 'pending' }, submitted: true } } })
    },
  })
  // GET 轮询：第一次 processing，之后 done
  await page.route('http://127.0.0.1:5001/schedule/captures/501', (route) => {
    pollCount += 1
    if (pollCount === 1) {
      return route.fulfill({ json: { code: 200, data: { id: 501, status: 'processing' } } })
    }
    return route.fulfill({ json: CAPTURE_DONE })
  })
  await page.goto(`${BASE}/schedule`)

  await page.fill('input[placeholder*="说一句"]', '明早九点开组会，六点前交实验报告两小时')
  await quickSend(page).click()

  await expect(page.getByText('录入结果')).toBeVisible({ timeout: 8000 })
  await expect(page.getByText('已创建日程：09-25 09:00–10:00')).toBeVisible()
  await expect(page.getByText('已安排 09-25 10:15–12:15').first()).toBeVisible()
  await expect(page.getByText('上午 3 点还是下午 3 点？')).toBeVisible()
  expect(posted?.request_id).toBeTruthy()
  expect(errors).toEqual([])
})

test('待补充：chips 选择后 resolve 更新卡片', async ({ page }) => {
  let resolved = null
  await loginAs(page)
  await phase2Backend(page, {
    match: (url) => url.includes('/schedule/captures'),
    respond: (route) => route.fulfill({ json: { code: 200, data: { capture: CAPTURE_DONE.data } } }),
  })
  await page.route('http://127.0.0.1:5001/schedule/captures/501/resolve', (route) => {
    resolved = route.request().postDataJSON()
    return route.fulfill({ json: { code: 200, data: { ...CAPTURE_DONE.data, status: 'done',
      result: { ...CAPTURE_DONE.data.result, items: CAPTURE_DONE.data.result.items.slice(0, 2) } } } })
  })
  await page.goto(`${BASE}/schedule`)

  await page.fill('input[placeholder*="说一句"]', '三点做实验')
  await quickSend(page).click()
  await expect(page.getByText('上午 3 点还是下午 3 点？')).toBeVisible({ timeout: 8000 })

  await page.locator('.q-chip', { hasText: '下午' }).click()
  await page.getByRole('button', { name: '提交补充' }).click()
  await expect(page.getByText('上午 3 点还是下午 3 点？')).toHaveCount(0, { timeout: 8000 })
  expect(resolved?.answers).toBeTruthy()
})

// 无选项的时间追问：渲染日期时间选择器（不再要求手输格式化时间）
const CAPTURE_CLARIFY_PICKER = {
  code: 200,
  data: {
    id: 502, input_type: 'text', text: '明天下午开会', status: 'clarify_needed',
    error: null, error_code: null, created_at: NOW,
    result: {
      version: 1, now: NOW, unparsed: [], plan_ids: [],
      items: [
        { index: 0, kind: 'event', title: '开会', evidence: '明天下午开会', status: 'needs_clarification',
          fields: {}, duration_source: 'user',
          ambiguities: [{ field: 'start_at', question: '这件事几点开始？', options: [] }],
          answers: {}, result: null },
      ],
    },
  },
}

test('待补充：时间追问用选择器作答，不手输格式', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let resolved = null
  await loginAs(page)
  await phase2Backend(page, {
    match: (url) => url.includes('/schedule/captures'),
    respond: (route) => route.fulfill({ json: { code: 200, data: { capture: CAPTURE_CLARIFY_PICKER.data } } }),
  })
  await page.route('http://127.0.0.1:5001/schedule/captures/502/resolve', (route) => {
    resolved = route.request().postDataJSON()
    return route.fulfill({ json: { code: 200, data: { ...CAPTURE_CLARIFY_PICKER.data, status: 'done',
      result: { ...CAPTURE_CLARIFY_PICKER.data.result,
        items: [{ ...CAPTURE_CLARIFY_PICKER.data.result.items[0], status: 'scheduled',
          ambiguities: [], result: { task_id: null, event_id: 42, block_ids: [], plan_id: 71,
            message: '已创建日程：09-26 15:00–16:00' } }] } } } })
  })
  await page.goto(`${BASE}/schedule`)

  await page.fill('input[placeholder*="说一句"]', '明天下午开会')
  await quickSend(page).click()
  await expect(page.getByText('这件事几点开始？')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.q-picker')).toHaveCount(1)

  const pickerInput = page.locator('.q-picker input')
  await pickerInput.fill('2026-09-26 15:00')
  await pickerInput.press('Enter')
  await page.getByRole('button', { name: '提交补充' }).click()

  await expect(page.getByText('已创建日程：09-26 15:00–16:00')).toBeVisible({ timeout: 8000 })
  expect(resolved?.answers?.['0']?.start_at).toBe('2026-09-26 15:00')
  expect(errors).toEqual([])
})

test('待补充：「记为待办」哨兵可提交', async ({ page }) => {
  let resolved = null
  await loginAs(page)
  await phase2Backend(page, {
    match: (url) => url.includes('/schedule/captures'),
    respond: (route) => route.fulfill({ json: { code: 200, data: { capture: CAPTURE_CLARIFY_PICKER.data } } }),
  })
  await page.route('http://127.0.0.1:5001/schedule/captures/502/resolve', (route) => {
    resolved = route.request().postDataJSON()
    return route.fulfill({ json: { code: 200, data: { ...CAPTURE_CLARIFY_PICKER.data, status: 'done',
      result: { ...CAPTURE_CLARIFY_PICKER.data.result,
        items: [{ ...CAPTURE_CLARIFY_PICKER.data.result.items[0], status: 'created', kind: 'task',
          ambiguities: [], result: { task_id: 63, event_id: null, block_ids: [], plan_id: 71,
            message: '已创建任务' } }] } } } })
  })
  await page.goto(`${BASE}/schedule`)

  await page.fill('input[placeholder*="说一句"]', '明天下午开会')
  await quickSend(page).click()
  await expect(page.getByText('这件事几点开始？')).toBeVisible({ timeout: 8000 })

  await page.locator('.q-chip-ghost', { hasText: '记为待办' }).click()
  await page.getByRole('button', { name: '提交补充' }).click()
  await expect(page.getByText('已创建任务')).toBeVisible({ timeout: 8000 })
  expect(resolved?.answers?.['0']?.start_at).toBe('__unset__')
})

test('录入落定后：今日/周历/待安排全部重拉（不再漏记录）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let taskFetches = 0
  let agendaFetches = 0
  await loginAs(page)
  await phase2Backend(page, {
    match: (url, route) => url.includes('/schedule/captures') && route.request().method() === 'POST',
    respond: (route) => route.fulfill({ status: 202, json: { code: 200, data: { capture: { id: 501, status: 'pending' }, submitted: true } } }),
  })
  await page.route('http://127.0.0.1:5001/schedule/captures/501', (route) =>
    route.fulfill({ json: CAPTURE_DONE }))
  await page.route('http://127.0.0.1:5001/schedule/tasks**', (route) => {
    taskFetches += 1
    return route.fulfill({ json: TASKS_BY_BUCKET.all })
  })
  await page.route('http://127.0.0.1:5001/schedule/agenda**', (route) => {
    agendaFetches += 1
    return route.fulfill({ json: AGENDA })
  })
  await page.goto(`${BASE}/schedule`)

  await page.fill('input[placeholder*="说一句"]', '明早九点开组会，六点前交实验报告两小时')
  await quickSend(page).click()
  await expect(page.getByText('录入结果')).toBeVisible({ timeout: 8000 })

  // 挂载期一批（今日 3 桶 + 待安排 1 + 周历 1）→ 落定后必须再来一批
  await expect.poll(() => taskFetches, { timeout: 8000 }).toBeGreaterThanOrEqual(8)
  await expect.poll(() => agendaFetches, { timeout: 8000 }).toBeGreaterThanOrEqual(4)
  expect(errors).toEqual([])
})

test('manual 模式：录入结果带方案确认卡（下一步）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const applied = []
  await loginAs(page)
  await phase2Backend(page, {
    match: (url) => url.includes('/schedule/captures'),
    respond: (route) => route.fulfill({ json: { code: 200, data: { capture: {
      ...CAPTURE_DONE.data, status: 'done',
      result: { ...CAPTURE_DONE.data.result, plan_ids: [91],
        proposal: { plan_id: 91, reason: '已安排 120 分钟执行时间',
          blocks: [{ start_at: `${TODAY} 20:00`, end_at: `${TODAY} 22:00` }], unscheduled: [] } },
    } } } }),
  })
  await page.route('http://127.0.0.1:5001/schedule/plans/91/apply', (route) => {
    applied.push(91)
    return route.fulfill({ json: { code: 200, data: { plan: { id: 91, status: 'applied' }, changes_n: 1 } } })
  })
  await page.goto(`${BASE}/schedule`)

  await page.fill('input[placeholder*="说一句"]', '六点前交实验报告两小时')
  await quickSend(page).click()
  await expect(page.getByText('建议的执行安排')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.plan-card .block-time').first()).toBeVisible()

  await page.getByRole('button', { name: '应用安排' }).click()
  await expect(page.getByText('建议的执行安排')).toHaveCount(0, { timeout: 8000 })
  expect(applied).toContain(91)
  expect(errors).toEqual([])
})

test('撤销本次录入：revert 打点且卡片进入已撤销态', async ({ page }) => {
  const reverted = []
  await loginAs(page)
  await phase2Backend(page, {
    match: (url) => url.includes('/schedule/captures'),
    respond: (route) => route.fulfill({ json: { code: 200, data: { capture: CAPTURE_DONE.data } } }),
  })
  await page.route('http://127.0.0.1:5001/schedule/plans/71/revert', (route) => {
    reverted.push(71)
    return route.fulfill({ json: { code: 200, data: { reverted: [{ entity: 'block', entity_id: 81, operation: 'create' }], skipped: [] } } })
  })
  await page.goto(`${BASE}/schedule`)

  await page.fill('input[placeholder*="说一句"]', '撤销场景')
  await quickSend(page).click()
  await expect(page.getByText('录入结果')).toBeVisible({ timeout: 8000 })

  await page.getByRole('button', { name: '撤销本次录入' }).click()
  await expect(page.getByText('已撤销本次录入')).toBeVisible({ timeout: 8000 })
  expect(reverted).toContain(71)
})

test('manual 偏好：新建任务出方案卡并可应用', async ({ page }) => {
  const applied = []
  await loginAs(page)
  await phase2Backend(page, {
    match: (url, route) => url.includes('/schedule/tasks') && route.request().method() === 'POST',
    respond: (route) => route.fulfill({ json: { code: 200, data: {
      task: TASK(77, '方案卡任务', { due_at: `${TODAY} 23:00`, deadline_precision: 'datetime' }),
      reminder_created: true,
      plan: { id: 90, mode: 'proposed', reason: '已安排 60 分钟执行时间',
        blocks: [{ start_at: `${TODAY} 20:00`, end_at: `${TODAY} 21:00` }], unscheduled: [] },
    } } }),
  })
  await page.route('http://127.0.0.1:5001/schedule/plans/90/apply', (route) => {
    applied.push(90)
    return route.fulfill({ json: { code: 200, data: { plan: { id: 90, status: 'applied' }, changes_n: 1 } } })
  })
  await page.goto(`${BASE}/schedule`)

  await page.getByRole('button', { name: '新建' }).click()
  await page.getByRole('button', { name: '任务', exact: true }).click()
  await page.fill('input[placeholder="要做什么"]', '方案卡任务')
  await page.getByRole('button', { name: '创建', exact: true }).click()

  await expect(page.getByText('建议的执行安排')).toBeVisible({ timeout: 8000 })
  await expect(page.locator('.plan-card .block-time').first()).toBeVisible()
  await page.getByRole('button', { name: '应用安排' }).click()
  expect(applied).toContain(90)
})

test('设置面板：自动安排模式两选可改', async ({ page }) => {
  let saved = null
  await loginAs(page)
  await phase2Backend(page, {
    match: (url, route) => url.includes('/schedule/preferences') && route.request().method() === 'PATCH',
    respond: (route) => {
      saved = route.request().postDataJSON()
      return route.fulfill({ json: { code: 200, data: { ...PREFERENCES.data, ...saved } } })
    },
  })
  await page.goto(`${BASE}/schedule?tab=settings`)
  await expect(page.getByText('日程偏好')).toBeVisible()

  // PREFERENCES mock 是 manual → 先打开模式下拉再选 suggest（DewPopover 展开选项）
  await page.locator('.mode-row .dew-select__trigger').click()
  await page.locator('.dew-select__option', { hasText: '适度自动' }).click()
  await page.getByRole('button', { name: '保存' }).click()
  await expect(page.getByText('偏好已保存')).toBeVisible({ timeout: 5000 })
  expect(saved?.automation_mode).toBe('suggest')
})
