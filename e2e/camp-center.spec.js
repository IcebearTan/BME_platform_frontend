import { test, expect } from '@playwright/test'

// 营期中心（/camp 无 sid 时的工作台首页）：分组卡片 / 工作台内报名（选组+到岗日）/ 导生报名 / 中心↔工作台切换
// mock 后端数据，零依赖真实库；契约对齐后端 session_list（is_member/my_role；2026-09-12 起
// 资格名单退役：导生自由报名 LV≥2，session 行不再有 has_eligibility）

const BASE = 'http://127.0.0.1:18081/AMEII'

// 覆盖五个分组 + 项目营报名占位：导生可报名(待开放) / 可报名(选择阶段) / 我的营期 / 即将开始 / 历史
const SESSIONS = {
  code: 200,
  sessions: [
    { id: 21, name: '秋季导生营', category: 'learning', cycle_name: '2026 秋季',
      start_date: '2027-01-11', end_date: '2027-02-11', status: 'upcoming',
      is_member: false, my_role: null, member_count: 0,
      mentor_selection_enabled: false },
    { id: 22, name: '春季招募营', category: 'learning', cycle_name: '2027 春季',
      start_date: '2027-03-01', end_date: '2027-03-31', status: 'selecting',
      is_member: false, my_role: null, member_count: 3,
      weekdays_only: true, mentor_selection_enabled: false,
      ms_tags: ['软件组', '硬件组'],
      policy: { attendance_mode: 'daily', capabilities: { attendance: true, leave: true, seat: true } } },
    { id: 28, name: '学期周考营', category: 'learning', cycle_name: '2026 秋季',
      start_date: '2026-09-14', end_date: '2027-01-15', status: 'selecting',
      is_member: false, my_role: null, member_count: 6,
      weekdays_only: true, mentor_selection_enabled: false,
      policy: { attendance_mode: 'weekly', capabilities: { attendance: true, leave: true, seat: true } } },
    { id: 23, name: '暑期双选营', category: 'learning', cycle_name: '2026 暑期',
      start_date: '2026-08-26', end_date: '2026-09-30', status: 'selecting',
      is_member: true, my_role: 'student', member_count: 8,
      mentor_selection_enabled: true },
    { id: 1, name: '进行中的营', category: 'learning', cycle_name: '2026 暑期',
      start_date: '2026-08-26', end_date: '2026-09-30', status: 'running',
      is_member: true, my_role: 'student', member_count: 5,
      mentor_selection_enabled: false },
    { id: 24, name: '明年暑期营', category: 'learning', cycle_name: '2027 暑期',
      start_date: '2027-07-01', end_date: '2027-08-31', status: 'upcoming',
      is_member: false, my_role: null, member_count: 0,
      mentor_selection_enabled: false },
    { id: 25, name: '去年寒假营', category: 'learning', cycle_name: '2026 寒假',
      start_date: '2026-01-10', end_date: '2026-02-10', status: 'archived',
      is_member: true, my_role: 'student', member_count: 12,
      mentor_selection_enabled: false },
    { id: 26, name: '秋季项目营', category: 'project', cycle_name: '2026 秋季',
      start_date: '2027-01-11', end_date: '2027-02-11', status: 'selecting',
      is_member: false, my_role: null, member_count: 0,
      mentor_selection_enabled: false, ms_tags: [],
      policy: { project_limit: 3, capabilities: { attendance: false, leave: false, seat: false } } },
    { id: 27, name: '明年春季项目营', category: 'project', cycle_name: '2027 春季',
      start_date: '2027-03-01', end_date: '2027-04-30', status: 'upcoming',
      is_member: false, my_role: null, member_count: 0,
      mentor_selection_enabled: false, ms_tags: [],
      policy: { project_limit: 3, capabilities: { attendance: false, leave: false, seat: false } } },
    { id: 30, name: '在营项目营', category: 'project', cycle_name: '2026 秋季',
      start_date: '2026-09-01', end_date: '2026-12-31', status: 'running',
      is_member: true, my_role: 'member', member_count: 12,
      mentor_selection_enabled: false, ms_tags: [],
      policy: { project_limit: 3, capabilities: { attendance: false, leave: false, seat: false } } },
  ],
}

// role=全局角色；level=用户等级（导生可报名组/导生报名卡判定：LV≥2 才可见）
async function loginAsUser(page, extraMocks = [], role = 'user', level = 1) {
  await page.addInitScript(([r, lv]) => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false, level: lv,
      user: { role: r }, checkinInfo: {},
    }))
  }, [role, level])
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    for (const hit of extraMocks) {
      if (url.includes(hit.url)) return route.fulfill({ json: hit.json })
    }
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS })
    }
    if (url.includes('/camp/join-requests/mine')) {
      return route.fulfill({ json: { code: 200, requests: [] } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('营期中心：五分组渲染与身份/主操作', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  // LV4：待开放的秋季导生营归「导生可报名」组（自由报名，资格名单已退役）
  await loginAsUser(page, [], 'user', 4)

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '营期中心' })).toBeVisible()

  // 五个分组标题齐备（空组隐藏，本例全覆盖：两所 learning 待开放营进「导生可报名」，
  // 项目营 upcoming 归「即将开始」）；「导生可报名」含「可报名」子串，须整串锚定
  for (const title of ['导生可报名', '可报名', '我的营期', '即将开始', '历史营期']) {
    await expect(page.locator('.group-title').filter({ hasText: new RegExp(`^${title}$`) })).toBeVisible()
  }
  // 卡片一致性：入口按钮统一为「进入营期」，每张卡恰一个（9 营全可见 = 9 个，含项目营×2+周考营）；
  // 报名等动作不在中心做，全部进营期工作台完成
  await expect(page.getByRole('button', { name: '进入营期' })).toHaveCount(10)
  await expect(page.getByRole('button', { name: '去报名' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '报名成为导生' })).toHaveCount(0)
  // 身份/报名状态只显示在身份行一处（两所 learning 待开放营都标「可报导生」）
  await expect(page.locator('.card-role', { hasText: '可报导生' }).first()).toBeVisible()
  await expect(page.locator('.card-role', { hasText: '学员' }).first()).toBeVisible()
  // 类型与周期标签
  await expect(page.locator('.card-kind', { hasText: '培训营' }).first()).toBeVisible()
  await expect(page.locator('.card-cycle', { hasText: '2026 暑期' }).first()).toBeVisible()

  expect(errors).toEqual([])
})

test('超管预判：中心隐藏可报名组，工作台给说明卡不给表单', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, [], 'super_admin')

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '营期中心' })).toBeVisible()
  // 后端对管理员报名一律 400：中心预判隐藏「可报名」组；但卡不消失——
  // 09-13 兜底组覆盖：staff 视角的 selecting 营（id22/26/28）落「其他营期」组可见
  await expect(page.locator('.group-title', { hasText: '可报名' })).toHaveCount(0)
  await expect(page.locator('.group-title').filter({ hasText: /^其他营期$/ })).toBeVisible()
  await expect(page.locator('.group-grid', { hasText: '春季招募营' })).toBeVisible()
  // staff 不参与导生报名：upcoming 营（id21/id24）归「即将开始」组
  await expect(page.locator('.group-title').filter({ hasText: /^即将开始$/ })).toBeVisible()
  // 10 营全可见（状态机全覆盖，任何营不从中心消失）
  await expect(page.getByRole('button', { name: '进入营期' })).toHaveCount(10)

  // 工作台内同样预判：说明卡替代 CampJoin 表单（不再填完表单才吃 400）
  await page.goto(`${BASE}/camp?sid=22`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('管理员无需申请加入营期')).toBeVisible()
  await expect(page.getByText(/申请加入「春季招募营」/)).toHaveCount(0)

  expect(errors).toEqual([])
})

test('可报名：进工作台报名页选大组与到岗日并提交', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let joinPayload = null
  await loginAsUser(page)
  await page.route('http://127.0.0.1:5001/camp/sessions/22/join-request', (route) => {
    if (route.request().method() === 'POST' && !route.request().url().includes('cancel')) {
      joinPayload = route.request().postDataJSON()
      return route.fulfill({ json: { code: 200, message: '申请已提交，等待审批' } })
    }
    return route.fulfill({ json: { code: 200, message: '已撤回申请' } })
  })

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await page.locator('.camp-card', { hasText: '春季招募营' }).getByRole('button', { name: '进入营期' }).click()

  // 工作台内报名页：承诺到岗日（09-12 砍意向大组——组别随归属导生继承，报名不选组）
  await expect(page).toHaveURL(/sid=22/)
  await expect(page.getByText('申请加入「春季招募营」')).toBeVisible()
  await expect(page.locator('.field-label', { hasText: '意向大组' })).toHaveCount(0)

  // 校验链：未选到岗日 → 提示到岗日；选了天数即可提交
  await expect(page.getByRole('button', { name: '请先选择到岗日' })).toBeDisabled()
  await page.locator('.day-grid .pick-chip').nth(0).click()
  await page.locator('.day-grid .pick-chip').nth(1).click()
  await page.getByRole('button', { name: '提交申请（2 天）' }).click()

  await expect(page.getByText('申请已提交，等待审批')).toBeVisible()
  // 报名页转安静态
  await expect(page.getByText('申请待审核')).toBeVisible()

  // 回中心：待审核状态显示在卡片身份行（唯一位置，pending 跨视图共享）
  await page.locator('.back-center').click()
  await expect(page.locator('.camp-card', { hasText: '春季招募营' })
    .locator('.card-role', { hasText: '入营申请待审核' })).toBeVisible()

  // 再进营期撤回：待审核卡回到报名表单，可重新提交
  await page.locator('.camp-card', { hasText: '春季招募营' }).getByRole('button', { name: '进入营期' }).click()
  await page.getByRole('button', { name: '撤回申请' }).click()
  await expect(page.getByText('已撤回申请')).toBeVisible()
  await expect(page.getByText('申请加入「春季招募营」')).toBeVisible()

  // 契约：到岗日数组（无 preferred_tag 字段）
  expect(joinPayload).toBeTruthy()
  expect(joinPayload.selected_days).toHaveLength(2)
  expect(joinPayload).not.toHaveProperty('preferred_tag')

  expect(errors).toEqual([])
})

test('项目营报名：selecting 出示入营表单（无到岗日/大组）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page)

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await page.locator('.camp-card', { hasText: '秋季项目营' }).getByRole('button', { name: '进入营期' }).click()

  await expect(page).toHaveURL(/sid=26/)
  // v1.3 阶段3：项目营入营表单（考勤能力关→不收到岗日；无大组概念；09-13 入池改称入营）
  await expect(page.getByText('申请加入「秋季项目营」')).toBeVisible()
  await expect(page.getByRole('button', { name: '提交入营申请' })).toBeVisible()
  await expect(page.locator('.field-label', { hasText: '意向大组' })).toHaveCount(0)
  await expect(page.locator('.field-label', { hasText: '承诺到岗日' })).toHaveCount(0)

  expect(errors).toEqual([])
})

test('项目营申报：upcoming 出示申报表单（负责人入口）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, [
    {
      url: '/camp/projects/27/mine',
      json: { code: 200, applications: [], leading: [], joining: [],
              project_count: 0, project_limit: 3, remaining_slots: 3, can_apply: true },
    },
  ])

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await page.locator('.camp-card', { hasText: '明年春季项目营' }).getByRole('button', { name: '进入营期' }).click()

  await expect(page).toHaveURL(/sid=27/)
  // 申报期（upcoming）：申报入口卡 + 表单字段
  await expect(page.getByText('申报一个新项目')).toBeVisible()
  await expect(page.locator('.field-label', { hasText: '项目名称' })).toBeVisible()
  await expect(page.getByRole('button', { name: '提交申报' })).toBeDisabled()

  expect(errors).toEqual([])
})

test('项目营 running：项目进展——材料提交可见+直接评价（负责人）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  // running 项目营：负责人视角（09-14 复盘定：不走通过/退回审核，提交即全员可见，评价即验收；默认全展开）
  await loginAsUser(page, [
    {
      url: '/camp/projects/30/mine',
      json: { code: 200, applications: [], joining: [], leading: [
        { unit_id: 41, name: '智能输液监护', status: 'active', my_role: 'leader',
          leader_user_id: 61, leader_name: 'proj_leader', member_count: 3, my_pref_rank: null },
      ], project_count: 1, project_limit: null, remaining_slots: null, can_apply: false },
    },
    {
      url: '/camp/units/41/outcomes',
      json: { code: 200, outcomes: [
        { id: 7001, title: '样机一台', status: 'submitted', contributors: [] },
      ] },
    },
    {
      url: '/camp/projects/30/activities',
      json: { code: 200, units: [] },
    },
  ])

  // 里程碑读端点（内存态闭环：提交/切换/评价动作后回读带新状态）
  const evals = [
    { member_user_id: 62, member_name: '成员小张', score: 88, comment: '调研充分',
      leader_user_id: 61, updated_at: '2026-09-12 10:00' },
  ]
  const state = { ms501mode: 'team', ms501subs: [] }
  const membersJson = () => ({
    code: 200, my_role: 'leader',
    eval_members: [{ user_id: 62, username: '成员小张' }, { user_id: 63, username: '成员小李' }],
    milestones: [
      // 501：整队交付（leader 提交）——供提交盒/模式切换断言
      { id: 501, unit_id: 41, title: '开题调研', due_date: '2027-02-01', order_no: 1,
        submit_mode: state.ms501mode, status: 'open',
        submissions: state.ms501subs, evaluations: evals,
        member_count: 2, evaluated_count: evals.length, node_complete: evals.length >= 2 },
      // 502：个人交付（成员各交）——小张已交 v1（无审核动作，负责人直接看材料评价）
      { id: 502, unit_id: 41, title: '中期检查', due_date: null, order_no: 2,
        submit_mode: 'member', status: 'submitted',
        submissions: [
          { id: 801, milestone_id: 502, version: 1, submitted_by: 62, submitted_by_name: '成员小张',
            content: '调研报告初稿', status: 'submitted', review_note: null, reviewed_at: null,
            created_at: '2026-09-14T10:00:00',
            attachments: [{ id: 901, filename: 'report.pdf', size: 2048, is_asset: false }] },
        ],
        evaluations: [], member_count: 2, evaluated_count: 0, node_complete: false },
    ],
  })
  await page.route('**/camp/units/41/milestones', (route) => route.fulfill({ json: membersJson() }))
  const evalPut = page.waitForRequest((req) =>
    req.url().includes('/camp/milestones/501/evaluations/63') && req.method() === 'PUT')
  await page.route('**/camp/milestones/501/evaluations/63', (route) => {
    const body = route.request().postDataJSON()
    evals.push({ member_user_id: 63, member_name: '成员小李', score: body.score,
                 comment: body.comment, leader_user_id: 61, updated_at: '2026-09-14 21:00' })
    return route.fulfill({ json: { code: 200, message: '评价已保存', score: body.score } })
  })
  let submitBody = null
  await page.route('**/camp/milestones/501/submissions', (route) => {
    if (route.request().method() !== 'POST') {
      return route.fulfill({ json: { code: 200, submissions: state.ms501subs } })
    }
    submitBody = route.request().postData()?.toString() || ''
    return route.fulfill({ json: { code: 200, message: '已提交（第 1 版）' } })
  })

  await page.goto(`${BASE}/camp?sid=30`, { waitUntil: 'domcontentloaded' })
  // mine 异步加载前 view 先落「我参加的」，加载后不自动切换——显式切「我负责的」
  await page.getByRole('button', { name: '我负责的' }).click()
  await expect(page.locator('.project-board').getByText('智能输液监护')).toBeVisible()

  // 09-14 文案：「关键节点」→「项目进展」；节点默认全展开（不点 ms-head 直接见 ms-body）
  await expect(page.locator('.sec-title', { hasText: '项目进展' })).toBeVisible()
  await expect(page.locator('.sec-title', { hasText: '关键节点' })).toHaveCount(0)
  const row501 = page.locator('.ms-row', { hasText: '开题调研' })
  const row502 = page.locator('.ms-row', { hasText: '中期检查' })
  await expect(row501.locator('.ms-body')).toBeVisible()

  // 成员提交制：负责人全站无提交盒、无审核按钮、无交付模式标签/切换
  await expect(page.locator('.submit-box')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '通过', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '退回', exact: true })).toHaveCount(0)
  await expect(page.getByText('个人交付', { exact: true })).toHaveCount(0)
  await expect(page.getByText('整队交付', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /切换为/ })).toHaveCount(0)

  // 节点头状态：已交 x/y · 已评 a/b（502 小张已交 v1；501 无人交）
  await expect(row501.locator('.ms-status')).toContainText('已交 0/2 · 已评 1/2')
  await expect(row502.locator('.ms-status')).toContainText('已交 1/2 · 已评 0/2')

  // 交付材料：502 小张 v1（版本/「已提交」状态/说明/附件）在合框行内直接可见
  await expect(row502.locator('.chain-ver', { hasText: 'v1' })).toBeVisible()
  await expect(row502.locator('.chain-st', { hasText: '已提交' })).toBeVisible()
  await expect(row502.locator('.chain-content', { hasText: '调研报告初稿' })).toBeVisible()
  await expect(row502.locator('.att-link', { hasText: 'report.pdf' })).toBeVisible()

  // 交付与评价合框（09-14）：501 小张行=未提交链+88 分评价（修改）；小李行=未提交+「评价」按钮
  const zhang501 = row501.locator('.mem-row', { hasText: '成员小张' })
  const li501 = row501.locator('.mem-row', { hasText: '成员小李' })
  await expect(zhang501.getByText('88 分')).toBeVisible()
  await expect(zhang501.getByText('调研充分')).toBeVisible()
  await expect(zhang501.getByRole('button', { name: '修改' })).toBeVisible()
  await expect(li501.locator('.mem-nosub', { hasText: '未提交' })).toBeVisible()
  await li501.getByRole('button', { name: '评价' }).click()
  await page.locator('.eval-form input').first().fill('92')
  await page.locator('.eval-form textarea').fill('进步明显')
  await page.getByRole('button', { name: '保存评价' }).click()
  expect((await evalPut).postDataJSON()).toEqual({ score: 92, comment: '进步明显' })

  // 回读：2/2 评齐 → 节点已完成（501）
  await expect(row501.locator('.ms-status')).toContainText('已评 2/2')
  await expect(row501.locator('.ms-status')).toContainText('已完成')

  // 成果区
  await expect(page.getByText('样机一台')).toBeVisible()
  await expect(page.getByText('待核验', { exact: true })).toBeVisible()

  expect(errors).toEqual([])
  expect(submitBody).toBe(null)   // 负责人全程未触发提交
})

test('项目营 running：项目进展——成员提交/可见性/仅见本人评价', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, [
    {
      url: '/camp/projects/30/mine',
      json: { code: 200, applications: [], leading: [], joining: [
        { unit_id: 41, name: '智能输液监护', status: 'active', my_role: 'member',
          leader_user_id: 61, leader_name: 'proj_leader', member_count: 3, my_pref_rank: null },
      ], project_count: 1, project_limit: null, remaining_slots: null, can_apply: false },
    },
    {
      // 成员视角：submissions 只回自己的链（小张=62）；evaluations 只回本人行；
      // eval_members 空数组（成员端忽略）。501=整队交付（成员不可交）；502=个人交付（可交）
      url: '/camp/units/41/milestones',
      json: { code: 200, my_role: 'member', eval_members: [], milestones: [
        { id: 501, unit_id: 41, title: '开题调研', due_date: null, order_no: 1,
          submit_mode: 'team', status: 'open', submissions: [], evaluations: [
            { member_user_id: 62, member_name: '成员小张', score: 88, comment: '调研充分',
              leader_user_id: 61, updated_at: '2026-09-12 10:00' },
          ], member_count: 2, evaluated_count: 1, node_complete: false },
        { id: 502, unit_id: 41, title: '中期检查', due_date: null, order_no: 2,
          submit_mode: 'member', status: 'submitted', submissions: [
            { id: 801, milestone_id: 502, version: 1, submitted_by: 62,
              submitted_by_name: '成员小张', content: '我的调研初稿', status: 'submitted',
              review_note: null, reviewed_at: null, created_at: '2026-09-14T10:00:00',
              attachments: [] },
          ], evaluations: [], member_count: 2, evaluated_count: 0, node_complete: false },
      ] },
    },
    {
      url: '/camp/units/41/outcomes',
      json: { code: 200, outcomes: [] },
    },
    {
      url: '/camp/projects/30/activities',
      json: { code: 200, units: [] },
    },
  ])

  await page.goto(`${BASE}/camp?sid=30`, { waitUntil: 'domcontentloaded' })
  // 节点头（默认全展开）：提交状态 + 评价信息（成员提交制：已提交/未提交）；无评价按钮
  const row501 = page.locator('.ms-row', { hasText: '开题调研' })
  const row502 = page.locator('.ms-row', { hasText: '中期检查' })
  await expect(row501.locator('.ms-status')).toContainText('未提交')
  await expect(row501.locator('.ms-status')).toContainText('我的评价 88 分')
  await expect(row502.locator('.ms-status')).toContainText('已提交')
  await expect(row502.locator('.ms-status')).toContainText('待评价')

  // 成员提交制：两节点都有提交盒（501 存量 team 模式节点照样可交——submit_mode 不再门禁）
  await expect(page.locator('.submit-box')).toHaveCount(2)
  // 502 仅见自己的链（1 行，带「已提交」状态）且无审核按钮
  await expect(row502.locator('.chain-item')).toHaveCount(1)
  await expect(row502.locator('.chain-st', { hasText: '已提交' })).toBeVisible()
  await expect(row502.locator('.chain-content', { hasText: '我的调研初稿' })).toBeVisible()
  await expect(page.getByRole('button', { name: '通过', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '退回', exact: true })).toHaveCount(0)

  // 评价自见：仅本人分数与评语；无评价/切换入口
  await expect(page.locator('.eval-self').getByText('88 分')).toBeVisible()
  await expect(page.locator('.eval-self').getByText('调研充分')).toBeVisible()
  await expect(page.getByRole('button', { name: '评价', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /切换为/ })).toHaveCount(0)

  expect(errors).toEqual([])
})

test('导生可报名：LV≥2 进营期自由报名导生，可撤回重报', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, [
    {
      url: '/camp/sessions/21/mentor-registration',
      json: { code: 200, message: '报名已提交，管理员审核通过后即可布置导生名片' },
    },
    {
      url: '/camp/sessions/21/join-request/cancel',
      json: { code: 200, message: '已撤回申请' },
    },
  ], 'user', 4)

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await page.locator('.camp-card', { hasText: '秋季导生营' }).getByRole('button', { name: '进入营期' }).click()

  // 工作台内导生报名卡（LV≥2 窗口内自由报名，资格名单已退役），提交后转待审核安静态
  await expect(page).toHaveURL(/sid=21/)
  await expect(page.getByText('报名成为本营导生')).toBeVisible()
  await page.getByRole('button', { name: '报名成为导生' }).click()

  await expect(page.getByText('报名已提交，管理员审核通过后即可布置导生名片')).toBeVisible()
  await expect(page.getByText('导生报名待审核')).toBeVisible()

  // 撤回：回到可提交态（手滑可反悔）
  await page.getByRole('button', { name: '撤回报名' }).click()
  await expect(page.getByText('已撤回申请')).toBeVisible()
  await expect(page.getByRole('button', { name: '报名成为导生' })).toBeVisible()

  // 回中心：身份行回到「可报导生」
  await page.locator('.back-center').click()
  await expect(page.locator('.camp-card', { hasText: '秋季导生营' })
    .locator('.card-role', { hasText: '可报导生' })).toBeVisible()

  expect(errors).toEqual([])
})

test('中心↔工作台：顶部入口和工作台返回均收敛到中心', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page)

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await page.locator('.camp-card', { hasText: '进行中的营' }).getByRole('button', { name: '进入营期' }).click()

  // 工作台：hero 标题 + sid 进 URL；不再渲染重复的「我的营期」侧栏
  await expect(page.locator('.hero-title', { hasText: '进行中的营' })).toBeVisible()
  await expect(page).toHaveURL(/sid=1/)
  await expect(page.locator('.camp-aside')).toHaveCount(0)

  // 顶部营期入口始终返回中心，不保留具体营期 sid
  await page.locator('.camp-nav-item').click()
  await expect(page.getByRole('heading', { name: '营期中心' })).toBeVisible()
  await expect(page).not.toHaveURL(/sid=/)

  // 从中心重新进入工作台，内容区返回操作同样回到中心
  await page.locator('.camp-card', { hasText: '进行中的营' }).getByRole('button', { name: '进入营期' }).click()
  await page.locator('.back-center').click()
  await expect(page.getByRole('heading', { name: '营期中心' })).toBeVisible()
  await expect(page).not.toHaveURL(/sid=/)

  expect(errors).toEqual([])
})

test('学习方向卡：多课程认证进度/评分 + 章节材料提交三件套', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  // 材料端点 mock 须走 extraMocks：loginAsUser 兜底分支会吞掉 /camp/sessions/*/materials 的 GET
  const mats = [
    { id: 9, course_id: 7, chapter_id: 11, student_user_id: 62,
      content: '点灯实验记录：电阻 220Ω', created_at: '2026-09-14T10:00:00',
      attachments: [{ id: 19, filename: 'led.png', size: 1536 }] },
  ]
  await loginAsUser(page, [
    {
      // id 23 暑期双选营（成员学员视角）：方向制卡（09-12；09-13 多课+评分，取代原选课 tab）
      url: '/camp/sessions/23/my-direction',
      json: {
        code: 200, direction: '硬件组', mentor_name: '导生阿明',
        courses: [
          { course_id: 7, course_title: '嵌入式入门', difficulty: 2,
            chapters: [
              { chapter_id: 11, name: 'GPIO 点灯', lessons: 3, lessons_completed: 3, certified: true, certified_at: '2026-09-12 10:00', score: 88, material_count: 1 },
              { chapter_id: 12, name: '串口通信', lessons: 4, lessons_completed: 2, certified: false, certified_at: null, score: null, material_count: 0 },
            ],
            certified_chapters: 1, total_chapters: 2, score_avg: 88, course_status: 'active' },
          { course_id: 8, course_title: '电路基础', difficulty: 1,
            chapters: [
              { chapter_id: 21, name: '欧姆定律', lessons: 2, lessons_completed: 2, certified: true, certified_at: '2026-09-12 11:00', score: 90, material_count: 0 },
            ],
            certified_chapters: 1, total_chapters: 1, score_avg: 90, course_status: 'completed' },
        ],
      },
    },
    {
      url: '/camp/sessions/23/materials',
      json: { code: 200, materials: mats },
    },
  ])

  await page.goto(`${BASE}/camp?tab=study&sid=23`, { waitUntil: 'domcontentloaded' })

  // 方向 + 双课程块（各课认证进度/均分/完成态；选课 tab 已砍：无「选课」入口）
  await expect(page.getByText('硬件组', { exact: true })).toBeVisible()
  await expect(page.getByText('2 门课程')).toBeVisible()
  await expect(page.getByText('随归属导生（导生阿明）继承')).toBeVisible()
  const embedded = page.locator('.course-block', { hasText: '嵌入式入门' })
  await expect(embedded.getByText(/章节认证 1\/2 · 均分 88/)).toBeVisible()
  const gpioRow = embedded.locator('.chapter-row', { hasText: 'GPIO 点灯' })
  await expect(gpioRow.getByText('已认证（88 分）')).toBeVisible()
  await expect(embedded.locator('.chapter-row', { hasText: '串口通信' }).getByText('未认证')).toBeVisible()
  const circuit = page.locator('.course-block', { hasText: '电路基础' })
  await expect(circuit.getByText(/章节认证 1\/1 · 均分 90/)).toBeVisible()
  await expect(circuit.getByText('已完成')).toBeVisible()
  await expect(page.getByRole('button', { name: '选课' })).toHaveCount(0)

  // ── 章节材料（09-14）：chip 计数 → 展开 → 已有材料与附件 → 提交 → 删除 ──
  await expect(gpioRow.locator('.mat-chip', { hasText: '材料 1' })).toBeVisible()
  await gpioRow.locator('.mat-chip').click()
  const matPanel = page.locator('.mat-panel')
  await expect(matPanel.getByText('点灯实验记录：电阻 220Ω')).toBeVisible()
  const att = matPanel.locator('.att-link', { hasText: 'led.png' })
  await expect(att).toBeVisible()
  await expect(att).toHaveAttribute('href', /\/camp\/materials\/attachments\/19$/)

  // 提交：说明 + 附件 → multipart（chapter_id + content + Files）
  let submitBody = ''
  await page.route('**/camp/sessions/23/materials', (route) => {
    if (route.request().method() !== 'POST') {
      return route.fulfill({ json: { code: 200, materials: mats } })
    }
    submitBody = route.request().postData()?.toString() || ''
    mats.push({ id: 10, course_id: 7, chapter_id: 11, student_user_id: 62,
      content: '串口波形截图说明', created_at: '2026-09-14T21:00:00',
      attachments: [{ id: 20, filename: 'uart.png', size: 2048 }] })
    return route.fulfill({ json: { code: 200, message: '材料已提交' } })
  })
  await matPanel.locator('textarea').fill('串口波形截图说明')
  await matPanel.locator('input[type=file]')
    .setInputFiles({ name: 'uart.png', mimeType: 'image/png', buffer: Buffer.from('png-bytes') })
  await matPanel.getByRole('button', { name: '提交材料' }).click()
  await expect(matPanel.getByText('串口波形截图说明')).toBeVisible()
  expect(submitBody).toContain('chapter_id')
  expect(submitBody).toContain('11')
  expect(submitBody).toContain('串口波形截图说明')
  expect(submitBody).toContain('uart.png')

  // 删除（ElMessageBox 确认后 DELETE）→ 列表回落
  let deleted = false
  await page.route('**/camp/materials/10', (route) => {
    deleted = route.request().method() === 'DELETE'
    mats.splice(1, 1)
    return route.fulfill({ json: { code: 200, message: '已删除' } })
  })
  await matPanel.locator('.mat-row', { hasText: '串口波形截图说明' })
    .getByRole('button', { name: '删除' }).click()
  await page.locator('.el-message-box').getByRole('button', { name: '删除' }).click()
  await expect(matPanel.getByText('串口波形截图说明')).toHaveCount(0)
  expect(deleted).toBe(true)

  // 去学习（第一门课）：跳课程详情（from=camp 返回时回学习方向 tab）
  await embedded.getByRole('button', { name: '去学习' }).click()
  await expect(page).toHaveURL(/\/study\/details\?id=7&from=camp/)

  expect(errors).toEqual([])
})

test('周考模式：学期校区营报名不收承诺日（按周累计）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let joinPayload = null
  await loginAsUser(page)
  await page.route('http://127.0.0.1:5001/camp/sessions/28/join-request', (route) => {
    if (route.request().method() === 'POST' && !route.request().url().includes('cancel')) {
      joinPayload = route.request().postDataJSON()
      return route.fulfill({ json: { code: 200, message: '申请已提交，等待审批' } })
    }
    return route.fulfill({ json: { code: 200, message: '已撤回申请' } })
  })

  await page.goto(`${BASE}/camp?sid=28`, { waitUntil: 'domcontentloaded' })

  // 09-12 三模式：attendance_mode=weekly（学期校区）——报名表单无承诺到岗日节，可直接提交
  await expect(page.getByText('申请加入「学期周考营」')).toBeVisible()
  await expect(page.locator('.field-label', { hasText: '承诺到岗日' })).toHaveCount(0)
  const submit = page.getByRole('button', { name: '提交申请', exact: true })
  await expect(submit).toBeEnabled()
  await submit.click()

  await expect(page.getByText('申请已提交，等待审批')).toBeVisible()
  expect(joinPayload).toBeTruthy()
  expect(joinPayload.selected_days).toEqual([])
  expect(joinPayload).not.toHaveProperty('preferred_tag')

  expect(errors).toEqual([])
})
