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
// 2026-09-21 阶段收缩：ms tab 三条件（enabled + status=selecting + my_permissions 含
// mentor_selection.operate）——mock 契约同步补 my_permissions
const SESSIONS_MS = {
  code: 200,
  sessions: [{
    ...SESSIONS_TEACHER.sessions[0],
    status: 'selecting',
    mentor_selection_enabled: true,
    my_permissions: ['application.review', 'member.manage', 'mentor_selection.operate',
      'learning.read_all', 'meeting.read_all'],
    available_perspectives: ['teacher'],
  }],
}

// 已开营且启用过选导生的营：收官 tab 必须消失（不能只看 enabled）
const SESSIONS_MS_RUNNING = {
  code: 200,
  sessions: [{
    ...SESSIONS_MS.sessions[0],
    status: 'running',
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
  // 启用选导生的营出现收官 tab（按 role 取按钮——顶部提示文案也含该词，别用裸文本匹配）
  await page.getByRole('button', { name: '选导生收官' }).click()
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

// ── 2026-09-21 阶段权限收缩：开营后「选导生收官」入口与待办全面收起 ──

const OVERVIEW_RUNNING = {
  code: 200,
  overview: {
    stage: 'running', stage_label: '进行中',
    start_date: '2026-09-28', end_date: '2026-10-30',
    counts: { students: 10, mentors: 2, unmatched: 3 },
    work_items: [
      { key: 'camp.student.ungrouped', count: 3, label: '未分组学员', section: 'members' },
      { key: 'camp.leave.pending', count: 2, label: '待审批请假', unassigned: 1, section: 'leaves' },
    ],
    oldest_pending_application_at: NOW,
    ms_stats: null,
    my_staff_role: 'teacher',
  },
}

// 单一自包含 mock：营期列表 + running 概览（别用 mockTeacherBackend+extra 双层路由——
// 后注册的路由 LIFO 会吞掉前面所有匹配，sessions 列表会拿到空 ok 包导致工作台不渲染）
async function mockRunningMsCamp(page) {
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')
        && !url.includes('/leave') && !url.includes('teacher/overview')
        && !url.includes('join-requests')) {
      return route.fulfill({ json: SESSIONS_MS_RUNNING })
    }
    if (url.includes('teacher/overview')) {
      return route.fulfill({ json: OVERVIEW_RUNNING })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('阶段收缩：running 营不出现「选导生收官」tab 与选导生待办', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  await mockRunningMsCamp(page)

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  // 启用了选导生但已开营：收官 tab 消失（不能只判 mentor_selection_enabled）
  await expect(page.getByRole('button', { name: '概览' })).toBeVisible()
  await expect(page.getByRole('button', { name: '选导生收官' })).toHaveCount(0)
  // 概览不再出现选导生阶段待办与就绪卡
  await expect(page.getByText('未提交志愿的学员')).toHaveCount(0)
  await expect(page.getByText('未发布名片的导生')).toHaveCount(0)
  await expect(page.getByText('选导生就绪情况')).toHaveCount(0)
  await expect(page.getByText('开营就绪检查')).toHaveCount(0)
  // running 的未分组学员是运营风险项，文案换口径（exact：顶部提示文案也含该词）
  await expect(page.getByText('未分组学员', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
})

test('阶段收缩：running 未分组学员待办跳「成员管理」（后端 section 契约）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  await mockRunningMsCamp(page)

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await page.locator('.todo-label', { hasText: '未分组学员' }).click()
  // 跳到成员管理（不再进已收起的 ms 页）
  await expect(page.getByText('营期成员（0）')).toBeVisible()
  expect(errors).toEqual([])
})

// ── 学习进度看板（2026-09-21 服务端分页 + 导生筛选 + 完整加载态）──

const courseBlock2 = (cid, title, cert, total, status) => ({
  course_id: cid, course_title: title,
  chapters: Array.from({ length: total }, (_, i) => ({
    chapter_id: cid * 10 + i, name: `第${i + 1}章`, order: i, lessons: 3,
    lessons_completed: 1, certified: i < cert, certified_at: null, certified_by: null,
    score: null, material_count: 0,
  })),
  certified_chapters: cert, total_chapters: total, score_avg: null, course_status: status || null,
})

const boardGroup = (mid, name, direction, students) => ({
  mentor_user_id: mid, mentor_name: name, direction, hint: null,
  courses: [{ course_id: 4, course_title: '生物医学工程导论' }],
  certified_rate: 50,
  students: students.map(([uid, uname, rate]) => ({
    student_user_id: uid, username: uname, certified_rate: rate,
    courses: [courseBlock2(4, '生物医学工程导论', Math.round(2 * rate / 100), 2)],
  })),
})

const BOARD_P1 = {
  code: 200,
  summary: { scope: 'all', scope_label: '全营', group_count: 6, student_count: 21,
    certified_chapters: 40, total_chapters: 96, completed_courses: 5, certified_rate: 42 },
  groups: [boardGroup(21, '导生A', '硬件组', [[31, '学员甲', 80]]),
           boardGroup(22, '导生B', '软件组', [[32, '学员乙', 40]])],
  mentors: [{ mentor_user_id: 21, mentor_name: '导生A', direction: '硬件组' },
            { mentor_user_id: 22, mentor_name: '导生B', direction: '软件组' }],
  total: 7, page: 1, page_size: 5,
}
const BOARD_P2 = { ...BOARD_P1, page: 2,
  groups: [boardGroup(23, '导生C', '深度学习', [[33, '学员丙', 60]])] }
const BOARD_MENTOR_A = {
  code: 200,
  summary: { scope: 'mentor', scope_label: '导生A 团队', group_count: 1, student_count: 1,
    certified_chapters: 2, total_chapters: 2, completed_courses: 1, certified_rate: 100 },
  groups: [boardGroup(21, '导生A', '硬件组', [[31, '学员甲', 100]])],
  mentors: BOARD_P1.mentors, total: 1, page: 1, page_size: 5,
}

function mockProgressBackend(page, sessions, handler) {
  return page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')
        && !url.includes('teacher/overview') && !url.includes('progress/board')
        && !url.includes('meetings')) {
      return route.fulfill({ json: sessions })
    }
    if (url.includes('teacher/overview')) {
      return route.fulfill({ json: OVERVIEW })
    }
    if (url.includes('progress/board')) {
      return handler(route, new URL(route.request().url()).searchParams)
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('学习进度：首次加载完整骨架（不闪 0/空态），分页契约与汇总口径', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  const boardReqs = []
  await mockProgressBackend(page, SESSIONS_TEACHER, (route, params) => {
    boardReqs.push({ page: params.get('page'), page_size: params.get('page_size'),
      mentor_id: params.get('mentor_id') })
    // 延迟响应给骨架/受控加载断言留观察窗口（瞬时回包会让骨架在断言前消失）
    const delay = boardReqs.length <= 2 ? 900 : 0
    const payload = params.get('page') === '2' ? BOARD_P2 : BOARD_P1
    return delay
      ? new Promise((resolve) => setTimeout(() => resolve(route.fulfill({ json: payload })), delay))
      : route.fulfill({ json: payload })
  })

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '学习进度' }).click()
  // 整页准备态：顶部统计卡骨架 + 团队卡骨架（不是 0 / 空态闪现）
  await expect(page.locator('.stat-grid .dew-skeleton').first()).toBeVisible()
  await expect(page.locator('.group-card .dew-skeleton').first()).toBeVisible()
  await expect(page.getByText('本营暂无学员')).toHaveCount(0)
  // 数据就绪：摘要 + 第 1 页团队 + 分页条（total=7 非当前页组数）
  await expect(page.getByText('42%').first()).toBeVisible()
  await expect(page.locator('.g-head h3', { hasText: '导生A' })).toBeVisible()
  await expect(page.getByText('第 1 / 2 页 · 共 7 个团队')).toBeVisible()
  await expect(page.getByText('全营汇总（与翻页无关）')).toBeVisible()
  // 翻页：请求带 page=2 且翻页期间列表转受控加载（不混旧页数据）
  await page.getByRole('button', { name: '下一页' }).click()
  await expect(page.locator('.list-loading-hint')).toBeVisible()
  await expect(page.locator('.g-head h3', { hasText: '导生C' })).toBeVisible()
  await expect(page.getByText('第 2 / 2 页 · 共 7 个团队')).toBeVisible()
  expect(boardReqs[0]).toMatchObject({ page: '1', page_size: '5' })
  expect(boardReqs.at(-1)).toMatchObject({ page: '2' })
  expect(errors).toEqual([])
})

const BOARD_MENTOR_B = {
  code: 200,
  summary: { scope: 'mentor', scope_label: '导生B 团队', group_count: 1, student_count: 1,
    certified_chapters: 1, total_chapters: 2, completed_courses: 0, certified_rate: 50 },
  groups: [boardGroup(22, '导生B', '软件组', [[32, '学员乙', 50]])],
  mentors: BOARD_P1.mentors, total: 1, page: 1, page_size: 5,
}

test('学习进度：导生筛选走服务端 mentor_id，快速切换旧响应不覆盖新结果', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  const boardReqs = []
  await mockProgressBackend(page, SESSIONS_TEACHER, (route, params) => {
    const mid = params.get('mentor_id')
    boardReqs.push({ page: params.get('page'), mentor_id: mid })
    if (mid === '21') {
      // 导生A 的响应延迟 800ms——晚于导生B 返回，过期响应必须被丢弃
      return new Promise((resolve) => setTimeout(
        () => resolve(route.fulfill({ json: BOARD_MENTOR_A })), 800))
    }
    if (mid === '22') {
      // 导生B 稍缓：给二次选择留出点选完成的时间，避免选项节点被重渲染打断
      return new Promise((resolve) => setTimeout(
        () => resolve(route.fulfill({ json: BOARD_MENTOR_B })), 250))
    }
    return route.fulfill({ json: BOARD_P1 })
  })

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '学习进度' }).click()
  await expect(page.locator('.g-head h3', { hasText: '导生A' })).toBeVisible()

  // 选导生A（响应被延迟 800ms）→ 立刻改选导生B（立即返回）
  await page.locator('.mentor-filter').click()
  await page.locator('.dew-select__option', { hasText: '导生A · 硬件组' }).click()
  await page.locator('.mentor-filter').click()
  await page.locator('.dew-select__option', { hasText: '导生B · 软件组' }).click()

  // 导生B 数据先到并展示（含筛选口径汇总）
  await expect(page.locator('.g-head h3', { hasText: '导生B' })).toBeVisible()
  await expect(page.getByText('导生B 团队汇总（与翻页无关）')).toBeVisible()
  await page.waitForTimeout(1100)      // 等延迟的导生A 响应到达——不得覆盖 B 的结果
  await expect(page.locator('.g-head h3', { hasText: '导生B' })).toBeVisible()
  await expect(page.locator('.g-head h3', { hasText: '导生A' })).toHaveCount(0)
  // 筛选请求带 mentor_id 且页码重置为 1
  expect(boardReqs.filter((r) => r.mentor_id).map((r) => r.mentor_id)).toEqual(['21', '22'])
  expect(boardReqs.filter((r) => r.mentor_id).every((r) => r.page === '1')).toBe(true)
  expect(errors).toEqual([])
})

test('学习进度：加载失败显示页面内错误态与重试，恢复后出数据', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  let failFirst = true
  await mockProgressBackend(page, SESSIONS_TEACHER, (route) => {
    if (failFirst) {
      failFirst = false
      return route.fulfill({ status: 500, json: { code: 500, message: '看板服务暂不可用' } })
    }
    return route.fulfill({ json: BOARD_P1 })
  })

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '学习进度' }).click()
  // 失败不是只弹一次 Toast：页面内错误态 + 重试
  await expect(page.getByText('看板服务暂不可用')).toBeVisible()
  await expect(page.getByRole('button', { name: '重试' })).toBeVisible()
  await expect(page.getByText('第 1 / 2 页 · 共 7 个团队')).toHaveCount(0)
  await page.getByRole('button', { name: '重试' }).click()
  await expect(page.locator('.g-head h3', { hasText: '导生A' })).toBeVisible()
  expect(errors).toEqual([])
})

// ── 全营组会总览（2026-09-21 服务端分页 + 导生筛选 + 发起人展示 + 完整加载态）──

const mtg = (id, mentorId, team, title, date, minutes) => ({
  id, scope: 'team', unit_id: null, mentor_id: mentorId,
  title, meeting_date: date, content: minutes ? '纪要正文' : null,
  creator_name: mentorId === 21 ? '导生A' : '导生B', created_by: mentorId,
  created_at: NOW, updated_at: NOW, attachments: [],
  team_label: team, task_count: 2, chapter_count: 1, has_minutes: !!minutes,
})
const MEETINGS_P1 = {
  code: 200,
  meetings: [mtg(11, 21, '导生A', '第一周组会 · 方向讨论', '2026-09-16', true),
             mtg(12, 21, '导生A', '第二周组会 · 进度同步', '2026-09-23', false),
             mtg(13, 22, '导生B', '第一周组会 · 环境搭建', '2026-09-17', true)],
  mentors: [{ user_id: 21, username: '导生A', direction: '硬件组' },
            { user_id: 22, username: '导生B', direction: '软件组' }],
  total: 23, page: 1, page_size: 10,
}
const MEETINGS_P3 = {
  ...MEETINGS_P1, page: 3,
  meetings: [mtg(31, 22, '导生B', '第三周组会 · 结题评审', '2026-10-08', true)],
}
const MEETINGS_MENTOR_A = {
  ...MEETINGS_P1, total: 11,
  meetings: [mtg(11, 21, '导生A', '第一周组会 · 方向讨论', '2026-09-16', true)],
}

function mockMeetingsBackend(page, sessions, handler) {
  return page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')
        && !url.includes('teacher/overview') && !url.includes('progress/board')
        && !url.includes('meetings')) {
      return route.fulfill({ json: sessions })
    }
    if (url.includes('teacher/overview')) {
      return route.fulfill({ json: OVERVIEW })
    }
    if (url.includes('/meetings/all')) {
      return handler(route, new URL(route.request().url()).searchParams)
    }
    if (url.includes('/camp/meetings/11/detail')) {
      return route.fulfill({ json: { code: 200, is_leader: false, viewer_role: 'staff',
        meeting: MEETINGS_P1.meetings[0], students: [], tasks: [], chapters: [] } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('组会总览：标题用全量 total，卡片带团队与发起人，分页走服务端', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  const reqs = []
  await mockMeetingsBackend(page, SESSIONS_TEACHER, (route, params) => {
    reqs.push({ page: params.get('page'), page_size: params.get('page_size'),
      mentor_id: params.get('mentor_id') })
    // 首屏延迟响应：卡片骨架断言才有观察窗口
    const payload = params.get('page') === '3' ? MEETINGS_P3 : MEETINGS_P1
    if (reqs.length === 1) {
      return new Promise((resolve) => setTimeout(
        () => resolve(route.fulfill({ json: payload })), 900))
    }
    return route.fulfill({ json: payload })
  })

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '组会总览' }).click()
  // 首次加载：卡片骨架（不闪「全营组会（0）」）
  await expect(page.locator('.mtg-skel-card').first()).toBeVisible()
  // 标题计数=全量 total（23），不是当前页 meetings.length（3）
  await expect(page.getByText('全营组会（23）')).toBeVisible()
  // 卡片：团队名 + 发起人 + 任务/章节数
  await expect(page.locator('.mtg-team', { hasText: '导生A' }).first()).toBeVisible()
  await expect(page.locator('.mtg-creator', { hasText: '发起 导生A' }).first()).toBeVisible()
  await expect(page.locator('.mtg-count', { hasText: '任务 2' }).first()).toBeVisible()
  await expect(page.getByText('第 1 / 3 页 · 共 23 条')).toBeVisible()
  // 翻页请求契约
  await page.getByRole('button', { name: '下一页' }).click()
  await page.getByRole('button', { name: '下一页' }).click()
  await expect(page.getByText('第 3 / 3 页 · 共 23 条')).toBeVisible()
  await expect(page.locator('.mtg-title', { hasText: '结题评审' })).toBeVisible()
  expect(reqs[0]).toMatchObject({ page: '1', page_size: '10' })
  expect(reqs.at(-1)).toMatchObject({ page: '3' })
  expect(errors).toEqual([])
})

test('组会总览：按导生筛选重置页码，详情弹窗关闭后筛选与页码保留', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  await mockMeetingsBackend(page, SESSIONS_TEACHER, (route, params) => {
    if (params.get('mentor_id') === '21') return route.fulfill({ json: MEETINGS_MENTOR_A })
    return route.fulfill({ json: MEETINGS_P1 })
  })

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '组会总览' }).click()
  await expect(page.getByText('全营组会（23）')).toBeVisible()
  // 选导生A：服务端 mentor_id 筛选 + 页码回 1
  await page.locator('.mentor-filter').click()
  await page.locator('.dew-select__option', { hasText: '导生A · 硬件组' }).click()
  await expect(page.locator('.mtg-title', { hasText: '第二周组会' })).toHaveCount(0)
  await expect(page.getByText('第 1 / 2 页 · 共 11 条')).toBeVisible()
  // 打开详情（只读）再关闭：筛选与页码不丢
  await page.locator('.mtg-title', { hasText: '第一周组会 · 方向讨论' }).click()
  const dlg = page.locator('.dew-dialog')
  await expect(dlg).toBeVisible()
  await dlg.locator('.dew-dialog__close').click()
  await expect(page.locator('.dew-dialog')).toHaveCount(0)
  await expect(page.locator('.mentor-filter')).toContainText('导生A · 硬件组')
  await expect(page.getByText('第 1 / 2 页 · 共 11 条')).toBeVisible()
  expect(errors).toEqual([])
})

test('组会总览：筛选无结果的空态区分 + 一键恢复全部', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  await mockMeetingsBackend(page, SESSIONS_TEACHER, (route, params) => {
    if (params.get('mentor_id') === '22') {
      return route.fulfill({ json: { ...MEETINGS_P1, meetings: [], total: 0 } })
    }
    return route.fulfill({ json: MEETINGS_P1 })
  })

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '组会总览' }).click()
  await expect(page.getByText('全营组会（23）')).toBeVisible()
  await page.locator('.mentor-filter').click()
  await page.locator('.dew-select__option', { hasText: '导生B · 软件组' }).click()
  // 筛选空态：明确是「该导生暂无组会」而非全营无记录，并提供恢复入口
  await expect(page.getByText('该导生暂无组会记录')).toBeVisible()
  await page.getByRole('button', { name: '查看全部组会' }).click()
  await expect(page.getByText('第 1 / 3 页 · 共 23 条')).toBeVisible()
  expect(errors).toEqual([])
})

test('组会总览：项目营不出现「导生筛选」文案（项目组语义）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page)
  const SESSIONS_PROJECT = {
    code: 200,
    sessions: [{ ...SESSIONS_TEACHER.sessions[0], category: 'project' }],
  }
  await mockMeetingsBackend(page, SESSIONS_PROJECT, (route) =>
    route.fulfill({ json: MEETINGS_P1 }))

  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '组会总览' }).click()
  await expect(page.getByText('全营组会（23）')).toBeVisible()
  await expect(page.getByText('按导生团队')).toHaveCount(0)
  await expect(page.getByText('全部导生')).toHaveCount(0)
  await expect(page.getByText('只读总览——发起、布置与审阅由各项目负责人在其工作台完成')).toBeVisible()
  expect(errors).toEqual([])
})
