import { test, expect } from '@playwright/test'

// 组会留档（2026-09-17）：培训组（/camp tab，unitId 缺省走 team-meetings）与项目组
// （ProjectBoard 内嵌，/camp/units/:id/meetings）。组长/负责人提交，组员只读。
// mock 后端数据，零依赖真实库；契约对齐 camp_meeting.py（group/is_leader/meetings/attachments）。

const BASE = 'http://127.0.0.1:18081/AMEII'

// 学习营（running，成员）：tab=meetings 直达；项目营（running，成员）：渲染 ProjectHub
const SESSIONS = {
  code: 200,
  sessions: [
    { id: 1, name: '进行中的培训营', category: 'learning', cycle_name: '2026 暑期',
      start_date: '2026-08-26', end_date: '2026-09-30', status: 'running',
      is_member: true, my_role: 'student', member_count: 5, mentor_selection_enabled: false },
    { id: 30, name: '在营项目营', category: 'project', cycle_name: '2026 秋季',
      start_date: '2026-09-01', end_date: '2026-12-31', status: 'running',
      is_member: true, my_role: 'member', member_count: 12, mentor_selection_enabled: false,
      policy: { capabilities: { attendance: false, leave: false, seat: false } } },
  ],
}

const MEETING = {
  id: 11, scope: 'team', unit_id: null, mentor_id: 49,
  title: '第一周组会 · 方向讨论', meeting_date: '2026-09-16',
  content: '确定了各自的方向与分工。',
  created_by: 49, creator_name: '导生阿明',
  created_at: '2026-09-16T20:00:00', updated_at: '2026-09-16T20:00:00',
  attachments: [
    { id: 91, filename: '会议纪要.docx', size: 20480, content_type: 'application/msword', is_video: false },
    { id: 92, filename: '组会录像.mp4', size: 524288000, content_type: 'video/mp4', is_video: true },
  ],
}

const TEAM_MEETINGS = (leader, meetings) => ({
  code: 200,
  group: { scope: 'team', mentor_id: 49, mentor_name: '导生阿明', member_count: 3 },
  is_leader: leader,
  meetings,
})

const UNIT_MEETINGS = {
  code: 200,
  group: { scope: 'unit', unit_id: 54, unit_name: '智能床头监护', member_count: 4 },
  is_leader: false,
  meetings: [{ ...MEETING, id: 12, scope: 'unit', unit_id: 54, title: '项目周会 · 进度同步' }],
}

async function loginAsUser(page, extraMocks = [], role = 'user') {
  await page.addInitScript(([r]) => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false, level: 2,
      user: { role: r }, checkinInfo: {},
    }))
  }, [role])
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    for (const hit of extraMocks) {
      if (url.includes(hit.url)) {
        return hit.resp ? hit.resp(route) : route.fulfill({ json: hit.json })
      }
    }
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('学员·培训组组会只读：tab 列表渲染，无提交入口', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, [
    { url: '/team-meetings', json: TEAM_MEETINGS(false, [MEETING]) },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=meetings`, { waitUntil: 'domcontentloaded' })
  // tab 与组信息
  await expect(page.getByRole('button', { name: '组会', exact: true })).toBeVisible()
  await expect(page.locator('.cm-head-meta')).toContainText('组长 导生阿明')
  // 纪要内容与附件（文件链接 + 视频占位壳）
  await expect(page.locator('.mtg-title')).toHaveText('第一周组会 · 方向讨论')
  await expect(page.getByRole('button', { name: /会议纪要\.docx（20KB）/ })).toBeVisible()
  await expect(page.locator('.video-shell')).toContainText('组会录像.mp4')
  await expect(page.locator('.video-shell')).toContainText('500.0MB · 点击播放')
  // 组员只读：无任何管理入口
  await expect(page.getByRole('button', { name: '记录组会' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '编辑' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('导生·培训组提交组会：弹窗校验与提交后列表刷新', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const posted = { count: 0, body: '' }
  const meetings = []
  await loginAsUser(page, [
    { url: '/team-meetings', resp: (route) => route.request().method() === 'POST'
        ? (posted.count += 1,
           posted.body = route.request().postData() || '',
           route.fulfill({ json: { code: 200, message: '组会纪要已提交', meeting: MEETING } }))
        : route.fulfill({ json: TEAM_MEETINGS(true, meetings) }) },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=meetings`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '记录组会' })).toBeVisible()
  await expect(page.locator('.cm-none')).toContainText('还没有组会记录')

  // 打开弹窗：必填未齐时提交禁用
  await page.getByRole('button', { name: '记录组会' }).click()
  const dlg = page.locator('.dew-dialog')
  await expect(dlg).toBeVisible()
  await expect(page.getByRole('button', { name: '提交纪要' })).toBeDisabled()
  // 填齐三项（日期缺省今天，主题+纪要文字）→ 启用并提交
  await page.getByPlaceholder('如：第一周组会 · 方向讨论').fill('第二周组会 · 阶段小结')
  await dlg.locator('input[type="date"]').fill('2026-09-23')
  await page.getByPlaceholder('议题、结论与分工（文字与附件至少其一）').fill('各方向进度汇报。')
  await expect(page.getByRole('button', { name: '提交纪要' })).toBeEnabled()
  // 提交后列表回读刷新（GET 追加该条）
  meetings.push({ ...MEETING, id: 12, title: '第二周组会 · 阶段小结', meeting_date: '2026-09-23' })
  await page.getByRole('button', { name: '提交纪要' }).click()
  await expect(dlg).toBeHidden()
  await expect(page.locator('.mtg-title')).toHaveText('第二周组会 · 阶段小结')
  expect(posted.count).toBe(1)
  expect(posted.body).toContain('第二周组会 · 阶段小结')
  expect(posted.body).toContain('2026-09-23')
  expect(errors).toEqual([])
})

test('学员未编组：空态分流不报错', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, [
    { url: '/team-meetings', json: { code: 200, group: null, is_leader: false, meetings: [] } },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=meetings`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.empty-text')).toContainText('尚未分配导生')
  await expect(page.getByRole('button', { name: '记录组会' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('项目组成员·项目看板组会区块：只读渲染', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, [
    // ProjectHub → ProjectBoard 数据链（我参加的：unit 54）
    { url: '/camp/projects/30/mine',
      json: { code: 200, leading: [], joining: [
        { unit_id: 54, name: '智能床头监护', status: 'active', member_count: 4,
          leader_name: '负责人甲', leader_user_id: 9 }] } },
    { url: '/camp/projects/30/list', json: { code: 200, projects: [] } },
    { url: '/camp/projects/30/activities', json: { code: 200, units: [] } },
    { url: '/camp/units/54/milestones', json: { code: 200, milestones: [], my_role: 'member' } },
    { url: '/camp/units/54/outcomes', json: { code: 200, outcomes: [] } },
    { url: '/camp/units/54/meetings', json: UNIT_MEETINGS },
  ])

  await page.goto(`${BASE}/camp?sid=30`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.sec-title', { hasText: '组会纪要' })).toBeVisible()
  await expect(page.locator('.mtg-title')).toHaveText('项目周会 · 进度同步')
  await expect(page.locator('.video-shell')).toContainText('点击播放')
  // 组员只读：项目看板内也无组会管理入口
  await expect(page.getByRole('button', { name: '记录组会' })).toHaveCount(0)
  expect(errors).toEqual([])
})
