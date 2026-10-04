import { test, expect } from '@playwright/test'

// 通知中心邮箱化（左右分栏）+ 感谢信：mock 后端数据，零依赖真实库
// 覆盖：system 通知右栏详情 / gratitude 通知直达感谢信 tab / 选导生结果卡发送弹窗 / 移动端单栏弹窗回退

const BASE = 'http://127.0.0.1:18081/AMEII'

const NOW = new Date().toISOString()

const NOTIFICATIONS = {
  code: 200,
  data: {
    notifications: [
      { id: 101, title: '系统维护通知', content: '今晚 22:00-23:00 系统维护，请提前保存。', category: 'system', source_type: 'admin', camp_session_id: null, is_read: false, is_important: false, created_at: NOW },
      { id: 102, title: '收到一封感谢信', content: '张三 寄来一封感谢信，点开看看吧', category: 'message', source_type: 'gratitude', source_id: 201, camp_session_id: 1, is_read: false, is_important: false, created_at: NOW },
      { id: 104, title: '平台更新 v3.3', content: 'BME 平台 v3.3 已发布。点击查看本版本的完整更新日志。', category: 'system', source_type: 'platform_release', source_id: null, camp_session_id: null, is_read: false, is_important: false, created_at: NOW },
    ],
  },
}

const LETTERS = {
  code: 200,
  data: {
    letters: [
      { id: 201, sender: { user_id: 7, username: '张三', avatar: null }, camp_session_id: 1, camp_session_name: '测试营', content: '谢谢导师半夜还帮我改滤波参数！', is_read: false, created_at: NOW },
    ],
  },
}

const SESSIONS = {
  code: 200,
  sessions: [{
    id: 1, name: '测试营', camp_type: 'short_term',
    start_date: '2026-08-26', end_date: '2026-09-30', status: 'running',
    expected_check_in: '09:00', min_daily_hours: 6, weekdays_only: true,
    is_featured: false, member_count: 5, is_member: true, my_role: 'student',
    mentor_selection_enabled: true,
  }],
}

// 消息中心导生判定：身份解耦后感谢信 tab 读「任一营期 my_role=mentor」（sessions 驱动，非全局 role）
const SESSIONS_MENTOR = {
  ...SESSIONS,
  sessions: [{ ...SESSIONS.sessions[0], my_role: 'mentor' }],
}

const MENTORS = {
  mentors: [
    { user_id: 13, username: 'test_mentor', photo_url: null, avatar: null,
      capacity: 8, matched: 1, remaining: 7, full: false, tags: ['硬件组'], bio: '搞硬件的' },
  ],
}

// 已发布匹配结果：发布标记与 my_mentor 同时存在才渲染结果卡
const PHASE_MATCHED = {
  code: 200, phase: 'done', enabled: true, config_error: false, results_released: true,
  deadlines: {
    preference_start: '2026-08-24 00:00', preference_deadline: '2026-08-24 23:00',
    round1_deadline: '2026-08-24 23:59', round2_deadline: null,
  },
  round2_enabled: false, ms_tags: ['硬件组'],
  stats: { submitted: 2, students: 4 },
  me: {
    role: 'student', round1: [{ mentor_id: 13, note: '想学硬件' }], round2: [],
    submittable_round: null, unmatched: false,
    my_mentor: { user_id: 13, username: 'test_mentor' },
  },
}

async function loginAs(page, role = 'user') {
  // 预置登录态：token 键 + vuex 持久化键（两级角色恒 'user'；导生视角由 sessions 的 my_role 驱动）
  await page.addInitScript((r) => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: r }, checkinInfo: {},
    }))
  }, role)
}

async function mockInboxBackend(page) {
  // 通知 + 感谢信 + 营期列表（导生判定）给真形数据，其余统一 200 空数据
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/notification/list')) {
      return route.fulfill({ json: NOTIFICATIONS })
    }
    if (url.includes('/gratitude/received')) {
      return route.fulfill({ json: LETTERS })
    }
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS_MENTOR })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('邮箱式收件箱：system 通知在右栏展开详情（桌面不弹窗）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')
  await mockInboxBackend(page)

  await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '消息中心' })).toBeVisible()
  await expect(page.getByText('系统维护通知')).toBeVisible()

  // 点击 system 通知 → 右栏详情（断言收敛在右栏容器内，避免与列表预览文本重复）
  await page.getByText('系统维护通知').click()
  const rightPane = page.locator('.inbox-right')
  await expect(rightPane.getByText('今晚 22:00-23:00 系统维护，请提前保存。')).toBeVisible()
  await expect(rightPane.getByText('系统通知', { exact: true })).toBeVisible()

  // 发版公告（platform_release）：列表点击深链直达 /changelog 更新日志页
  await page.getByText('平台更新 v3.3').click()
  await expect(page).toHaveURL(/\/changelog$/)
  await expect(page.locator('.version-no', { hasText: 'v3.3' })).toBeVisible()

  // 桌面端不应弹出 DewDialog
  await expect(page.getByRole('heading', { name: '通知详情' })).toHaveCount(0)

  expect(errors).toEqual([])
})

test('感谢信：gratitude 通知直达感谢信 tab 并选中信件', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')
  await mockInboxBackend(page)

  // 等感谢信数据就绪再点击（通知点击时需要在内存里定位 source_id 对应信件）
  const lettersLoaded = page.waitForResponse((r) => r.url().includes('/gratitude/received'))
  await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })
  await lettersLoaded

  await page.getByText('收到一封感谢信').click()

  // 切到感谢信 tab（URL 同步）并选中信件
  await expect(page).toHaveURL(/tab=message/)
  await expect(page.getByText('张三 的感谢信')).toBeVisible()
  await expect(page.locator('.inbox-right').getByText('谢谢导师半夜还帮我改滤波参数！')).toBeVisible()

  // 打开即已读：未读统计消失
  await expect(page.getByText('1 条未读')).toHaveCount(0)

  expect(errors).toEqual([])
})

test('选导生 tab：现场写信卡写感谢信并寄出', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')

  let sentPayload = null
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS })
    }
    if (url.includes('/camp/ms/1/phase')) {
      return route.fulfill({ json: PHASE_MATCHED })
    }
    if (url.includes('/camp/ms/1/mentors')) {
      return route.fulfill({ json: MENTORS })
    }
    if (url.includes('/gratitude') && method === 'POST') {
      sentPayload = route.request().postDataJSON()
      return route.fulfill({ json: { code: 200, data: { id: 9 } } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })

  await page.goto(`${BASE}/camp?tab=ms&sid=1`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('我的导生', { exact: true })).toBeVisible()

  // 现场写信卡紧跟结果卡，无需弹窗
  await expect(page.getByText('感谢信 · 写给 test_mentor')).toBeVisible()
  await expect(page.getByRole('button', { name: '寄出感谢' })).toBeDisabled()

  await page.getByPlaceholder(/写下这位导生帮过你的瞬间/).fill('谢谢你带我入门硬件')
  await page.getByRole('button', { name: '寄出感谢' }).click()
  await expect(page.getByText('感谢信已寄出，TA 会在消息中心看到')).toBeVisible()

  // 契约字段：用户对 + 营期上下文 + 内容
  expect(sentPayload).toBeTruthy()
  expect(sentPayload.recipient_id).toBe(13)
  expect(String(sentPayload.camp_session_id)).toBe('1')
  expect(sentPayload.content).toBe('谢谢你带我入门硬件')

  expect(errors).toEqual([])
})

test('感谢信频控：后端重复错误转为已写过提示', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')

  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS })
    }
    if (url.includes('/camp/ms/1/phase')) {
      return route.fulfill({ json: PHASE_MATCHED })
    }
    if (url.includes('/camp/ms/1/mentors')) {
      return route.fulfill({ json: MENTORS })
    }
    if (url.includes('/gratitude') && method === 'POST') {
      return route.fulfill({ json: { code: 400, message: '本期已经给这位导生写过感谢信' } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })

  await page.goto(`${BASE}/camp?tab=ms&sid=1`, { waitUntil: 'domcontentloaded' })
  await page.getByPlaceholder(/写下这位导生帮过你的瞬间/).fill('再写一封试试')
  await page.getByRole('button', { name: '寄出感谢' }).click()

  // 频控命中不弹错误风暴，安静转已写过态
  await expect(page.getByText('这一期你已经给 TA 写过感谢信啦')).toBeVisible()

  expect(errors).toEqual([])
})

test('移动端单栏：system 通知回退详情弹窗', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')
  await mockInboxBackend(page)

  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('系统维护通知')).toBeVisible()

  await page.getByText('系统维护通知').click()
  await expect(page.getByRole('heading', { name: '通知详情' })).toBeVisible()
  await expect(page.locator('.dew-dialog').getByText('今晚 22:00-23:00 系统维护，请提前保存。')).toBeVisible()

  expect(errors).toEqual([])
})

// ── 2026-09-20 闭环升级：服务端未读数 + 分类全部已读范围 + 营期通知深链 ──

const MIXED_NOTIFICATIONS = {
  code: 200,
  data: {
    notifications: [
      { id: 301, title: '请假审批结果', content: '「测试营」请假已由 test_mentor 批准。', category: 'camp', source_type: 'leave', source_id: 55, camp_session_id: 1, is_read: false, is_important: false, created_at: NOW },
      { id: 302, title: '章节学习已认证', content: '「测试营」课程「硬件入门」章节已认证。', category: 'camp', source_type: 'camp_course', source_id: 9, camp_session_id: 1, is_read: false, is_important: false, created_at: NOW },
      { id: 303, title: '系统维护通知', content: '今晚维护。', category: 'system', source_type: 'admin', camp_session_id: null, is_read: false, is_important: false, created_at: NOW },
    ],
  },
}

const UNREAD = {
  code: 200,
  data: { unread_count: 3, total: 3, by_category: { camp: 2, system: 1 } },
}

async function mockClosureBackend(page, { unreadRequests } = {}) {
  // 深链目的地是学员视角的请假/学习页：session 需带 policy.capabilities（leave/attendance）
  const SESSIONS_STUDENT = {
    ...SESSIONS,
    sessions: [{
      ...SESSIONS.sessions[0],
      policy: { capabilities: { attendance: true, leave: true } },
    }],
  }
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (url.includes('/notification/unread_count')) {
      unreadRequests?.push(method)
      return route.fulfill({ json: UNREAD })
    }
    if (url.includes('/notification/list')) {
      return route.fulfill({ json: MIXED_NOTIFICATIONS })
    }
    if (url.includes('/gratitude/received')) {
      return route.fulfill({ json: { code: 200, data: { letters: [] } } })
    }
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS_STUDENT })
    }
    if (url.includes('/camp/sessions/1/leave')) {
      return route.fulfill({ json: { code: 200, leaves: [] } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('铃铛：服务端未读数轮询 + 展开懒加载预览', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')
  const unreadRequests = []
  await mockClosureBackend(page, { unreadRequests })

  await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })

  // 未读数来自服务端轻量接口（不再由本地列表推算）
  await expect(page.locator('.notification-badge')).toHaveText('3')

  // 展开铃铛懒加载最近摘要（不依赖全量列表）
  await page.locator('.notification-trigger').hover()
  await expect(page.locator('.preview-item').first()).toBeVisible()
  await expect(unreadRequests.length).toBeGreaterThan(0)

  expect(errors).toEqual([])
})

test('营期通知深链：leave 直达请假页 / camp_course 直达学习方向', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')
  await mockClosureBackend(page)

  await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })

  // leave → /camp?tab=leave&sid=1（学员视角渲染请假页）
  await page.getByText('请假审批结果').click()
  await expect(page).toHaveURL(/tab=leave/)
  await expect(page).toHaveURL(/sid=1/)
  await expect(page.getByRole('heading', { name: '申请请假' })).toBeVisible()

  // camp_course → /camp?tab=study&sid=1
  await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })
  await page.getByText('章节学习已认证').click()
  await expect(page).toHaveURL(/tab=study/)

  expect(errors).toEqual([])
})

test('分类全部已读：只标记当前分类，请求带 category', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')

  let markAllBody = null
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/notification/unread_count')) {
      return route.fulfill({ json: UNREAD })
    }
    if (url.includes('/notification/list')) {
      return route.fulfill({ json: MIXED_NOTIFICATIONS })
    }
    if (url.includes('/gratitude/received')) {
      return route.fulfill({ json: { code: 200, data: { letters: [] } } })
    }
    if (url.includes('/notification/mark_all_read')) {
      markAllBody = route.request().postDataJSON()
      return route.fulfill({ json: { code: 200, data: { marked_count: 2 } } })
    }
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })

  await page.goto(`${BASE}/notifications?tab=camp`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: '全部已读' }).click()

  // 请求只针对 camp 分类
  expect(markAllBody).toEqual({ category: 'camp' })

  // 乐观更新只动营期行：camp tab 下两条通知的未读点消失
  const leaveCard = page.locator('.dew-card', { hasText: '请假审批结果' })
  const certCard = page.locator('.dew-card', { hasText: '章节学习已认证' })
  await expect(leaveCard.locator('.unread-dot')).toHaveCount(0)
  await expect(certCard.locator('.unread-dot')).toHaveCount(0)

  // 切到系统 tab：系统通知未被误标（原实现会把全部本地行置已读）
  await page.getByRole('button', { name: '系统' }).click()
  const sysCard = page.locator('.dew-card', { hasText: '系统维护通知' })
  await expect(sysCard.locator('.unread-dot')).toHaveCount(1)

  expect(errors).toEqual([])
})

// ── 内部工作台通知（feature/work-collab）：tab 浮出 + work_item 深链 ──

// /work/me 探测形（有资格）：workspaces 非空即浮出「工作」tab
const ME_WORK_GRANTED = {
  code: 200, message: 'ok',
  data: {
    eligibility: { kind: 'member', group_ids: [3] }, is_governance: false,
    workspaces: [{ id: 1, club_group_id: 3, group_name: '软件组', status: 'active', role: 'member' }],
    todo: { pending_responses: 0, pending_transfers: 0, to_review: 0, due_soon: 0, overdue: 0 },
  },
}

const ME_WORK_EMPTY = {
  code: 200, message: 'ok',
  data: { eligibility: null, is_governance: false, workspaces: [],
          todo: { pending_responses: 0, pending_transfers: 0, to_review: 0, due_soon: 0, overdue: 0 } },
}

const WORK_NOTIFICATIONS = {
  code: 200,
  data: {
    notifications: [
      { id: 401, title: '设备检修转交给你', content: '陈干事 把「设备检修排期」转交给你，请确认接手。', category: 'work', source_type: 'work_item', source_id: 101, camp_session_id: null, is_read: false, is_important: false, created_at: NOW },
    ],
  },
}

async function mockWorkNotifBackend(page, meData) {
  // work 域通知 + /work/me 探测给真形数据，其余统一 200 空数据
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/notification/list')) {
      return route.fulfill({ json: WORK_NOTIFICATIONS })
    }
    if (url.includes('/gratitude/received')) {
      return route.fulfill({ json: { code: 200, data: { letters: [] } } })
    }
    if (url.includes('/work/me/todos')) {
      return route.fulfill({ json: { code: 200, data: { pending_responses: [], pending_transfers: [], to_review: [], due: [] } } })
    }
    if (url.includes('/work/me')) {
      return route.fulfill({ json: meData })
    }
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('工作通知：tab 随资格浮出，点击深链直达事项页', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')
  await mockWorkNotifBackend(page, ME_WORK_GRANTED)

  await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })
  // 「工作」tab 仅已开通工作人员可见（/work/me 探测通过）
  await page.getByRole('button', { name: '工作' }).click()
  await expect(page).toHaveURL(/tab=work/)
  await expect(page.getByText('设备检修转交给你')).toBeVisible()

  // work_item 通知点击 → /work/items/:source_id 深链
  await page.getByText('设备检修转交给你').click()
  await expect(page).toHaveURL(/\/work\/items\/101$/)

  expect(errors).toEqual([])
})

test('无工作资格：「工作」tab 不浮出（学员不可见）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')
  await mockWorkNotifBackend(page, ME_WORK_EMPTY)

  await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '工作' })).toHaveCount(0)

  expect(errors).toEqual([])
})

test('社区互动深链：discussion_reply/discussion_like 直达帖子页（L2-1）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'user')
  // 复用闭环 mock（登录态/未读数/会话等基础端点），仅覆写通知列表为社区互动
  await mockClosureBackend(page)
  const NOW2 = new Date().toISOString()
  await page.unroute('http://127.0.0.1:5001/**')
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/notification/unread_count')) {
      return route.fulfill({ json: UNREAD })
    }
    if (url.includes('/notification/list')) {
      return route.fulfill({ json: { code: 200, data: {
        notifications: [
          { id: 301, title: '你的内容有新回复', content: '李四 回复了你：同问', category: 'community',
            source_type: 'discussion_reply', source_id: 88, camp_session_id: null,
            is_read: false, is_important: false, created_at: NOW2 },
          { id: 302, title: '你的内容获赞', content: '王五 赞了你的内容', category: 'community',
            source_type: 'discussion_like', source_id: 88, camp_session_id: null,
            is_read: false, is_important: false, created_at: NOW2 },
        ],
        total: 2, page: 1, pages: 1,
      } } })
    }
    if (url.includes('/gratitude/received')) {
      return route.fulfill({ json: { code: 200, data: { letters: [] } } })
    }
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS })
    }
    return route.fulfill({ json: { code: 200 } })
  })

  await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })
  await page.getByText('你的内容有新回复').click()
  await expect(page).toHaveURL(/\/community\/thread\/88/)
  await page.goto(`${BASE}/notifications`, { waitUntil: 'domcontentloaded' })
  await page.getByText('你的内容获赞').click()
  await expect(page).toHaveURL(/\/community\/thread\/88/)
  expect(errors).toEqual([])
})
