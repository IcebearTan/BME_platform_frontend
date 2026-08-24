import { test, expect } from '@playwright/test'

// 团购导生市集（/camp/:sid/market）+ ms tab 状态机：mock 后端数据，零依赖真实库
// 规范见 apps/user/docs/营期模块-设计与IA规范.md §1.2 例外 / §2.4

const BASE = 'http://localhost:8081/AMEII'

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

const DEADLINES = {
  preference_start: '2026-08-24 00:00', preference_deadline: '2026-08-24 23:00',
  round1_deadline: '2026-08-24 23:59', round2_deadline: null,
}

const MENTORS = {
  mentors: [
    { user_id: 13, username: 'test_mentor', photo_url: null, avatar: null,
      capacity: 8, matched: 7, remaining: 1, full: false, tags: ['硬件组'], bio: '搞硬件的' },
    { user_id: 20, username: '满员导生', photo_url: null, avatar: null,
      capacity: 3, matched: 3, remaining: 0, full: true, tags: ['软件组'], bio: '已经满了' },
  ],
}

function phaseOf(phase, me = {}) {
  return {
    code: 200, phase, enabled: true, config_error: false,
    deadlines: DEADLINES, round2_enabled: false, ms_tags: ['硬件组', '软件组'],
    stats: { submitted: 2, students: 4 },
    me: {
      role: 'student', round1: [], round2: [], submittable_round: null,
      unmatched: true, my_mentor: null, ...me,
    },
  }
}

async function loginAsStudent(page, phase) {
  // 1) 预置登录态：token 键 + vuex 持久化键（role getter 读 state.user.role）
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: 'student' }, checkinInfo: {},
    }))
  })
  // 2) 拦截全部后端请求：camp 三接口给真形数据，其余统一 200 空数据
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
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

test('市集营业：collecting 可逛可收志愿', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStudent(page, phaseOf('collecting', { submittable_round: 1 }))

  await page.goto(`${BASE}/camp/1/market`)
  await expect(page.getByRole('heading', { name: '团购导生' })).toBeVisible()
  // 从众信号（全营汇总）与稀缺/满员角标
  await expect(page.getByText('已有 2/4 位同学提交志愿')).toBeVisible()
  await expect(page.getByText('余 1', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '已满' })).toBeDisabled()

  // 加入志愿 → 托盘计数变化
  await page.getByRole('button', { name: '加入志愿' }).first().click()
  await expect(page.getByText('我的志愿（1/3）')).toBeVisible()
  await expect(page.getByRole('button', { name: '移出志愿' })).toBeVisible()

  expect(errors).toEqual([])
})

test('未交志愿：ms tab 大 CTA 直达市集', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStudent(page, phaseOf('collecting', { submittable_round: 1 }))

  await page.goto(`${BASE}/camp?tab=ms&sid=1`)
  await expect(page.getByText('去逛导生市集，交出你的 3 个志愿')).toBeVisible()
  await page.getByRole('button', { name: '进入团购导生' }).click()
  await expect(page).toHaveURL(/\/camp\/1\/market$/)
  await expect(page.getByRole('heading', { name: '团购导生' })).toBeVisible()

  expect(errors).toEqual([])
})

test('已交志愿：ms tab 回显志愿与再逛逛入口', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStudent(page, phaseOf('collecting', {
    submittable_round: 1,
    round1: [{ mentor_id: 13, note: '想学硬件' }],
  }))

  await page.goto(`${BASE}/camp?tab=ms&sid=1`)
  await expect(page.getByText('已提交 1 个志愿 · 截止前可在市集整组修改')).toBeVisible()
  await expect(page.getByText('test_mentor')).toBeVisible()
  await expect(page.getByText('“想学硬件”')).toBeVisible()
  await expect(page.getByRole('button', { name: '再逛逛 · 修改志愿' })).toBeVisible()

  expect(errors).toEqual([])
})

test('round1 打烊：市集出示等待卡并引导回工作台', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsStudent(page, phaseOf('round1', {
    round1: [{ mentor_id: 13, note: '' }, { mentor_id: 20, note: '' }],
  }))

  await page.goto(`${BASE}/camp/1/market`)
  await expect(page.getByText('导生正在挑选，市集暂停营业')).toBeVisible()
  await expect(page.getByRole('button', { name: '回工作台看状态' })).toBeVisible()

  expect(errors).toEqual([])
})
