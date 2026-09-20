import { test, expect } from '@playwright/test'

// 阶段 1（营期责任人地基）e2e：mock 后端契约（my_staff_role / available_perspectives /
// teacher/overview），覆盖老师营期中心分组、老师工作台概览待办、双身份视角切换。

const BASE = 'http://127.0.0.1:18081/AMEII'

const NOW = new Date().toISOString()

// 老师视角的营：非成员（is_member=false）但 my_staff_role=teacher → 营期中心进「我管理的营期」
const SESSIONS_TEACHER = {
  code: 200,
  sessions: [{
    id: 7, name: '2026 秋季培训营', camp_type: 'short_term', category: 'learning',
    start_date: '2026-09-28', end_date: '2026-10-30', status: 'running',
    expected_check_in: '09:00', min_daily_hours: 6, weekdays_only: true,
    is_featured: false, member_count: 12, is_member: false, my_role: null,
    my_staff_role: 'teacher', has_camp_access: true,
    available_perspectives: ['teacher'],
    my_permissions: ['application.review', 'member.manage'],
    mentor_selection_enabled: false,
    policy: { capabilities: { attendance: true, leave: true } },
  }],
}

// 双身份营：teacher + mentor → 视角切换器可见
const SESSIONS_DUAL = {
  code: 200,
  sessions: [{
    ...SESSIONS_TEACHER.sessions[0],
    is_member: true, my_role: 'mentor',
    available_perspectives: ['teacher', 'mentor'],
  }],
}

const OVERVIEW = {
  code: 200,
  overview: {
    stage: 'running', stage_label: '进行中',
    start_date: '2026-09-28', end_date: '2026-10-30',
    counts: { students: 10, mentors: 2, unmatched: 3 },
    work_items: [
      { key: 'camp.application.pending', count: 5, label: '待审学员报名' },
      { key: 'camp.leave.pending', count: 2, label: '待审批请假', unassigned: 1 },
    ],
    oldest_pending_application_at: NOW,
    ms_stats: null,
    my_staff_role: 'teacher',
  },
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

async function mockTeacherBackend(page, sessions = SESSIONS_TEACHER, extra) {
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')
        && !url.includes('/leave') && !url.includes('teacher/overview')
        && !url.includes('join-requests')) {
      return route.fulfill({ json: sessions })
    }
    if (url.includes('/teacher/overview')) {
      return route.fulfill({ json: OVERVIEW })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
  await extra?.(page)
}

test('老师：营期中心「我管理的营期」分组 + 身份文案', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  await mockTeacherBackend(page)

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('我管理的营期')).toBeVisible()
  await expect(page.getByText('2026 秋季培训营')).toBeVisible()
  await expect(page.locator('.card-role', { hasText: '老师' })).toBeVisible()

  expect(errors).toEqual([])
})

test('老师：进入营期默认老师视角，概览展示待办投影并可跳转报名审批', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  await mockTeacherBackend(page)

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  // 工作台外壳：身份标识 + 概览统计 + 待办卡
  await expect(page.getByText('协同老师')).toBeVisible()
  await expect(page.getByText('待处理事项')).toBeVisible()
  await expect(page.getByText('待审学员报名')).toBeVisible()

  // 待办点击 → 报名审批子页（概览计数 → 处理入口的闭环）
  await page.getByText('待审学员报名').click()
  await expect(page.getByRole('button', { name: '概览' })).toBeVisible()
  await expect(page.getByText('报名审批（0）')).toBeVisible()   // mock join-requests 为空数据

  expect(errors).toEqual([])
})

test('双身份营：视角切换器可见，可从老师切到导生视图', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  await mockTeacherBackend(page, SESSIONS_DUAL)

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('当前视角')).toBeVisible()
  await expect(page.getByText('协同老师')).toBeVisible()   // 默认职责更高的老师视角

  // 切到导生视角：URL 带 perspective=mentor，渲染导生工作台（学员进度 tab）
  await page.locator('.persp-btn', { hasText: '导生' }).click()
  await expect(page).toHaveURL(/perspective=mentor/)
  await expect(page.getByText('学员进度')).toBeVisible()

  expect(errors).toEqual([])
})
