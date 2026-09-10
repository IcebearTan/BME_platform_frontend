import { test, expect } from '@playwright/test'

// 团购导生市集（/camp/:sid/market）+ ms tab 状态机：mock 后端数据，零依赖真实库
// 规范见 apps/user/docs/营期模块-设计与IA规范.md §1.2 例外 / §2.4

const BASE = 'http://127.0.0.1:18081/AMEII'

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
      capacity: 8, matched: 7, remaining: 1, full: false, tags: ['硬件组'], bio: '搞硬件的' },
    { user_id: 20, username: '满员导生', photo_url: null, avatar: null,
      capacity: 3, matched: 3, remaining: 0, full: true, tags: ['软件组'], bio: '' },
    { user_id: 21, username: '软件导生', photo_url: null, avatar: null,
      capacity: 6, matched: 2, remaining: 4, full: false, tags: ['软件组'], bio: '一起做真实项目' },
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
  await expect(page.getByRole('dialog')).toContainText('按你最想去的顺序排列第一、第二、第三志愿。')
  await expect(page.getByRole('dialog')).toContainText('修改时整组替换志愿，以最后一次提交为准。')
  await page.keyboard.press('Escape')
  await expect(page.getByText('可带 8 人', { exact: true })).toBeVisible()
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
  await expect(detail.locator('.detail-bio')).toHaveText('搞硬件的')
  await detail.getByRole('button', { name: '加入心仪导生 test_mentor' }).click()
  await expect(detail.getByText('已选为第 1 志愿')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByText('我的心仪导生（1/3）')).toBeVisible()
  await expect(page.getByRole('button', { name: '移除 test_mentor' })).toBeVisible()
  await expect(page.getByRole('button', { name: /移出志愿/ })).toHaveCount(0)

  expect(errors).toEqual([])
})

test('心仪导生栏：左右排序、叉号删除与一轮三志愿约束', async ({ page }) => {
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
  await expect(submit).toBeDisabled()
})

test('未交志愿：ms tab 大 CTA 直达市集', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStudent(page, phaseOf('collecting', { submittable_round: 1 }))

  await page.goto(`${BASE}/camp?tab=ms&sid=1`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('去逛导生市集，交出你的 3 个志愿')).toBeVisible()
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
          { user_id: 201, username: '学员小张', avatar: null, rank: 1, note: '想学硬件', matched: false, matched_mentor_name: null },
          { user_id: 202, username: '学员小王', avatar: null, rank: 2, note: '', matched: true, matched_mentor_name: '别的导生' },
          { user_id: 203, username: '学员小李', avatar: null, rank: 1, note: '', matched: false, matched_mentor_name: null },
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
    { user_id: 201, username: '学员小张', avatar: null, rank: 1, note: '想学硬件', submitted: true, status: 'free', mentor_name: null, source: null },
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
