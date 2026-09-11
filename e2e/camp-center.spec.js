import { test, expect } from '@playwright/test'

// 营期中心（/camp 无 sid 时的工作台首页）：分组卡片 / 工作台内报名（选组+到岗日）/ 导生报名 / 中心↔工作台切换
// mock 后端数据，零依赖真实库；契约对齐后端 session_list（is_member/my_role/has_eligibility）

const BASE = 'http://127.0.0.1:18081/AMEII'

// 覆盖五个分组 + 项目营报名占位：待我处理(资格内待开放) / 可报名(选择阶段) / 我的营期 / 即将开始 / 历史
const SESSIONS = {
  code: 200,
  sessions: [
    { id: 21, name: '秋季导生营', category: 'learning', cycle_name: '2026 秋季',
      start_date: '2027-01-11', end_date: '2027-02-11', status: 'upcoming',
      is_member: false, my_role: null, has_eligibility: true, member_count: 0,
      mentor_selection_enabled: false },
    { id: 22, name: '春季招募营', category: 'learning', cycle_name: '2027 春季',
      start_date: '2027-03-01', end_date: '2027-03-31', status: 'selecting',
      is_member: false, my_role: null, has_eligibility: false, member_count: 3,
      weekdays_only: true, mentor_selection_enabled: false,
      ms_tags: ['软件组', '硬件组'] },
    { id: 23, name: '暑期双选营', category: 'learning', cycle_name: '2026 暑期',
      start_date: '2026-08-26', end_date: '2026-09-30', status: 'selecting',
      is_member: true, my_role: 'student', has_eligibility: false, member_count: 8,
      mentor_selection_enabled: true },
    { id: 1, name: '进行中的营', category: 'learning', cycle_name: '2026 暑期',
      start_date: '2026-08-26', end_date: '2026-09-30', status: 'running',
      is_member: true, my_role: 'student', has_eligibility: false, member_count: 5,
      mentor_selection_enabled: false },
    { id: 24, name: '明年暑期营', category: 'learning', cycle_name: '2027 暑期',
      start_date: '2027-07-01', end_date: '2027-08-31', status: 'upcoming',
      is_member: false, my_role: null, has_eligibility: false, member_count: 0,
      mentor_selection_enabled: false },
    { id: 25, name: '去年寒假营', category: 'learning', cycle_name: '2026 寒假',
      start_date: '2026-01-10', end_date: '2026-02-10', status: 'archived',
      is_member: true, my_role: 'student', has_eligibility: false, member_count: 12,
      mentor_selection_enabled: false },
    { id: 26, name: '秋季项目营', category: 'project', cycle_name: '2026 秋季',
      start_date: '2027-01-11', end_date: '2027-02-11', status: 'selecting',
      is_member: false, my_role: null, has_eligibility: false, member_count: 0,
      mentor_selection_enabled: false, ms_tags: [] },
  ],
}

async function loginAsUser(page, extraMocks = [], role = 'user') {
  await page.addInitScript((r) => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: r }, checkinInfo: {},
    }))
  }, role)
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
  await loginAsUser(page)

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: '营期中心' })).toBeVisible()

  // 五个分组标题齐备（空组隐藏，本例全覆盖）
  for (const title of ['待我处理', '可报名', '我的营期', '即将开始', '历史营期']) {
    await expect(page.locator('.group-title', { hasText: title })).toBeVisible()
  }
  // 卡片一致性：入口按钮统一为「进入营期」，每张卡恰一个（7 营全可见 = 7 个）；
  // 报名等动作不在中心做，全部进营期工作台完成
  await expect(page.getByRole('button', { name: '进入营期' })).toHaveCount(7)
  await expect(page.getByRole('button', { name: '去报名' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '报名成为导生' })).toHaveCount(0)
  // 身份/报名状态只显示在身份行一处
  await expect(page.locator('.card-role', { hasText: '资格名单内' })).toBeVisible()
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
  // 后端对管理员报名一律 400：中心预判隐藏「可报名」组（少 id22/id26 两卡 → 5 个入口）
  await expect(page.locator('.group-title', { hasText: '可报名' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '进入营期' })).toHaveCount(5)

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

  // 工作台内报名页：意向大组 + 承诺到岗日
  await expect(page).toHaveURL(/sid=22/)
  await expect(page.getByText('申请加入「春季招募营」')).toBeVisible()
  await expect(page.locator('.field-label', { hasText: '意向大组' })).toBeVisible()

  // 校验链：未选到岗日 → 提示到岗日；选了天数未选组 → 提示选组；补选组后可提交
  await expect(page.getByRole('button', { name: '请先选择到岗日' })).toBeDisabled()
  await page.locator('.day-grid .pick-chip').nth(0).click()
  await page.locator('.day-grid .pick-chip').nth(1).click()
  await expect(page.getByRole('button', { name: '请先选择意向大组' })).toBeDisabled()
  await page.locator('.tag-row .pick-chip', { hasText: '软件组' }).click()
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

  // 契约：到岗日数组 + 意向大组
  expect(joinPayload).toBeTruthy()
  expect(joinPayload.selected_days).toHaveLength(2)
  expect(joinPayload.preferred_tag).toBe('软件组')

  expect(errors).toEqual([])
})

test('项目营报名：工作台出示占位卡（机制阶段3开放）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page)

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await page.locator('.camp-card', { hasText: '秋季项目营' }).getByRole('button', { name: '进入营期' }).click()

  await expect(page).toHaveURL(/sid=26/)
  await expect(page.getByText('项目营报名即将开放')).toBeVisible()
  // 不出现学习营报名表单
  await expect(page.locator('.field-label', { hasText: '意向大组' })).toHaveCount(0)

  expect(errors).toEqual([])
})

test('待我处理：进营期后报名成为导生，可撤回重报', async ({ page }) => {
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
  ])

  await page.goto(`${BASE}/camp`, { waitUntil: 'domcontentloaded' })
  await page.locator('.camp-card', { hasText: '秋季导生营' }).getByRole('button', { name: '进入营期' }).click()

  // 工作台内导生报名卡（资格名单内可见），提交后转待审核安静态
  await expect(page).toHaveURL(/sid=21/)
  await expect(page.getByText('你已在「秋季导生营」的导生资格名单内')).toBeVisible()
  await page.getByRole('button', { name: '报名成为导生' }).click()

  await expect(page.getByText('报名已提交，管理员审核通过后即可布置导生名片')).toBeVisible()
  await expect(page.getByText('报名待审核')).toBeVisible()

  // 撤回：回到可提交态（手滑可反悔）
  await page.getByRole('button', { name: '撤回报名' }).click()
  await expect(page.getByText('已撤回申请')).toBeVisible()
  await expect(page.getByRole('button', { name: '报名成为导生' })).toBeVisible()

  // 回中心：身份行回到「资格名单内」
  await page.locator('.back-center').click()
  await expect(page.locator('.camp-card', { hasText: '秋季导生营' })
    .locator('.card-role', { hasText: '资格名单内' })).toBeVisible()

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
