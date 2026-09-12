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
  // 后端对管理员报名一律 400：中心预判隐藏「可报名」组（id22/26/28 三卡不显示 → 7 个入口）
  await expect(page.locator('.group-title', { hasText: '可报名' })).toHaveCount(0)
  // staff 不参与导生报名：upcoming 营（id21/id24）归「即将开始」组
  await expect(page.locator('.group-title').filter({ hasText: /^即将开始$/ })).toBeVisible()
  await expect(page.getByRole('button', { name: '进入营期' })).toHaveCount(7)

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

test('项目营报名：selecting 出示入池表单（无到岗日/大组）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page)

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await page.locator('.camp-card', { hasText: '秋季项目营' }).getByRole('button', { name: '进入营期' }).click()

  await expect(page).toHaveURL(/sid=26/)
  // v1.3 阶段3：项目营入池表单（考勤能力关→不收到岗日；无大组概念）
  await expect(page.getByText('申请加入「秋季项目营」')).toBeVisible()
  await expect(page.getByRole('button', { name: '提交入池申请' })).toBeVisible()
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

test('项目营 running：交付节点时间轴与版本链（阶段4）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  // running 项目营：成员视角，参与 1 个项目（unit 41），两个交付节点
  await loginAsUser(page, [
    {
      url: '/camp/projects/30/mine',
      json: { code: 200, applications: [], leading: [], joining: [
        { unit_id: 41, name: '智能输液监护', status: 'active', my_role: 'member',
          leader_user_id: 61, leader_name: 'proj_leader', member_count: 4, my_pref_rank: null },
      ], project_count: 1, project_limit: 3, remaining_slots: 2, can_apply: false },
    },
    {
      url: '/camp/units/41/milestones',
      json: { code: 200, my_role: 'member', milestones: [
        { id: 501, unit_id: 41, title: '开题调研', submit_mode: 'team', status: 'approved',
          due_date: '2027-02-01', order_no: 1, submissions: [] },
        { id: 502, unit_id: 41, title: '个人周报', submit_mode: 'member', status: 'returned',
          due_date: null, order_no: 2, submissions: [
            { id: 9001, milestone_id: 502, version: 1, submitted_by: 62, content: '第一周',
              status: 'returned', review_note: '写详细些', attachments: [], created_at: '2026-09-10T10:00:00' },
          ] },
      ] },
    },
    {
      url: '/camp/units/41/outcomes',
      json: { code: 200, outcomes: [
        { id: 7001, title: '样机一台', status: 'submitted', contributors: [] },
      ] },
    },
  ])

  await page.goto(`${BASE}/camp?sid=30&tab=project`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('我参与的项目')).toBeVisible()
  await page.locator('.deliver-head', { hasText: '智能输液监护' }).click()

  // 节点行：状态聚合 + 双模式标签
  await expect(page.locator('.ms-row', { hasText: '开题调研' }).locator('.ms-status')).toHaveText('已通过')
  await expect(page.locator('.ms-row', { hasText: '个人周报' }).locator('.ms-status')).toHaveText('已退回')
  // 展开 member 节点：版本链 + 退回意见 + 个人重提入口
  await page.locator('.ms-head', { hasText: '个人周报' }).click()
  await expect(page.getByText('v1', { exact: true })).toBeVisible()
  await expect(page.getByText('审核意见：写详细些')).toBeVisible()
  await expect(page.locator('.ms-row', { hasText: '个人周报' }).getByRole('button', { name: '重提新版本' })).toBeVisible()
  // team 节点已验收：成员看到节点关闭而非提交框（整队交付由负责人统一提交）
  await page.locator('.ms-head', { hasText: '开题调研' }).click()
  await expect(page.locator('.ms-row', { hasText: '开题调研' }).getByText('已验收通过，节点关闭')).toBeVisible()
  await expect(page.locator('.ms-row', { hasText: '开题调研' }).getByRole('button', { name: '提交' })).toHaveCount(0)
  // 成果区
  await expect(page.getByText('样机一台')).toBeVisible()
  await expect(page.getByText('待核验', { exact: true })).toBeVisible()

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

test('学习方向卡：学员查看随导生继承的方向课程与章节认证进度', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, [
    {
      // id 23 暑期双选营（成员学员视角）：方向制卡（09-12，取代原选课 tab）
      url: '/camp/sessions/23/my-direction',
      json: {
        code: 200, direction: '硬件组', mentor_name: '导生阿明',
        course: { course_id: 7, title: '嵌入式入门', difficulty: 2 },
        chapters: [
          { chapter_id: 11, name: 'GPIO 点灯', lessons: 3, lessons_completed: 3, certified: true, certified_at: '2026-09-12 10:00' },
          { chapter_id: 12, name: '串口通信', lessons: 4, lessons_completed: 2, certified: false, certified_at: null },
        ],
        certified_chapters: 1, total_chapters: 2, course_status: 'active',
      },
    },
  ])

  await page.goto(`${BASE}/camp?tab=study&sid=23`, { waitUntil: 'domcontentloaded' })

  // 方向 + 课程 + 认证进度（选课 tab 已砍：无「选课」入口）
  await expect(page.getByText('硬件组', { exact: true })).toBeVisible()
  await expect(page.getByText('嵌入式入门')).toBeVisible()
  await expect(page.getByText(/章节认证 1\/2/)).toBeVisible()
  await expect(page.getByText('随归属导生（导生阿明）继承')).toBeVisible()
  await expect(page.locator('.chapter-row', { hasText: 'GPIO 点灯' }).getByText('已认证')).toBeVisible()
  await expect(page.locator('.chapter-row', { hasText: '串口通信' }).getByText('未认证')).toBeVisible()
  await expect(page.getByRole('button', { name: '选课' })).toHaveCount(0)

  // 去学习：跳课程详情（from=camp 返回时回学习方向 tab）
  await page.getByRole('button', { name: '去学习' }).click()
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
