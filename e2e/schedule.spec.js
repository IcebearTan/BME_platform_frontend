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
