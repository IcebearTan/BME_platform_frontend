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

// 选导生收官（阶段 2）：名册 + 批量指派 + 导出
const SESSIONS_MS = {
  code: 200,
  sessions: [{
    ...SESSIONS_TEACHER.sessions[0],
    status: 'selecting',
    mentor_selection_enabled: true,
    available_perspectives: ['teacher'],
  }],
}

const ROSTER = {
  code: 200,
  roster: {
    students: [
      { user_id: 31, username: '学生甲', team_mentor_id: null, team_mentor_name: null,
        preferences: [{ rank: 1, mentor_user_id: 21, mentor_name: '导生A', note: null }] },
      { user_id: 32, username: '学生乙', team_mentor_id: 21, team_mentor_name: '导生A',
        preferences: [] },
    ],
    mentors: [
      { user_id: 21, username: '导生A', tag: '硬件组', capacity: 4, matched: 1, has_profile: true },
    ],
    stats: { students: 2, assigned: 1, unassigned: 1, submitted: 1 },
  },
}

test('选导生收官：名册渲染 + 选中导生后批量指派', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)

  let batchPayload = null
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')
        && !url.includes('teacher/overview') && !url.includes('join-requests')) {
      return route.fulfill({ json: SESSIONS_MS })
    }
    if (url.includes('/teacher/overview')) {
      return route.fulfill({ json: OVERVIEW })
    }
    if (url.includes('/camp/ms/7/assign/roster')) {
      return route.fulfill({ json: ROSTER })
    }
    if (url.includes('/camp/ms/7/assign/batch')) {
      batchPayload = route.request().postDataJSON()
      return route.fulfill({ json: { code: 200, results: [
        { student_user_id: 31, status: 'assigned', message: '已指派' }] } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  // 启用选导生的营出现收官 tab；概览的未分配待办直达该页
  await page.getByText('选导生收官').first().click()
  await expect(page.getByText('导生名额（1）')).toBeVisible()
  await expect(page.getByText('学生甲')).toBeVisible()
  await expect(page.getByText('志愿：导生A', { exact: false })).toBeVisible()

  // 未分配学员选导生 → 批量指派提交契约
  await page.locator('.stu-pick').click()
  await page.locator('.dew-select__option', { hasText: '导生A' }).first().click()
  await expect(page.getByRole('button', { name: '批量指派（1）' })).toBeEnabled()
  await page.getByRole('button', { name: '批量指派（1）' }).click()
  await expect(page.getByText('已指派 1 名学员')).toBeVisible()
  expect(batchPayload.pairs).toEqual([{ student_user_id: 31, mentor_user_id: 21 }])

  expect(errors).toEqual([])
})

// 营期公告（阶段 3 增量）：老师发布（受众+同步通知开关）→ 成员看板可见
const ANN_LIST = {
  code: 200,
  announcements: [
    { id: 1, title: '开营仪式通知', content: '10月8日 9:00 报告厅举行开营仪式。',
      audience: 'all', is_pinned: true, status: 'active',
      published_at: NOW, expires_at: null, author_name: '老师甲' },
  ],
}

test('营期公告：老师工作台发布公告，成员看板展示置顶公告', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)

  let createdPayload = null
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')
        && !url.includes('teacher/overview') && !url.includes('join-requests')
        && !url.includes('announcements')) {
      return route.fulfill({ json: SESSIONS_TEACHER })
    }
    if (url.includes('/teacher/overview')) {
      return route.fulfill({ json: OVERVIEW })
    }
    if (url.includes('/announcements') && method === 'POST') {
      createdPayload = route.request().postDataJSON()
      return route.fulfill({ json: { code: 200, id: 2, message: '已发布' } })
    }
    if (url.includes('/announcements')) {
      return route.fulfill({ json: ANN_LIST })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '营期公告' }).click()
  // 列表渲染（置顶标识 + 受众标签）
  await expect(page.getByText('开营仪式通知').first()).toBeVisible()
  await expect(page.getByText('置顶').first()).toBeVisible()

  // 发布弹窗：受众 + 同步通知开关 → 提交契约
  await page.getByRole('button', { name: '发布公告' }).click()
  await page.getByPlaceholder('公告标题（≤200 字）').fill('调课通知')
  await page.getByPlaceholder(/公告正文/).fill('10月10日课程调整至下午。')
  expect(createdPayload).toBeNull()   // 未提交不发包
  await page.getByRole('button', { name: '发布', exact: true }).click()
  await expect(page.getByText('公告已发布')).toBeVisible()
  expect(createdPayload).toMatchObject({ title: '调课通知', audience: 'all', notify: false })

  expect(errors).toEqual([])
})

test('成员看板：置顶公告在学员看板顶部展示', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)

  // 学员视角的营（有成员身份，默认学员视角 → 看板 tab）
  const SESSIONS_STUDENT = {
    code: 200,
    sessions: [{
      ...SESSIONS_TEACHER.sessions[0],
      is_member: true, my_role: 'student',
      my_staff_role: null, available_perspectives: ['student'],
      my_permissions: [],
    }],
  }
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/announcements')) {
      return route.fulfill({ json: ANN_LIST })
    }
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS_STUDENT })
    }
    if (url.includes('/camp/attendance/mine')) {
      return route.fulfill({ json: { code: 200, mode: 'daily', personal: null, daily: {}, dates: [] } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  const board = page.locator('.ann-board')
  await expect(board.getByText('开营仪式通知')).toBeVisible()
  await expect(board.getByText('置顶')).toBeVisible()
  await expect(board.getByText('10月8日 9:00 报告厅举行开营仪式。')).toBeVisible()

  expect(errors).toEqual([])
})
