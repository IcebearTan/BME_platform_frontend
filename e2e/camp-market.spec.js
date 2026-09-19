import { test, expect } from '@playwright/test'

// 团购导生市集（/camp/:sid/market）+ ms tab 状态机：mock 后端数据，零依赖真实库
// 规范见 docs/营期模块-设计与IA规范.md §1.2 例外 / §2.4

const BASE = 'http://127.0.0.1:18081/AMEII'

// 200 字上限内的长留言（真实场景：导生端列表单行放不下，需"展开"看全文）
const LONG_NOTE = '想加入硬件组学习嵌入式开发。此前自学过 C 语言与数字电路，做过流水灯、按键消抖和串口通信的小实验，也在面包板上搭过 51 的最小系统。这次营期希望能跟着您系统学习 STM32，从原理图、PCB 打样到固件调试完整走一遍，做出第一个能拿得出手的实物项目。我时间充裕，愿意投入，也乐于帮同学排查问题，期待有机会加入您的队伍。'

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

// 导生视角的同一营：my_role=mentor（身份解耦后工作台分流读营内角色，不看全局 role）
const SESSIONS_MENTOR = {
  ...SESSIONS,
  sessions: [{ ...SESSIONS.sessions[0], my_role: 'mentor' }],
}

const DEADLINES = {
  preference_start: '2099-08-24 00:00', preference_deadline: '2099-08-24 23:00',
}

const MENTORS = {
  mentors: [
    { user_id: 13, username: 'test_mentor', photo_url: '/camp/ms/photo/test.svg', avatar: null,
      capacity: 8, matched: 7, remaining: 1, full: false, tags: ['硬件组'], bio: '搞硬件的，项目资料：https://example.com/mentor-kit。' },
    { user_id: 20, username: '满员导生', photo_url: null, avatar: null,
      capacity: 3, matched: 3, remaining: 0, full: true, tags: ['软件组'], bio: '' },
    { user_id: 21, username: '软件导生', photo_url: null, avatar: null,
      capacity: null, matched: 2, remaining: null, full: false, tags: ['软件组'], bio: '一起做真实项目' },   // capacity null=不限（09-11 契约）
    { user_id: 22, username: 'AI导生', photo_url: null, avatar: null,
      capacity: 4, matched: 1, remaining: 3, full: false, tags: ['人工智能'], bio: '让数据真正帮助人' },
  ],
}

function phaseOf(phase, me = {}) {
  // 单轮制契约：phase ∈ disabled/upcoming/collecting/done；round2 键恒空/false
  return {
    code: 200, phase, enabled: true, config_error: false, results_released: false,
    deadlines: DEADLINES, round2_enabled: false, ms_tags: ['硬件组', '软件组', '人工智能'],
    stats: { submitted: 2, students: 4 },
    me: {
      role: 'student', round1: [], round2: [], submittable_round: null,
      unmatched: true, my_mentor: null, ...me,
    },
  }
}

async function loginAsUser(page, phase, role = 'user', extraMocks = []) {
  const favorites = new Set()
  // 1) 预置登录态：token 键 + vuex 持久化键（两级角色恒 'user'；导生/学员视角由 SESSIONS.my_role 驱动）
  await page.addInitScript((r) => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: r }, checkinInfo: {},
    }))
  }, role)
  // 2) 拦截全部后端请求：camp 接口按需给真形数据，其余统一 200 空数据
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    for (const hit of extraMocks) {
      if (url.includes(hit.url)) return route.fulfill({ json: hit.json })
    }
    if (url.includes('/camp/ms/1/favorites')) {
      const id = Number(url.split('/').pop())
      if (route.request().method() === 'PUT') favorites.add(id)
      if (route.request().method() === 'DELETE') favorites.delete(id)
      return route.fulfill({ json: { code: 200, mentor_ids: [...favorites], mentor_id: id, favorited: favorites.has(id) } })
    }
    if (url.includes('/camp/ms/photo/test.svg')) {
      return route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#d8ebff"/><text x="200" y="260" text-anchor="middle" font-size="64">TEST</text></svg>',
      })
    }
    if (url.includes('/camp/sessions') && !url.includes('/camp/ms')) {
      return route.fulfill({ json: SESSIONS })
    }
    if (url.includes('/camp/ms/1/phase')) {
      return route.fulfill({ json: phase })
    }
    if (url.includes('/camp/ms/1/mentors')) {
      return route.fulfill({ json: MENTORS })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

async function loginAsStudent(page, phase) {
  await loginAsUser(page, phase, 'user')
}

test('市集营业：collecting 可逛可收志愿', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStudent(page, phaseOf('collecting', { submittable_round: 1 }))

  await page.goto(`${BASE}/camp/1/market`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.poster-art img')).toBeVisible()
  await expect(page.locator('.live-ticker')).toContainText('截止时间：')
  await expect(page.locator('.market-count')).toHaveText(/4 位导生共 4 位/)
  const allWidth = await page.getByRole('button', { name: '全部', exact: true }).evaluate(element => element.getBoundingClientRect().width)
  await page.getByRole('button', { name: '软件组', exact: true }).click()
  await expect(page.locator('.market-count')).toHaveText(/2 位导生共 4 位/)
  await expect.poll(() => page.getByRole('button', { name: '全部', exact: true }).evaluate(element => element.getBoundingClientRect().width)).toBe(allWidth)
  await page.getByRole('button', { name: '全部', exact: true }).click()
  await expect(page.getByRole('button', { name: '查看完整活动海报' })).toHaveCount(0)
  await page.getByRole('button', { name: '选导生规则' }).click()
  await expect(page.getByRole('dialog')).toContainText('按你最想去的顺序排列志愿，可选 1 到 3 位，不必选满。')
  await expect(page.getByRole('dialog')).toContainText('修改时整组替换志愿，以最后一次提交为准。')
  await page.keyboard.press('Escape')
  await expect(page.getByText('可带 8 人', { exact: true })).toBeVisible()
  const cardBioLink = page.locator('.market-grid .bio').getByRole('link', { name: 'https://example.com/mentor-kit' })
  await expect(cardBioLink).toHaveAttribute('href', 'https://example.com/mentor-kit')
  await expect(cardBioLink).toHaveAttribute('target', '_blank')
  await expect(cardBioLink).toHaveAttribute('rel', 'noopener noreferrer')
  await expect(page.getByText('名额不限', { exact: true })).toBeVisible()
  await expect(page.locator('.bio').filter({ hasText: '这位导生有点神秘，先看看标签吧~~' })).not.toHaveClass(/is-multiline/)
  await expect(page.getByText(/已经有.*位同学上车/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: '满员导生 名额已满' })).toBeDisabled()
  await page.getByRole('button', { name: '收藏 软件导生', exact: true }).click()
  await expect(page.locator('.market-grid .name').first()).toHaveText('软件导生')
  await page.reload()
  await expect(page.getByRole('button', { name: '取消收藏 软件导生', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.market-grid .name').first()).toHaveText('软件导生')
  await page.getByRole('button', { name: '取消收藏 软件导生', exact: true }).click()
  await expect(page.locator('.market-grid .name').first()).toHaveText('test_mentor')
  await page.route('**/camp/ms/1/favorites/21', route => route.fulfill({ status: 503, json: { message: '收藏服务暂不可用' } }))
  await page.getByRole('button', { name: '收藏 软件导生', exact: true }).click()
  await expect(page.getByText('收藏服务暂不可用', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '收藏 软件导生', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await page.unroute('**/camp/ms/1/favorites/21')
  await expect(page.locator('.ms-tray-wrap')).toHaveClass(/is-docked/)
  await expect(page.getByRole('button', { name: '查看志愿' })).toBeVisible()
  await page.getByRole('button', { name: '查看志愿' }).click()
  await expect(page.locator('.tray-card')).toBeInViewport()
  await page.locator('.ms-tray-anchor').scrollIntoViewIfNeeded()
  await expect(page.locator('.ms-tray-wrap')).not.toHaveClass(/is-docked/)

  await page.getByRole('button', { name: '查看 test_mentor 的展示图片' }).click()
  await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.el-image-viewer__wrapper')).toBeHidden()

  // 加入志愿 → 托盘计数变化
  await page.getByRole('button', { name: '查看 test_mentor 的完整介绍' }).click()
  const detail = page.getByRole('dialog')
  await expect(detail.locator('.detail-bio')).toHaveText('搞硬件的，项目资料：https://example.com/mentor-kit。')
  await expect(detail.getByRole('link', { name: 'https://example.com/mentor-kit' })).toHaveAttribute('href', 'https://example.com/mentor-kit')
  await detail.getByRole('button', { name: '加入心仪导生 test_mentor' }).click()
  await expect(detail.getByText('已选为第 1 志愿')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText('我的心仪导生（1/3）')).toBeVisible()
  await expect(page.getByRole('button', { name: '移除 test_mentor' })).toBeVisible()
  await expect(page.getByRole('button', { name: /移出志愿/ })).toHaveCount(0)

  expect(errors).toEqual([])
})

test('心仪导生栏：左右排序、叉号删除与志愿数 1-3 约束', async ({ page }) => {
  await loginAsStudent(page, phaseOf('collecting', { submittable_round: 1 }))
  await page.goto(`${BASE}/camp/1/market`, { waitUntil: 'domcontentloaded' })

  const submit = page.getByRole('button', { name: '提交志愿' })
  await expect(submit).toBeDisabled()
  await page.getByRole('button', { name: '加入心仪导生 test_mentor' }).click()
  await page.getByRole('button', { name: '加入心仪导生 软件导生' }).click()
  await page.getByRole('button', { name: '加入心仪导生 AI导生' }).click()
  await expect(submit).toBeEnabled()

  const trayBox = await page.locator('.tray-card').boundingBox()
  expect(trayBox.height).toBeLessThan(140)

  await page.getByRole('button', { name: '将 test_mentor 右移' }).click()
  await expect(page.locator('.tray-item .item-name')).toHaveText(['软件导生', 'test_mentor', 'AI导生'])
  await page.getByRole('button', { name: '移除 test_mentor' }).click()
  await expect(page.getByText('我的心仪导生（2/3）')).toBeVisible()
  // 09-12 放宽：1-3 个志愿均可提交，不满三个不再禁用（0 个仍禁）
  await expect(submit).toBeEnabled()
  await page.getByRole('button', { name: '移除 软件导生' }).click()
  await page.getByRole('button', { name: '移除 AI导生' }).click()
  await expect(submit).toBeDisabled()
})

test('未交志愿：ms tab 大 CTA 直达市集', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStudent(page, phaseOf('collecting', { submittable_round: 1 }))

  await page.goto(`${BASE}/camp?tab=ms&sid=1`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('去逛导生市集，提交你的心仪志愿')).toBeVisible()
  await page.getByRole('button', { name: '进入团购导生' }).click()
  await expect(page).toHaveURL(/\/camp\/1\/market$/)
  await expect(page.locator('.poster-art img')).toBeVisible()

  expect(errors).toEqual([])
})

test('已交志愿：ms tab 回显志愿与再逛逛入口', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStudent(page, phaseOf('collecting', {
    submittable_round: 1,
    round1: [{ mentor_id: 13, note: '想学硬件' }],
  }))

  await page.goto(`${BASE}/camp?tab=ms&sid=1`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('已提交 1 个志愿 · 截止前可在市集整组修改')).toBeVisible()
  await expect(page.getByText('test_mentor')).toBeVisible()
  await expect(page.getByText('“想学硬件”')).toBeVisible()
  await expect(page.getByRole('button', { name: '再逛逛 · 修改志愿' })).toBeVisible()

  expect(errors).toEqual([])
})

test('结果门禁：收集期与协调期隐藏导生结果，正式发布后才展示', async ({ page }) => {
  const leakedMatch = {
    round1: [{ mentor_id: 13, note: '想学硬件' }],
    unmatched: false,
    my_mentor: { user_id: 13, username: 'test_mentor' },
  }

  await loginAsStudent(page, phaseOf('collecting', leakedMatch))
  await page.goto(`${BASE}/camp?tab=ms&sid=1`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('已提交 1 个志愿')).toBeVisible()
  await expect(page.getByText('我的导生', { exact: true })).toHaveCount(0)
  await expect(page.getByText(/感谢信 · 写给/)).toHaveCount(0)

  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await loginAsStudent(page, phaseOf('done', leakedMatch))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('老师正在线下协调导生分配')).toBeVisible()
  await expect(page.getByText('我的导生', { exact: true })).toHaveCount(0)

  await page.unrouteAll({ behavior: 'ignoreErrors' })
  await loginAsStudent(page, {
    ...phaseOf('done', leakedMatch),
    results_released: true,
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByText('我的导生', { exact: true })).toBeVisible()
  await expect(page.getByText('test_mentor', { exact: true })).toBeVisible()
})

test('旧后端兼容：缺少发布字段时按营期状态展示正式结果', async ({ page }) => {
  const legacyPhase = phaseOf('done', {
    unmatched: false,
    my_mentor: { user_id: 13, username: 'test_mentor' },
  })
  delete legacyPhase.results_released

  await loginAsStudent(page, legacyPhase)
  await page.goto(`${BASE}/camp?tab=ms&sid=1`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('我的导生', { exact: true })).toBeVisible()
  await expect(page.getByText('test_mentor', { exact: true })).toBeVisible()
})

test('志愿截止打烊：市集出示收摊卡并引导回工作台', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStudent(page, phaseOf('done', {
    round1: [{ mentor_id: 13, note: '' }, { mentor_id: 20, note: '' }],
  }))

  await page.goto(`${BASE}/camp/1/market`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('本轮市集已收摊')).toBeVisible()
  await expect(page.getByText('志愿已截止，老师正在协调分配，结果在工作台公布')).toBeVisible()
  await expect(page.getByRole('button', { name: '回工作台看状态' })).toBeVisible()

  expect(errors).toEqual([])
})

test('浏览期（开放报名后·志愿开始前）：可逛可收藏，暂不能选人提交', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStudent(page, phaseOf('upcoming'))

  await page.goto(`${BASE}/camp/1/market`, { waitUntil: 'domcontentloaded' })
  // 市集开门：海报 + 名片照常展示，可按方向筛选
  await expect(page.locator('.poster-art img')).toBeVisible()
  await expect(page.locator('.live-ticker')).toContainText('距开启提交：')
  await expect(page.locator('.live-ticker')).toContainText(`${DEADLINES.preference_start} 开启`)
  await expect(page.locator('.market-count')).toHaveText(/4 位导生共 4 位/)
  await page.getByRole('button', { name: '软件组', exact: true }).click()
  await expect(page.locator('.market-count')).toHaveText(/2 位导生共 4 位/)
  // 只读口径：无抢购/加入按钮、无志愿托盘
  await expect(page.getByRole('button', { name: /加入心仪导生/ })).toHaveCount(0)
  await expect(page.locator('.ms-tray-wrap')).toHaveCount(0)
  // 收藏在浏览期可用（个人便签）
  await page.getByRole('button', { name: '收藏 软件导生', exact: true }).click()
  await expect(page.getByRole('button', { name: '取消收藏 软件导生', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // 工作台 ms tab：浏览期 CTA 引导先逛
  await page.goto(`${BASE}/camp?tab=ms&sid=1`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('先去逛导生市集，收藏心仪导生')).toBeVisible()
  await page.getByRole('button', { name: '先去逛逛' }).click()
  await expect(page).toHaveURL(/\/camp\/1\/market$/)

  expect(errors).toEqual([])
})

test('导生工作台：谁报了我只读名单，无收人按钮', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, phaseOf('collecting', {
    role: 'mentor', has_profile: true, profile_locked: false,
    matched_count: 0, remaining: 3, suitor_count: 2,
  }), 'user', [
    { url: '/camp/sessions', json: SESSIONS_MENTOR },
    {
      url: '/camp/ms/1/suitors',
      json: {
        code: 200, round: 1, preview: true, phase: 'collecting',
        capacity: 3, matched: 0, remaining: 3,
        suitors: [
          { user_id: 201, username: '学员小张', avatar: null, rank: 1, note: LONG_NOTE, matched: false, matched_mentor_name: null },
          { user_id: 202, username: '学员小王', avatar: null, rank: 2, note: '', matched: true, matched_mentor_name: '别的导生' },
          { user_id: 203, username: '学员小李', avatar: null, rank: 1, note: '求带', matched: false, matched_mentor_name: null },
          { user_id: 204, username: '学员小赵', avatar: null, rank: 3, note: '', matched: false, matched_mentor_name: null },
        ],
      },
    },
    { url: '/camp/ms/1/matched', json: { code: 200, matched: [] } },
    { url: '/camp/ms/1/profile', json: { code: 200, profile: null } },
  ])

  await page.goto(`${BASE}/camp?tab=ms&sid=1`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('谁报了我')).toBeVisible()
  await expect(page.getByText('学员将在浏览页看到这张名片')).toHaveCount(0)
  await expect(page.getByText('最多 1000 字')).toBeVisible()
  await expect(page.getByText('这位导生有点神秘，先看看标签吧~~')).toBeVisible()
  const bioInput = page.getByPlaceholder('介绍你的经历、擅长的方向、能带学员做什么，以及你期待怎样的伙伴。')
  const longBio = '介绍'.repeat(500)
  await bioInput.fill(longBio)
  await expect(bioInput).toHaveValue(longBio)
  await expect(page.getByText('1000/1000')).toBeVisible()
  await page.locator('.detail-link').click()
  await expect(page.getByRole('dialog').locator('.detail-bio')).toHaveText(longBio)
  await page.keyboard.press('Escape')
  await bioInput.fill(longBio + '多')
  await page.getByRole('button', { name: '发布名片', exact: true }).click()
  await expect(page.getByText('自我介绍不能超过 1000 字')).toBeVisible()
  await expect(page.getByText('共 4 人')).toBeVisible()
  await expect(page.getByText('一志愿 2')).toBeVisible()
  await expect(page.getByText('二志愿 1')).toBeVisible()
  await expect(page.getByText('三志愿 1')).toBeVisible()
  await expect(page.getByText('学员小张')).toBeVisible()
  await expect(page.getByText('已分配给 别的导生')).toBeVisible()

  // 长留言：默认单行省略（几何溢出），展开见全文，收起回省略；短留言/空留言不给开关
  const zhangNote = page.locator('.suitor-item', { hasText: '学员小张' }).locator('.note-text')
  const clipped = () => zhangNote.evaluate((el) => el.scrollWidth > el.clientWidth + 1)
  await expect(clipped()).resolves.toBe(true)
  await expect(page.locator('.suitor-item', { hasText: '学员小李' }).getByRole('button', { name: '展开' })).toHaveCount(0)
  await page.locator('.suitor-item', { hasText: '学员小张' }).getByRole('button', { name: '展开' }).click()
  await expect(clipped()).resolves.toBe(false)
  await page.locator('.suitor-item', { hasText: '学员小张' }).getByRole('button', { name: '收起' }).click()
  await expect(clipped()).resolves.toBe(true)
  // 单轮制：收集期名单纯只读，勾选动作只在截止后的人员确认页出现
  await expect(page.getByRole('button', { name: '收下' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '预览', exact: true })).toHaveCount(0)

  expect(errors).toEqual([])
})

test('导生人员确认：志愿截止后可锁定/释放学员', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, phaseOf('done', {
    role: 'mentor', has_profile: true, profile_locked: true,
    matched_count: 2, remaining: 1,
  }), 'user', [
    { url: '/camp/sessions', json: SESSIONS_MENTOR },
    // 头像跳转的公开主页（UserIndex）会拉年度考勤，必须给数组形状（空对象会炸 .reduce）
    { url: '/records/yearly', json: { code: 200, data: [] } },
  ])

  // 勾选/释放接口直接改内存名单，roster 回读最新状态（同一营内闭环）
  const students = [
    { user_id: 201, username: '学员小张', avatar: null, rank: 1, note: LONG_NOTE, submitted: true, status: 'free', mentor_name: null, source: null },
    { user_id: 202, username: '学员小王', avatar: null, rank: null, note: null, submitted: true, status: 'taken', mentor_name: '别的导生', source: null },
    { user_id: 203, username: '学员小赵', avatar: null, rank: null, note: null, submitted: false, status: 'free', mentor_name: null, source: null },
    { user_id: 204, username: '学员小钱', avatar: null, rank: 2, note: '', submitted: true, status: 'mine', mentor_name: null, source: 'mentor_pick' },
    { user_id: 205, username: '学员小李', avatar: null, rank: null, note: null, submitted: true, status: 'mine', mentor_name: null, source: 'admin' },
  ]
  const CAP = 3
  let matchedN = 2
  const rosterJson = () => ({
    code: 200, phase: 'done', writable: true,
    capacity: CAP, matched: matchedN, remaining: Math.max(0, CAP - matchedN),
    students,
  })
  await page.route('**/camp/ms/1/pick/roster', (route) => route.fulfill({ json: rosterJson() }))
  await page.route('**/camp/ms/1/pick', async (route) => {
    const body = route.request().postDataJSON()
    const s = students.find((x) => x.user_id === body.student_user_id)
    if (body.action === 'release') {
      s.status = 'free'; s.source = null; matchedN -= 1
      return route.fulfill({ json: { code: 200, message: `已释放 ${s.username}` } })
    }
    s.status = 'mine'; s.source = 'mentor_pick'; matchedN += 1
    return route.fulfill({ json: { code: 200, message: `已锁定 ${s.username}` } })
  })

  await page.goto(`${BASE}/camp?tab=ms&sid=1`, { waitUntil: 'domcontentloaded' })

  // 名单信号：志愿序 / 未选我 / 未交 / 已属他人 / 老师指派不可释放
  await expect(page.getByText('人员确认')).toBeVisible()
  await expect(page.getByText('已选 2 / 3')).toBeVisible()
  await expect(page.locator('.pick-item', { hasText: '学员小张' }).getByText('志愿 1')).toBeVisible()
  await expect(page.locator('.pick-item', { hasText: '学员小王' }).getByText('已属 别的导生')).toBeVisible()
  await expect(page.locator('.pick-item', { hasText: '学员小赵' }).getByText('未交志愿')).toBeVisible()
  await expect(page.locator('.pick-item', { hasText: '学员小李' }).getByText('老师指派')).toBeVisible()
  await expect(page.locator('.pick-item', { hasText: '学员小李' }).getByRole('button')).toHaveCount(0)
  await expect(page.locator('.pick-item', { hasText: '学员小钱' }).getByRole('button', { name: '释放' })).toBeVisible()

  // 长留言同样可展开：截断态溢出 → 展开后不溢出（收起/展开开关与收集期共用一套逻辑）
  const zhangNote = page.locator('.pick-item', { hasText: '学员小张' }).locator('.note-text')
  await expect(zhangNote.evaluate((el) => el.scrollWidth > el.clientWidth + 1)).resolves.toBe(true)
  await page.locator('.pick-item', { hasText: '学员小张' }).getByRole('button', { name: '展开' }).click()
  await expect(zhangNote.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).resolves.toBe(true)

  // 锁定小赵（剩 1 个名额）→ 满员，其他 free 行转「名额已满」
  await page.locator('.pick-item', { hasText: '学员小赵' }).getByRole('button', { name: '锁定' }).click()
  await expect(page.getByText('已选 3 / 3')).toBeVisible()
  await expect(page.locator('.pick-item', { hasText: '学员小赵' }).getByRole('button', { name: '释放' })).toBeVisible()
  await expect(page.locator('.pick-item', { hasText: '学员小张' }).getByText('名额已满')).toBeVisible()

  // 释放小赵回到可锁定态
  await page.locator('.pick-item', { hasText: '学员小赵' }).getByRole('button', { name: '释放' }).click()
  await expect(page.getByText('已选 2 / 3')).toBeVisible()
  await expect(page.locator('.pick-item', { hasText: '学员小赵' }).getByRole('button', { name: '锁定' })).toBeVisible()

  // 搜索过滤（DewInput）
  await page.getByPlaceholder('搜索学员姓名').fill('小张')
  await expect(page.getByText('1 位学员')).toBeVisible()
  await expect(page.locator('.pick-item')).toHaveCount(1)

  // 头像点击新开页签进公开主页，原页面停留原地
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.locator('.pick-item', { hasText: '学员小张' }).locator('.link-avatar').click(),
  ])
  await expect(popup).toHaveURL(/\/profile\/\d+/)
  await expect(page).toHaveURL(/\/camp\?/)

  expect(errors).toEqual([])
})

test('团队与学习认证：多课程按章认证+评分（0-100），可撤销/改分/查看章节材料', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsUser(page, phaseOf('done', {
    role: 'mentor', has_profile: true, profile_locked: true,
    matched_count: 1, remaining: null,
  }), 'user', [
    { url: '/camp/sessions', json: SESSIONS_MENTOR },
    { url: '/records/yearly', json: { code: 200, data: [] } },
  ])

  // 09-13 多课制+按章评分：方向两门课，各自章节/认证/评分；写端点内存闭环回读最新态
  // 09-14 章节行带 material_count（导生端「材料 n」chip 数据源）
  const courses = [
    { course_id: 7, course_title: '嵌入式入门', chapters: [
      { chapter_id: 11, name: 'GPIO 点灯', order: 1, lessons: 3, lessons_completed: 3, certified: true, certified_at: '2026-09-12 10:00', certified_by: 1, score: 88, material_count: 1 },
      { chapter_id: 12, name: '串口通信', order: 2, lessons: 4, lessons_completed: 2, certified: false, certified_at: null, certified_by: null, score: null, material_count: 0 },
    ] },
    { course_id: 8, course_title: '电路基础', chapters: [
      { chapter_id: 21, name: '欧姆定律', order: 1, lessons: 2, lessons_completed: 2, certified: false, certified_at: null, certified_by: null, score: null, material_count: 0 },
    ] },
  ]
  const block = (c) => ({
    course_id: c.course_id, course_title: c.course_title, difficulty: 2,
    chapters: c.chapters,
    certified_chapters: c.chapters.filter((x) => x.certified).length,
    total_chapters: c.chapters.length,
    score_avg: (() => {
      const s = c.chapters.filter((x) => x.certified && x.score != null).map((x) => x.score)
      return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null
    })(),
    course_status: 'active',
  })
  const progressJson = () => ({
    code: 200, direction: '硬件组',
    courses: courses.map((c) => ({ course_id: c.course_id, course_title: c.course_title })),
    students: [{ student_user_id: 201, username: '学员小张', courses: courses.map(block) }],
  })
  await page.route('**/camp/sessions/1/team/progress', (route) => route.fulfill({ json: progressJson() }))
  let lastBody = null
  await page.route('**/camp/sessions/1/team/progress/certify', (route) => {
    const body = route.request().postDataJSON()
    lastBody = body
    const ch = courses.flatMap((c) => c.chapters).find((c) => c.chapter_id === body.chapter_id)
    if (route.request().method() === 'DELETE') {
      ch.certified = false; ch.certified_at = null; ch.score = null
      return route.fulfill({ json: { code: 200, message: '已撤销认证' } })
    }
    ch.certified = true; ch.certified_at = '2026-09-12 21:00'
    if (body.score != null) ch.score = body.score
    return route.fulfill({ json: { code: 200, message: '已认证' } })
  })

  // 章节材料（09-14）：学员 × 章材料弹层——下载链接/删除；删后章节行计数回落（内存闭环）
  const mats = [
    { id: 9, course_id: 7, chapter_id: 11, student_user_id: 201,
      content: '点灯实验记录：电阻 220Ω', created_at: '2026-09-14T10:00:00',
      attachments: [{ id: 19, filename: 'led.png', size: 1536 }] },
  ]
  await page.route('**/camp/sessions/1/materials**', (route) =>
    route.fulfill({ json: { code: 200, materials: mats } }))
  let matDeleted = false
  await page.route('**/camp/materials/9', (route) => {
    matDeleted = route.request().method() === 'DELETE'
    mats.length = 0
    courses[0].chapters[0].material_count = 0
    return route.fulfill({ json: { code: 200, message: '已删除' } })
  })

  await page.goto(`${BASE}/camp?tab=members&sid=1`, { waitUntil: 'domcontentloaded' })

  // 方向 chip + 两层表头（课程/章节）；每课汇总列 k/n · 均分（09-19 看板化）
  await expect(page.getByRole('heading', { name: /学员进度/ })).toBeVisible()
  await expect(page.locator('.dir-chip', { hasText: '硬件组' })).toBeVisible()
  await expect(page.locator('.h-course-title', { hasText: '嵌入式入门' })).toBeVisible()
  await expect(page.locator('.h-ch-name', { hasText: '欧姆定律' })).toBeVisible()
  await expect(page.locator('.board tbody .sum', { hasText: '1/2' })
    .filter({ hasText: '均 88' })).toBeVisible()
  await expect(page.locator('.board tbody .sum', { hasText: '0/1' })).toBeVisible()

  // 已认证章带分数；跨课认证：点电路基础未认证格（data-ch=21）→ 共享认证弹窗填 95
  await expect(page.locator('td.cell[data-ch="11"]')).toHaveText(/88/)
  await page.locator('td.cell[data-ch="21"]').click()
  await page.locator('.cert-form input').fill('95')
  await page.locator('.cert-actions').getByRole('button', { name: '认证', exact: true }).click()
  await expect.poll(() => lastBody).toEqual({ student_user_id: 201, chapter_id: 21, score: 95 })

  // 回读：电路基础汇总 1/1 · 均 95
  await expect(page.locator('.board tbody .sum', { hasText: '1/1' })
    .filter({ hasText: '均 95' })).toBeVisible()

  // 改分：点已认证格（11，弹窗预填 88）→ 92（重复 POST 带 score）
  await page.locator('td.cell[data-ch="11"]').click()
  await expect(page.locator('.cert-form')).toContainText('已认证 88 分')
  await page.locator('.cert-form input').fill('92')
  await page.locator('.cert-actions').getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => lastBody).toEqual({ student_user_id: 201, chapter_id: 11, score: 92 })
  await expect(page.locator('td.cell[data-ch="11"]')).toHaveText(/92/)

  // 章节材料（09-14）：材料角标打开弹层 → 内容/附件下载链接；删后空态+角标归零（内存闭环）
  await expect(page.locator('td.cell[data-ch="11"] .mat-dot')).toHaveText('1')
  await page.locator('td.cell[data-ch="11"] .mat-dot').click()
  await expect(page.locator('.mat-list').getByText('点灯实验记录：电阻 220Ω')).toBeVisible()
  const matAtt = page.locator('.mat-list .att-link', { hasText: 'led.png' })
  await expect(matAtt).toBeVisible()
  // 附件下载走短签直连（2026-09-17 修裸链 401）：点击 → 换 token → 开签名 URL
  await page.evaluate(() => {
    window.__opened = []
    window.open = (u) => { window.__opened.push(String(u)); return null }
  })
  await page.route('**/camp/materials/attachments/19/token', (route) =>
    route.fulfill({ json: { code: 200, expires_in: 7200,
      url: '/camp/materials/attachments/19?u=201&e=1789600000&st=abc' } }))
  await matAtt.click()
  await expect.poll(() => page.evaluate(() => window.__opened[0]))
    .toContain('/camp/materials/attachments/19?')
  // 删除确认改 DewUI 弹窗（09-19）
  await page.locator('.mat-list').locator('.mat-row', { hasText: '点灯实验记录' })
    .getByRole('button', { name: '删除' }).click()
  await page.locator('.del-actions').getByRole('button', { name: '删除', exact: true }).click()
  await expect(page.locator('.mat-list').getByText('该学员本章暂无材料')).toBeVisible()
  expect(matDeleted).toBe(true)
  await expect(page.locator('td.cell[data-ch="11"] .mat-dot')).toHaveCount(0)
  await page.locator('.dew-dialog__close').first().click()   // 关材料弹层，撤销断言不受遮挡

  // 撤销回到未认证态
  await page.locator('td.cell[data-ch="21"]').click()
  await page.locator('.cert-actions').getByRole('button', { name: '撤销认证' }).click()
  await expect(page.locator('.board tbody .sum', { hasText: '0/1' })).toBeVisible()

  expect(errors).toEqual([])
})
