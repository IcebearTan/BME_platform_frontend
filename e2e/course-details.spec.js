import { test, expect } from '@playwright/test'

// 课程详情页（2026-09-21 自主学/加入学习改造）：契约对齐 course.py search/chapter_list/
// lesson_list + learningProgress.py userCourse/check + courseShelf/* + course/resources。
// 覆盖：加入学习步骤移除 / 操作区位于信息列 / 右栏无按钮 / 营期学无权限禁用 /
// 开始学习与目录课时点击的路由与 from/sid 透传 / 书架真实接口往返 / 一键下载 ghost /
// 移动端 400px 布局。

const BASE = 'http://127.0.0.1:18081/AMEII'
const COURSE_ID = 9

// 2 章 3 课时（与 course-chapter.spec 同构，便于目录点击后直接断言学习页定位）
const CHAPTERS = [
  { Chapter_Id: 11, Chapter_Name: '基础语法', Chapter_Order: 1, Chapter_Level: 1, Chapter_Parent_Id: null },
  { Chapter_Id: 12, Chapter_Name: '指针', Chapter_Order: 2, Chapter_Level: 1, Chapter_Parent_Id: null },
]
const LESSONS = [
  { Chapter_Id: 11, lessons: [
    { id: 101, chapter_id: 11, title: '变量与类型', type: 'video', duration: 12, order: 1 },
    { id: 102, chapter_id: 11, title: '运算符', type: 'text', duration: 12, order: 2 },
  ] },
  { Chapter_Id: 12, lessons: [
    { id: 201, chapter_id: 12, title: '指针概念', type: 'text', duration: 12, order: 1 },
  ] },
]

const SEARCH = (mode) => ({
  code: 200, Course_Id: String(COURSE_ID), Course_Title: 'C语言程序设计',
  Introduction: '从变量到指针的系统入门。', Chapters: 2, Course_Class_Hour: 720,
  Course_Difficulty: 3, Course_Tags: 'C语言,编程基础', Course_Other_Tags: ['医学影像'],
  Cover: null, Learning_Mode: mode,
})

// 书架往返捕获（断言请求用）
let shelfRequests = []
// 营期进度请求捕获（断言 effectiveSid 时序用）
let progressRequests = []

async function mockDetailsPage(page, {
  courseMode = 'open',       // open=自主学 / camp=营期学
  enrolled = false,          // userCourse/check 选课态
  canLearn = null,           // can_learn 显式覆盖；null=按口径推导
  campSid = null,            // check 透出的营期戳（effectiveSid 口径分流）
  inShelf = false,           // 初始书架状态
  lessons = LESSONS,         // 传 [] = 无课时课程
} = {}) {
  shelfRequests = []
  progressRequests = []
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false, level: 2,
      user: { role: 'user' }, checkinInfo: {},
    }))
  })
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/course/search')) {
      return route.fulfill({ json: SEARCH(courseMode) })
    }
    if (url.includes('/course/chapter_list')) {
      return route.fulfill({ json: CHAPTERS })
    }
    if (url.includes('/course/lesson/list')) {
      return route.fulfill({ json: { code: 200, message: 'ok', data: lessons } })
    }
    if (url.includes('/learningProgress/lesson/list')) {
      progressRequests.push(url)
      return route.fulfill({ json: { code: 200, message: 'ok', data: [
        { lesson_id: 101, status: 'completed', start_time: '2026-09-18 09:00:00',
          completed_time: '2026-09-18 09:30:00' },
      ] } })
    }
    if (url.includes('/userCourse/check')) {
      // can_learn 是学习入口与目录点按的唯一门禁口径
      return route.fulfill({ json: { code: 200, message: 'ok',
        data: { enrolled, status: enrolled ? 'active' : null, camp_session_id: campSid,
          learning_mode: courseMode,
          can_learn: canLearn == null ? (courseMode === 'open' ? true : enrolled) : canLearn } } })
    }
    if (url.includes('/courseShelf/check')) {
      return route.fulfill({ json: { code: 200, message: 'ok', data: { in_shelf: inShelf } } })
    }
    if (url.includes('/courseShelf/add') || url.includes('/courseShelf/remove')) {
      shelfRequests.push({ url, body: route.request().postDataJSON() })
      return route.fulfill({ json: { code: 200, message: 'ok',
        data: { course_id: COURSE_ID, in_shelf: url.includes('add') } } })
    }
    if (url.includes('/course/resources')) {
      return route.fulfill({ json: { code: 200, data: [
        { id: 301, course_id: COURSE_ID, name: '课程讲义.pdf', size: 204800,
          content_type: 'application/pdf', sort_order: 1, created_at: '2026-09-01 10:00' },
      ] } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

const startBtn = (page) => page.locator('.course-actions button', { hasText: '开始学习' })

test('自主学课程：无「加入学习」，直接可用的「开始学习」在信息列内', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'open', enrolled: false })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.course-title')).toHaveText(/C语言程序设计/)

  // 「加入学习」步骤彻底移除：无按钮、无提示文案
  await expect(page.getByText('加入学习', { exact: true })).toHaveCount(0)
  await expect(page.getByText('支持自主学习')).toHaveCount(0)
  await expect(page.getByText('加入后即可')).toHaveCount(0)
  await expect(page.locator('.join-hint')).toHaveCount(0)

  // 「开始学习」可用且位于信息列操作区（简介下方）
  await expect(startBtn(page)).toBeVisible()
  await expect(startBtn(page)).toBeEnabled()
  const actions = page.locator('.course-info-right .course-actions')
  await expect(actions).toBeVisible()
  await expect(actions.locator('button', { hasText: '开始学习' })).toHaveCount(1)
  // 操作区在简介之后（DOM 顺序）
  const descIdx = await page.locator('.course-info-right > *').evaluateAll(
    (els) => els.findIndex((el) => el.classList.contains('course-description')))
  const actIdx = await page.locator('.course-info-right > *').evaluateAll(
    (els) => els.findIndex((el) => el.classList.contains('course-actions')))
  expect(actIdx).toBeGreaterThan(descIdx)
  expect(errors).toEqual([])
})

test('右侧栏没有任何按钮（含 DewButton/原生 button）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'open', enrolled: true })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(startBtn(page)).toBeVisible()
  await expect(page.locator('.right-sidebar button')).toHaveCount(0)
  await expect(page.locator('.right-sidebar [role="button"]')).toHaveCount(0)
  // 右栏只读信息仍在
  await expect(page.locator('.right-sidebar')).toContainText('课程难度')
  await expect(page.locator('.right-sidebar')).toContainText('章节数量')
  // 课程标签来自课程数据（Other_Tags + Course_Tags 逗号串），不是写死列表
  await expect(page.locator('.right-sidebar .course-tags')).toContainText('医学影像')
  await expect(page.locator('.right-sidebar .course-tags')).toContainText('C语言')
  await expect(page.locator('.right-sidebar .course-tags')).toContainText('编程基础')
  expect(errors).toEqual([])
})

test('营期学无权限：开始学习禁用带说明，加入书架仍可用；有权限则可用', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'camp', enrolled: false, canLearn: false })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  // 按钮可见但禁用，title 说明原因；信息列内弱化说明（非横幅）
  await expect(startBtn(page)).toBeVisible()
  await expect(startBtn(page)).toBeDisabled()
  await expect(startBtn(page)).toHaveAttribute('title', /营期学习/)
  await expect(page.locator('.course-info-right .camp-note')).toHaveText(/营期学习/)
  await expect(page.locator('.camp-note')).toHaveCount(1)
  // 书架不受学习权限影响
  await expect(page.locator('.course-actions button', { hasText: '加入书架' })).toBeEnabled()

  // 有权限：开始学习正常可用，无弱化说明
  await mockDetailsPage(page, { courseMode: 'camp', enrolled: true, canLearn: true })
  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(startBtn(page)).toBeEnabled()
  await expect(page.locator('.camp-note')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('无课时课程：开始学习禁用不报错', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'open', lessons: [] })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(startBtn(page)).toBeDisabled()
  await expect(startBtn(page)).toHaveAttribute('title', /暂无课时/)
  expect(errors).toEqual([])
})

test('开始学习：进入学习页并定位到继续学习课时（复用学习页定位）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'open', enrolled: true })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await startBtn(page).click()

  // 跳学习页；不带 lessonId，由学习页统一「继续学习」定位（101 已完成 → 102）
  await expect(page).toHaveURL(new RegExp(`/course/chapter/${COURSE_ID}`))
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  await expect(page).toHaveURL(/lessonId=102/)
  expect(errors).toEqual([])
})

test('目录课时点击：URL 带精确 lessonId 并打开对应课时', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'open', enrolled: false })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  // 点第二章课时：精确打开 201，不被初始化逻辑重置回第一课
  await page.locator('.lesson-item', { hasText: '指针概念' }).click()
  await expect(page).toHaveURL(new RegExp(`lessonId=201`))
  await expect(page.locator('.lesson-title')).toHaveText('指针概念')

  // 键盘可达：Enter 打开课时
  await page.goBack()
  await expect(startBtn(page)).toBeVisible()
  const row = page.locator('.lesson-item', { hasText: '运算符' })
  await row.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/lessonId=102/)
  expect(errors).toEqual([])
})

test('from=camp 与 sid 全链路透传（开始学习 / 目录课时），进度请求带营期口径', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'camp', enrolled: true, canLearn: true })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}&from=camp&sid=7`, { waitUntil: 'domcontentloaded' })
  await startBtn(page).click()
  // 先等真正离开详情页（详情 URL 本身也含 from/sid，顺序不能反）
  await expect(page).toHaveURL(new RegExp(`/course/chapter/${COURSE_ID}`))
  await expect(page).toHaveURL(/from=camp/)
  await expect(page).toHaveURL(/sid=7/)
  await expect(page.locator('.lesson-title')).toHaveText('运算符')

  // 回详情页点目录课时，同样透传
  await page.goBack()
  await expect(startBtn(page)).toBeVisible()
  await page.locator('.lesson-item', { hasText: '指针概念' }).click()
  await expect(page).toHaveURL(/from=camp/)
  await expect(page).toHaveURL(/sid=7/)
  await expect(page).toHaveURL(/lessonId=201/)

  // 详情页营期进度请求带 camp_session_id（effectiveSid 已定后才发，时序修复）
  await expect.poll(() => progressRequests.length).toBeGreaterThan(0)
  expect(progressRequests.some((u) => u.includes('camp_session_id=7'))).toBe(true)
  expect(errors).toEqual([])
})

test('营期戳来自 check 回包时，进度请求同样带营期口径（时序）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  // 无 URL sid：camp_session_id 只能来自 userCourse/check——先 check 后取进度
  await mockDetailsPage(page, { courseMode: 'camp', enrolled: true, canLearn: true, campSid: 7 })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(startBtn(page)).toBeVisible()
  // 进度请求在 checkEnrollment 之后才发（按钮先可见不等于进度已取，等它落地再断言）
  await expect.poll(() => progressRequests.length).toBeGreaterThan(0)
  expect(progressRequests.some((u) => u.includes('camp_session_id=7'))).toBe(true)
  expect(errors).toEqual([])
})

test('营期学无权限：目录课时不可点也不派发导航', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'camp', enrolled: false, canLearn: false })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  const row = page.locator('.lesson-item', { hasText: '指针概念' })
  await expect(row).toHaveClass(/is-disabled/)
  await expect(row).toHaveAttribute('aria-disabled', 'true')
  await expect(row).toHaveAttribute('title', /营期学习方向/)
  // Playwright 拒点 aria-disabled 元素，force 落点验证「点了也不派发导航」
  await row.click({ force: true })
  await expect(page).toHaveURL(new RegExp(`/study/details\\?id=${COURSE_ID}`))
  expect(errors).toEqual([])
})

test('加入书架：真实接口往返、状态切换，不触发任何 userCourse 写操作', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  const userCourseWrites = []
  await mockDetailsPage(page, { courseMode: 'open', enrolled: false, inShelf: false })
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (/\/userCourse\/(join|drop|add|remove)/.test(url) && route.request().method() !== 'GET') {
      userCourseWrites.push(url)
    }
    return route.fallback()
  })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  const shelfBtn = page.locator('.course-actions button', { hasText: '书架' })
  await expect(shelfBtn).toHaveText(/加入书架/)

  // 加入：POST courseShelf/add → 已加入书架（courseId 取自路由 query，是字符串）
  await shelfBtn.click()
  await expect(page.locator('.course-actions button', { hasText: '已加入书架' })).toBeVisible()
  expect(shelfRequests.some((r) => r.url.includes('/courseShelf/add')
    && String(r.body.Course_Id) === String(COURSE_ID))).toBe(true)

  // 再点移出：POST courseShelf/remove → 回到加入书架
  await page.locator('.course-actions button', { hasText: '已加入书架' }).click()
  await expect(page.locator('.course-actions button', { hasText: '加入书架' })).toBeVisible()
  expect(shelfRequests.some((r) => r.url.includes('/courseShelf/remove')
    && String(r.body.Course_Id) === String(COURSE_ID))).toBe(true)

  // 书架操作不产生任何 user_course 选课写请求
  expect(userCourseWrites).toEqual([])
  expect(errors).toEqual([])
})

test('初始已在书架：按钮直接呈现已加入，可移出', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'camp', enrolled: false, canLearn: false, inShelf: true })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  const btn = page.locator('.course-actions button', { hasText: '已加入书架' })
  await expect(btn).toBeVisible()
  await expect(btn).toBeEnabled()   // 营期学无学习权限仍可管理书架
  await btn.click()
  await expect(page.locator('.course-actions button', { hasText: '加入书架' })).toBeVisible()
  expect(shelfRequests.some((r) => r.url.includes('/courseShelf/remove'))).toBe(true)
  expect(errors).toEqual([])
})

test('一键下载为 DewButton ghost 变体（共享组件两处不受破坏）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'open' })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  // 切到相关资源 tab
  await page.locator('.course-contents-header').getByText('相关资源').click()
  const downloadAll = page.locator('.resource-file-list button', { hasText: '一键下载' })
  await expect(downloadAll).toBeVisible()
  await expect(downloadAll).toHaveClass(/dew-btn--ghost/)
  await expect(downloadAll).not.toHaveClass(/dew-btn-tint/)
  // 「下载所选」保持默认样式（不染蓝）
  await page.locator('.resource-file-list .row-check').first().click()
  const downloadSel = page.locator('.resource-file-list button', { hasText: '下载所选' })
  await expect(downloadSel).toBeVisible()
  await expect(downloadSel).not.toHaveClass(/dew-btn-tint/)
  expect(errors).toEqual([])
})

test('约 400px 移动端：无横向溢出，操作区自然换行可点击', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockDetailsPage(page, { courseMode: 'open' })

  await page.setViewportSize({ width: 400, height: 860 })
  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(startBtn(page)).toBeVisible()
  // 页面无横向溢出
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  // 操作区整体落在视口内（换行不错位）
  const box = await page.locator('.course-actions').boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(400)
  // 操作区换行后仍可点击（点书架走真实接口）
  await page.locator('.course-actions button', { hasText: '加入书架' }).click()
  await expect(page.locator('.course-actions button', { hasText: '已加入书架' })).toBeVisible()
  expect(errors).toEqual([])
})

test('暗色模式：详情页无 pageerror，操作区可见', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: true, level: 2,
      user: { role: 'user' }, checkinInfo: {},
    }))
  })
  await mockDetailsPage(page, { courseMode: 'open' })

  await page.goto(`${BASE}/study/details?id=${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(startBtn(page)).toBeVisible()
  await expect(page.locator('.course-wrapper')).toHaveClass(/theme-dark/)
  expect(errors).toEqual([])
})
