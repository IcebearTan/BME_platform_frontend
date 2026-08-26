import { test, expect } from '@playwright/test'

// 通知中心邮箱化（左右分栏）+ 感谢信：mock 后端数据，零依赖真实库
// 覆盖：system 通知右栏详情 / gratitude 通知直达感谢信 tab / 选导生结果卡发送弹窗 / 移动端单栏弹窗回退

const BASE = 'http://localhost:8081/AMEII'

const NOW = new Date().toISOString()

const NOTIFICATIONS = {
  code: 200,
  data: {
    notifications: [
      { id: 101, title: '系统维护通知', content: '今晚 22:00-23:00 系统维护，请提前保存。', category: 'system', source_type: 'admin', camp_session_id: null, is_read: false, is_important: false, created_at: NOW },
      { id: 102, title: '收到一封感谢信', content: '张三 寄来一封感谢信，点开看看吧', category: 'gratitude', source_type: 'gratitude', source_id: 201, camp_session_id: 1, is_read: false, is_important: false, created_at: NOW },
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
    start_date: '2026-08-26', end_date: '2026-09-30', status: 'active',
    expected_check_in: '09:00', min_daily_hours: 6, weekdays_only: true,
    is_featured: false, member_count: 5, is_member: true,
    mentor_selection_enabled: true,
  }],
}

const MENTORS = {
  mentors: [
    { user_id: 13, username: 'test_mentor', photo_url: null, avatar: null,
      capacity: 8, matched: 1, remaining: 7, full: false, tags: ['硬件组'], bio: '搞硬件的' },
  ],
}

// 已匹配结果卡：my_mentor 存在即渲染海报式结果卡
const PHASE_MATCHED = {
  code: 200, phase: 'done', enabled: true, config_error: false,
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

async function loginAs(page, role) {
  // 预置登录态：token 键 + vuex 持久化键（role getter 读 state.user.role）
  await page.addInitScript((r) => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: r }, checkinInfo: {},
    }))
  }, role)
}

async function mockInboxBackend(page) {
  // 通知 + 感谢信给真形数据，其余统一 200 空数据
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/notification/list')) {
      return route.fulfill({ json: NOTIFICATIONS })
    }
    if (url.includes('/gratitude/received')) {
      return route.fulfill({ json: LETTERS })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('邮箱式收件箱：system 通知在右栏展开详情（桌面不弹窗）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'mentor')
  await mockInboxBackend(page)

  await page.goto(`${BASE}/notifications`)
  await expect(page.getByRole('heading', { name: '消息中心' })).toBeVisible()
  await expect(page.getByText('系统维护通知')).toBeVisible()

  // 点击 system 通知 → 右栏详情（断言收敛在右栏容器内，避免与列表预览文本重复）
  await page.getByText('系统维护通知').click()
  const rightPane = page.locator('.inbox-right')
  await expect(rightPane.getByText('今晚 22:00-23:00 系统维护，请提前保存。')).toBeVisible()
  await expect(rightPane.getByText('系统通知', { exact: true })).toBeVisible()

  // 桌面端不应弹出 DewDialog
  await expect(page.getByRole('heading', { name: '通知详情' })).toHaveCount(0)

  expect(errors).toEqual([])
})

test('感谢信：gratitude 通知直达感谢信 tab 并选中信件', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'mentor')
  await mockInboxBackend(page)

  // 等感谢信数据就绪再点击（通知点击时需要在内存里定位 source_id 对应信件）
  const lettersLoaded = page.waitForResponse((r) => r.url().includes('/gratitude/received'))
  await page.goto(`${BASE}/notifications`)
  await lettersLoaded

  await page.getByText('收到一封感谢信').click()

  // 切到感谢信 tab（URL 同步）并选中信件
  await expect(page).toHaveURL(/tab=gratitude/)
  await expect(page.getByText('张三 的感谢信')).toBeVisible()
  await expect(page.locator('.inbox-right').getByText('谢谢导师半夜还帮我改滤波参数！')).toBeVisible()

  // 打开即已读：未读统计消失
  await expect(page.getByText('1 条未读')).toHaveCount(0)

  expect(errors).toEqual([])
})

test('选导生结果卡：写感谢信并寄出', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'student')

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

  await page.goto(`${BASE}/camp?tab=ms&sid=1`)
  await expect(page.getByText('我的导生', { exact: true })).toBeVisible()

  // 打开感谢信弹窗
  await page.getByRole('button', { name: '写封感谢信' }).click()
  await expect(page.getByText('给 test_mentor')).toBeVisible()

  // 写信寄出
  await page.getByPlaceholder(/写下这位导生帮过你的瞬间/).fill('谢谢你带我入门硬件')
  await page.getByRole('button', { name: '寄出感谢' }).click()
  await expect(page.getByText('感谢信已寄出')).toBeVisible()

  // 契约字段：用户对 + 营期上下文 + 内容
  expect(sentPayload).toBeTruthy()
  expect(sentPayload.recipient_id).toBe(13)
  expect(String(sentPayload.camp_session_id)).toBe('1')
  expect(sentPayload.content).toBe('谢谢你带我入门硬件')

  expect(errors).toEqual([])
})

test('移动端单栏：system 通知回退详情弹窗', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAs(page, 'mentor')
  await mockInboxBackend(page)

  await page.setViewportSize({ width: 375, height: 800 })
  await page.goto(`${BASE}/notifications`)
  await expect(page.getByText('系统维护通知')).toBeVisible()

  await page.getByText('系统维护通知').click()
  await expect(page.getByRole('heading', { name: '通知详情' })).toBeVisible()
  await expect(page.locator('.dew-dialog').getByText('今晚 22:00-23:00 系统维护，请提前保存。')).toBeVisible()

  expect(errors).toEqual([])
})
