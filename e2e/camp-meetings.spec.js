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
  await expect(page.getByRole('button', { name: '组会任务', exact: true })).toBeVisible()
  await expect(page.locator('.cm-head-meta')).toContainText('组长 导生阿明')
  // 纪要内容与附件（文件链接 + 视频占位壳）
  await expect(page.locator('.mtg-title')).toHaveText('第一周组会 · 方向讨论')
  await expect(page.locator('.att-link', { hasText: '会议纪要.docx' })).toBeVisible()
  await expect(page.locator('.video-shell')).toContainText('组会录像.mp4')
  await expect(page.locator('.video-shell')).toContainText('500.0MB · 点击播放')
  // 组员只读：无任何管理入口
  await expect(page.getByRole('button', { name: '发起组会' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '编辑' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '删除' })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('导生·发起组会：创建后直达布置编辑（发起即布置）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const posted = { count: 0, body: '' }
  const meetings = []
  const created = { ...MEETING, id: 12, title: '第二周组会 · 阶段小结', meeting_date: '2026-09-23' }
  await loginAsUser(page, [
    { url: '/team-meetings', resp: (route) => route.request().method() === 'POST'
        ? (posted.count += 1,
           posted.body = route.request().postData() || '',
           route.fulfill({ json: { code: 200, message: '组会纪要已提交', meeting: created } }))
        : route.fulfill({ json: TEAM_MEETINGS(true, meetings) }) },
    // 新建组会的详情（空布置）——发起即布置直达编辑态
    { url: '/camp/meetings/12/detail',
      json: { code: 200, is_leader: true, meeting: created,
              students: [{ user_id: 52, username: '学员小一' }],
              tasks: [], chapters: [], chapter_catalog: [] } },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=meetings`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: '发起组会' })).toBeVisible()
  await expect(page.locator('.cm-none')).toContainText('还没有组会')

  // 创建弹窗：必填未齐时提交禁用
  await page.getByRole('button', { name: '发起组会' }).click()
  const dlg = page.locator('.dew-dialog')
  await expect(dlg).toBeVisible()
  await expect(page.getByRole('button', { name: '提交纪要' })).toBeDisabled()
  await page.getByPlaceholder('如：第一周组会 · 方向讨论').fill('第二周组会 · 阶段小结')
  await dlg.locator('input[type="date"]').fill('2026-09-23')
  await page.getByPlaceholder('议题、结论与分工（文字与附件至少其一）').fill('各方向进度汇报。')
  await expect(page.getByRole('button', { name: '提交纪要' })).toBeEnabled()
  // 创建成功 → 不回列表，直接进入详情的布置编辑态（引导条 + 任务编辑器）
  meetings.push(created)
  await page.getByRole('button', { name: '提交纪要' }).click()
  await expect(page.locator('.dew-dialog')).toHaveCount(1)
  await expect(dlg.locator('.create-banner')).toContainText('现在布置本期的课外任务与课内进度')
  await expect(dlg.locator('.field-label', { hasText: '课外任务' })).toBeVisible()
  // 关详情回列表：新纪录就位（scope 到详情弹窗——创建弹窗离场中短暂共存）
  await dlg.filter({ hasText: '组会 · 第二周组会' }).locator('.dew-dialog__close').click()
  await expect(page.locator('.dew-dialog')).toHaveCount(0)
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
  await expect(page.getByRole('button', { name: '发起组会' })).toHaveCount(0)
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
  await expect(page.getByRole('button', { name: '发起组会' })).toHaveCount(0)
  expect(errors).toEqual([])
})

// ── 教学单元（09-17 第二批）：布置（课内章节+课外任务）/ 提交 / 审阅矩阵 / 一键打包 ──

const DETAIL_LEADER = {
  code: 200, is_leader: true,
  meeting: { ...MEETING, task_count: 2, chapter_count: 1, submission_count: 2, expected_count: 4 },
  students: [{ user_id: 52, username: '学员小一' }, { user_id: 53, username: '学员小二' }],
  tasks: [
    { id: 21, title: '文献阅读笔记', note: '读一篇方向综述', submit_type: 'any',
      submit_type_text: '文字或文件', submission_count: 1,
      submissions: {
        52: { valid: true, content: '读完了，笔记在附件之外补一句。', updated_at: '2026-09-17T10:00:00', attachments: [] },
        53: { valid: false, content: '', updated_at: '2026-09-17T11:00:00', attachments: [] },
      } },
    { id: 22, title: '环境搭建截图', note: null, submit_type: 'file',
      submit_type_text: '需交文件', submission_count: 1,
      submissions: {
        52: { valid: true, content: null, updated_at: '2026-09-17T12:00:00',
              attachments: [{ id: 91, filename: 'env.png', size: 2048, content_type: 'image/png',
                              url: '/camp/meetings/task-attachments/91?u=52&e=1&st=x' }] },
      } },
  ],
  chapters: [
    { chapter_id: 7, course_id: 4, course_title: '生物医学工程导论', chapter_title: '第一章：概述',
      certs: { 52: { score: 88 }, 53: null }, certified_count: 1 },
  ],
  chapter_catalog: [
    { course_id: 4, course_title: '生物医学工程导论',
      chapters: [{ id: 7, name: '第一章：概述' }, { id: 8, name: '第二章：材料' }] },
  ],
}

const DETAIL_MEMBER = {
  code: 200, is_leader: false,
  meeting: MEETING,
  students: [],
  tasks: [
    { id: 21, title: '文献阅读笔记', note: '读一篇方向综述', submit_type: 'any',
      submit_type_text: '文字或文件',
      my_submission: { valid: true, content: '读完了。', updated_at: '2026-09-17T10:00:00', attachments: [] } },
    { id: 22, title: '环境搭建截图', note: null, submit_type: 'file',
      submit_type_text: '需交文件', my_submission: null },
  ],
  chapters: [
    { chapter_id: 7, course_id: 4, course_title: '生物医学工程导论', chapter_title: '第一章：概述',
      my_cert: { score: 88 } },
  ],
}

test('导生·组会详情：布置编辑与审阅矩阵', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let assignBody = null
  await loginAsUser(page, [
    { url: '/team-meetings', json: TEAM_MEETINGS(true, [DETAIL_LEADER.meeting]) },
    { url: '/camp/meetings/11/detail', json: DETAIL_LEADER },
    { url: '/camp/meetings/11/assignments', resp: (route) => {
        if (route.request().method() === 'PUT') {
          assignBody = route.request().postData()?.toString() || ''
          return route.fulfill({ json: DETAIL_LEADER })
        }
        return route.fulfill({ json: DETAIL_LEADER })
      } },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=meetings`, { waitUntil: 'domcontentloaded' })
  // 列表卡布置摘要：提交进度 + 详情入口
  await expect(page.locator('.mtg-assign')).toContainText('提交 2/4')
  await page.locator('.mtg-card').first().click()
  const dlg = page.locator('.dew-dialog')
  await expect(dlg).toBeVisible()
  // 三区：纪要 / 布置（只读态）/ 审阅（任务矩阵 + 章节认证矩阵）
  await expect(dlg.locator('.md-sec-title', { hasText: '纪要' })).toBeVisible()
  await expect(dlg.locator('.md-sec-title', { hasText: '布置' })).toBeVisible()
  await expect(dlg.locator('.md-sec-title', { hasText: '审阅' })).toBeVisible()
  await expect(dlg.locator('.task-line', { hasText: '文献阅读笔记' })).toContainText('已交 1/2')
  await expect(dlg.locator('.matrix').first()).toContainText('1 文件')
  await expect(dlg.locator('.matrix').first()).toContainText('未交')
  await expect(dlg.locator('.cert-cell.ok')).toHaveText('88 分')
  // 点成员名展开提交明细（内嵌短签直链 <a>）——限定任务矩阵（章节矩阵也有同名表头）
  await dlg.locator('.matrix').first().locator('.m-name', { hasText: '学员小一' }).click()
  await expect(dlg.locator('.student-panel')).toContainText('env.png')
  // 编辑布置：勾新章节 + 加任务 → 保存
  await dlg.getByRole('button', { name: '编辑布置' }).click()
  await dlg.locator('.ch-chip', { hasText: '第二章：材料' }).click()
  await dlg.getByRole('button', { name: '添加任务' }).click()
  await dlg.getByPlaceholder('任务标题（如：读一篇方向综述并写笔记）').last().fill('翻译练习')
  await dlg.getByRole('button', { name: '保存布置' }).click()
  await expect(page.locator('.el-message', { hasText: '布置已保存' })).toBeVisible()
  expect(assignBody).toContain('翻译练习')
  const parsed = JSON.parse(assignBody || '{}')
  expect(parsed.chapters).toEqual(expect.arrayContaining([7, 8]))
  expect(parsed.tasks.length).toBe(3)
  expect(errors).toEqual([])
})

test('组员·组会详情：任务提交与我的认证态', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let submitCount = 0
  const member = JSON.parse(JSON.stringify(DETAIL_MEMBER))
  await loginAsUser(page, [
    { url: '/team-meetings', json: TEAM_MEETINGS(false, [{ ...MEETING, task_count: 2, chapter_count: 1, my_pending: 1 }]) },
    { url: '/camp/meetings/11/detail', json: member },
    { url: '/tasks/22/submission', resp: (route) => {
        submitCount += 1
        member.tasks[1].my_submission = { valid: true, content: '搭建完成',
          updated_at: '2026-09-17T13:00:00', attachments: [] }
        return route.fulfill({ json: { code: 200, message: '已提交',
          my_submission: member.tasks[1].my_submission } })
      } },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=meetings`, { waitUntil: 'domcontentloaded' })
  // 待办聚合条置顶直达（作业不藏卡片里），点击直开详情
  await expect(page.locator('.pending-strip')).toContainText('项任务待提交')
  await page.getByRole('button', { name: '去提交' }).click()
  const dlg = page.locator('.dew-dialog')
  await expect(dlg).toBeVisible()
  // 我的任务：一已交一未交；课内章节认证态
  await expect(dlg.locator('.my-task').first()).toContainText('已提交')
  await expect(dlg.locator('.my-task').nth(1)).toContainText('未提交')
  await expect(dlg.locator('.chapter-line')).toContainText('已认证 88 分')
  // 提交弹窗：空态禁用 → 填文字 → 提交 → 徽标翻绿
  await dlg.getByRole('button', { name: '提交', exact: true }).click()
  const nested = page.locator('.dew-dialog').last()
  await expect(nested).toBeVisible()
  const submitBtn = nested.getByRole('button', { name: '提交', exact: true })
  await expect(submitBtn).toBeDisabled()
  await nested.getByPlaceholder('任务的文字部分（按要求填写）').fill('搭建完成')
  await expect(submitBtn).toBeEnabled()
  await submitBtn.click()
  await expect(page.locator('.dew-dialog')).toHaveCount(1)   // 嵌套弹窗关闭，只剩外层
  await expect(dlg.locator('.my-task').nth(1).getByText('已提交')).toBeVisible()
  expect(submitCount).toBe(1)
  expect(errors).toEqual([])
})

test('导生·一键打包下载全部提交', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, [
    { url: '/team-meetings', json: TEAM_MEETINGS(true, [DETAIL_LEADER.meeting]) },
    { url: '/camp/meetings/11/detail', json: DETAIL_LEADER },
    { url: '/submissions/zip/token',
      json: { code: 200, expires_in: 7200,
              url: '/camp/meetings/11/submissions/zip?u=49&e=1789600000&st=abc' } },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=meetings`, { waitUntil: 'domcontentloaded' })
  await page.locator('.mtg-card').first().click()
  await page.evaluate(() => {
    window.__opened = []
    window.open = (u) => { window.__opened.push(String(u)); return null }
  })
  await page.locator('.dew-dialog').getByRole('button', { name: '打包下载全部提交' }).click()
  await expect.poll(() => page.evaluate(() => window.__opened[0]))
    .toContain('/camp/meetings/11/submissions/zip?')
  expect(errors).toEqual([])
})
