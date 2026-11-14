import { test, expect } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const BASE = 'http://127.0.0.1:18081/AMEII'
const screenshots = path.resolve('..', 'outputs/frontend-integration-20261113/screenshots')
const mentors = [
  { user_id: 21, username: '陈嘉言', direction: '嵌入式与医疗硬件' },
  { user_id: 22, username: '林知行', direction: '生物医学信号' },
  { user_id: 23, username: '许言', direction: '医学影像' },
  { user_id: 24, username: '周予安', direction: '康复工程' },
  { user_id: 25, username: '郭书宁', direction: '智能传感' },
  { user_id: 42, username: '林知行', direction: '生物医学信号' },
]
const session = { id: 7, name: '2026 秋季学期营', category: 'learning', status: 'running',
  start_date: '2026-09-01', end_date: '2026-12-31', member_count: 28,
  is_member: false, my_staff_role: 'teacher', available_perspectives: ['teacher'],
  has_camp_access: true, my_permissions: ['member.manage'], mentor_selection_enabled: false,
  policy: { capabilities: { attendance: false, leave: true } } }

async function setup(page, { dark = true, failSelected = false, delayFirst = false, legacyResponse = false, weekly = false } = {}) {
  const errors = [], requests = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(darkMode => {
    localStorage.setItem('themeInitialized', 'true')
    localStorage.setItem('bme-user-token', 'mentor-search-test')
    localStorage.setItem('bme-user-state', JSON.stringify({ token: 'mentor-search-test',
      isLogin: true, isDarkMode: darkMode, user: { role: 'user', verification_status: 'verified' }, checkinInfo: {} }))
  }, dark)
  let failNext = failSelected
  await page.route('http://127.0.0.1:5001/**', async route => {
    const url = new URL(route.request().url()), params = url.searchParams
    if (url.pathname === '/camp/sessions') return route.fulfill({ json: { code: 200, sessions: [session] } })
    if (url.pathname.endsWith('/teacher/overview')) return route.fulfill({ json: { code: 200, overview: {
      stage: 'running', stage_label: '进行中', counts: { students: 22, mentors: 6, unmatched: 0 }, work_items: [],
    } } })
    const isProgress = url.pathname.endsWith('/progress/board')
    if (isProgress || url.pathname.endsWith('/meetings/all')) {
      const id = params.get('mentor_id'), pageNumber = Number(params.get('page') || 1)
      requests.push({ type: isProgress ? 'progress' : 'meetings', id, page: pageNumber, params: Object.fromEntries(params) })
      if (failNext && id) {
        failNext = false
        return route.fulfill({ status: 503, json: { code: 503, message: '服务暂不可用，请重试' } })
      }
      const selected = id ? mentors.filter(m => String(m.user_id) === id) : mentors
      if (legacyResponse && !isProgress) return route.fulfill({ json: { code: 200, mentors, meetings: [], total: 5 } })
      if (delayFirst && id === '21') await new Promise(resolve => setTimeout(resolve, 600))
      if (isProgress) return route.fulfill({ json: { code: 200,
        mentors: mentors.map(m => ({ mentor_user_id: m.user_id, mentor_name: m.username, direction: m.direction })),
        total: selected.length, page: pageNumber, page_size: 5,
        summary: { group_count: selected.length, student_count: selected.length * 3, certified_rate: 72,
          certified_chapters: 36, total_chapters: 50, completed_courses: 8, scope_label: id ? selected[0].username + '团队' : '全营' },
        groups: selected.slice((pageNumber - 1) * 5, pageNumber * 5).map(m => ({ mentor_user_id: m.user_id,
          mentor_name: m.username, direction: m.direction, certified_rate: 72, courses: [{ course_id: 1, course_title: '生物医学工程导论' }],
          students: [{ student_user_id: m.user_id + 100, username: '学员小雨', certified_rate: 72,
            courses: [{ course_id: 1, course_title: '生物医学工程导论', total_chapters: 10, certified_chapters: 7, course_status: 'in_progress' }] }],
        })),
      } })
      if (weekly && !isProgress) {
        const roster = [...mentors.map(m => ({ ...m, is_current: true })),
          { user_id: 99, username: '历史导生', is_current: false }]
        const rows = [
          { id: 1, mentor_id: 21, meeting_date: '2026-11-10', title: '本周实验讨论', has_minutes: false },
          { id: 2, mentor_id: 22, meeting_date: '2026-11-15', title: '周日计划', has_minutes: false },
          { id: 3, mentor_id: 99, meeting_date: '2026-11-12', title: '历史导生会议', has_minutes: true },
        ].filter(m => (!id || String(m.mentor_id) === id)
          && m.meeting_date >= params.get('start_date') && m.meeting_date <= params.get('end_date'))
        return route.fulfill({ json: { code: 200, mentors: roster, total: rows.length, has_more: false,
          groups: rows.map(m => ({ date: m.meeting_date, meetings: [{ ...m, scope: 'team' }] })) } })
      }
      const dates = ['2026-11-13', '2026-11-12', '2026-11-10']
      return route.fulfill({ json: { code: 200, mentors, total: selected.length * 3, has_more: false,
        groups: dates.map((date, index) => ({ date, meetings: selected.map(m => ({ id: m.user_id * 10 + index,
          mentor_id: m.user_id, team_label: m.username + '团队', title: ['第八周 · 原型验证与阶段复盘', '实验记录与问题讨论', '学习进度同步'][index],
          creator_name: m.username, meeting_date: date + 'T19:30', has_minutes: index > 0, task_count: 3, chapter_count: 2,
        })) })),
      } })
    }
    if (url.pathname === '/auth/session/config') return route.fulfill({ json: { code: 200, refresh_cookie_enabled: false } })
    return route.fulfill({ json: { code: 200, message: 'ok', data: {}, list: [], notifications: [], unread_count: 0 } })
  })
  await page.goto(`${BASE}/camp?sid=7`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('body')).toHaveClass(dark ? /theme-dark/ : /theme-light/)
  if (!weekly) {
    await page.getByRole('button', { name: '组会总览', exact: true }).click()
    await page.getByRole('button', { name: '按日期查看', exact: true }).click()
  }
  return { errors, requests }
}

async function screenshot(page, name) {
  fs.mkdirSync(screenshots, { recursive: true })
  await page.screenshot({ path: path.join(screenshots, name), fullPage: true, animations: 'disabled' })
}

test('组会姓名搜索：完整名单、同名区分、按 ID 请求、无匹配与重置', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 })
  const { errors, requests } = await setup(page)
  await page.getByRole('button', { name: '组会总览', exact: true }).click()
  const input = page.getByPlaceholder('输入导生姓名')
  await expect(input).toBeVisible()
  const before = requests.length
  await input.fill('  林知  ')
  await expect(page.getByText('找到 2 位导生，选择后查看对应团队')).toBeVisible()
  expect(requests).toHaveLength(before)
  await screenshot(page, '01-name-search-dark.png')
  await page.getByRole('button', { name: '林知行 · 生物医学信号 编号 42' }).click()
  await expect.poll(() => requests.at(-1).id).toBe('42')
  await expect(page.getByText('全营组会（3）')).toBeVisible()
  await expect(page.locator('.mentor-search__selection')).toContainText('林知行')
  await screenshot(page, '02-selected-mentor-dark.png')
  await input.fill('不存在的导生')
  await expect(page.getByText(/没有找到匹配的导生/)).toBeVisible()
  expect(requests.at(-1).id).toBe('42')
  await page.getByRole('button', { name: '重置筛选' }).click()
  await expect.poll(() => requests.at(-1).id).toBe(null)
  await expect(page.getByText('全营组会（18）')).toBeVisible()
  expect(errors).toEqual([])
})

test('学习进度：搜索跨分页导生，选择后回第一页并同步摘要', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 })
  const { errors, requests } = await setup(page, { dark: false })
  await page.getByRole('button', { name: '学习进度', exact: true }).click()
  await expect(page.getByText('第 1 / 2 页 · 共 6 个团队')).toBeVisible()
  await page.getByRole('button', { name: '下一页', exact: true }).click()
  await expect(page.getByText('第 2 / 2 页 · 共 6 个团队')).toBeVisible()
  await page.getByPlaceholder('输入导生姓名').fill('嘉言')
  await page.getByPlaceholder('输入导生姓名').press('Enter')
  await expect.poll(() => requests.at(-1)).toMatchObject({ type: 'progress', id: '21', page: 1 })
  await expect(page.getByText('第 1 / 1 页 · 共 1 个团队')).toBeVisible()
  await expect(page.locator('.stat-sub').first()).toContainText('陈嘉言团队汇总')
  await screenshot(page, '03-progress-filter-light.png')
  await page.getByRole('button', { name: '重置筛选' }).click()
  await expect(page.getByText('第 1 / 2 页 · 共 6 个团队')).toBeVisible()
  expect(errors).toEqual([])
})

test('手机与空搜索：空格不筛选，无匹配可恢复，筛选区不溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const { errors, requests } = await setup(page)
  await page.getByRole('button', { name: '组会总览', exact: true }).click()
  const input = page.getByPlaceholder('输入导生姓名')
  await input.fill('  ')
  await expect(page.locator('.mentor-search__results')).toHaveCount(0)
  const before = requests.length
  await input.fill('没有这个名字')
  await expect(page.getByText(/没有找到匹配的导生/)).toBeVisible()
  await expect(page.locator('.mentor-search')).toBeInViewport()
  const box = await page.locator('.mentor-search').boundingBox()
  expect(box.x + box.width).toBeLessThanOrEqual(391)
  expect(requests).toHaveLength(before)
  await screenshot(page, '04-mobile-no-match.png')
  await page.getByRole('button', { name: '重置筛选' }).click()
  await expect(input).toHaveValue('')
  expect(errors).toEqual([])
})

test('请求失败保留所选导生，重试仍使用相同 ID', async ({ page }) => {
  const { errors, requests } = await setup(page, { failSelected: true })
  await page.getByRole('button', { name: '组会总览', exact: true }).click()
  await page.getByPlaceholder('输入导生姓名').fill('陈嘉')
  await page.getByPlaceholder('输入导生姓名').press('Enter')
  await expect(page.locator('.teacher-meetings .error-text')).toHaveText('服务暂不可用，请重试')
  await page.getByRole('button', { name: '重试', exact: true }).click()
  await expect(page.getByText('全营组会（3）')).toBeVisible()
  expect(requests.slice(-2).map(r => r.id)).toEqual(['21', '21'])
  expect(errors).toEqual([])
})

test('平板快速切换导生：较慢旧响应不覆盖最新筛选', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  const { errors } = await setup(page, { delayFirst: true })
  await page.getByRole('button', { name: '组会总览', exact: true }).click()
  const input = page.getByPlaceholder('输入导生姓名')
  await input.fill('陈嘉')
  const oldResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('mentor_id') === '21')
  await input.press('Enter')
  await input.fill('林知')
  await page.getByRole('button', { name: '林知行 · 生物医学信号 编号 42' }).click()
  await expect(page.locator('.mtg-team').first()).toHaveText('林知行团队')
  await oldResponse
  await expect(page.locator('.mentor-search__selection')).toContainText('林知行')
  await expect(page.locator('.mtg-team').first()).toHaveText('林知行团队')
  const box = await page.locator('.mentor-search').boundingBox()
  expect(box.x + box.width).toBeLessThanOrEqual(769)
  expect(errors).toEqual([])
})

test('旧后端响应显示可重试错误，不误报暂无组会', async ({ page }) => {
  const { errors } = await setup(page, { legacyResponse: true })
  await page.getByRole('button', { name: '组会总览', exact: true }).click()
  await expect(page.locator('.teacher-meetings .error-text')).toHaveText('组会数据暂不可用，请稍后重试')
  await expect(page.getByRole('button', { name: '重试', exact: true })).toBeVisible()
  await expect(page.getByText('本营暂无组会记录', { exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('周总览：当前名单、未来安排、历史记录、筛选和空周', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-14T12:00:00+08:00'))
  const { errors, requests } = await setup(page, { weekly: true, dark: false })
  await page.getByRole('button', { name: '组会总览', exact: true }).click()
  await expect(page.locator('.week-summary')).toContainText('有记录 1 / 6 位导生')
  await expect(page.locator('.week-summary')).toContainText('暂无记录 5 位')
  await expect(page.locator('.week-summary')).toContainText('已安排 1 场')
  expect(requests.at(-1).params).toMatchObject({ start_date: '2026-11-09', end_date: '2026-11-15', limit: '7' })
  await expect(page.locator('.week-team')).toHaveCount(7)
  await page.getByRole('button', { name: /陈嘉言.*有记录/ }).click()
  await expect(page.getByRole('button', { name: /11\/10 本周实验讨论 待补纪要/ })).toBeVisible()
  await page.getByRole('button', { name: '暂无记录', exact: true }).click()
  await expect(page.locator('.week-team')).toHaveCount(5)
  await expect(page.locator('.week-team').first()).not.toContainText('有记录')
  await page.getByRole('button', { name: '全部', exact: true }).click()
  await page.getByRole('button', { name: '上一周', exact: true }).click()
  await expect.poll(() => requests.at(-1).params.start_date).toBe('2026-11-02')
  await expect(page.locator('.week-summary')).toContainText('有记录 0 / 6 位导生')
  await expect(page.locator('.week-team')).toHaveCount(6)
  await page.getByRole('button', { name: '回到本周', exact: true }).click()
  await page.getByPlaceholder('输入导生姓名').fill('陈嘉')
  await page.getByPlaceholder('输入导生姓名').press('Enter')
  await expect(page.locator('.week-summary')).toContainText('有记录 1 / 1 位导生')
  expect(requests.at(-1).id).toBe('21')
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
})
