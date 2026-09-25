import { test, expect } from '@playwright/test'

// 章节学习内容页（2026-09-21 桌面端重构）：固定顶栏 + 可折叠目录 + 独立滚动内容区。
// 契约对齐 course.py chapter_list/lesson_list + learningProgress.py lesson/list|update。
// 覆盖方案 §13 测试清单的核心路径：课时定位/切换同步/完成状态机/营期参数/页面状态/目录折叠。

const BASE = 'http://127.0.0.1:18081/AMEII'
const COURSE_ID = 9

// 2 章 3 课时：ch11 基础语法（L101 已完成视频课 + L102 未完成图文课），ch12 指针（L201 未完成）
const CHAPTERS = [
  { Chapter_Id: 11, Chapter_Name: '基础语法', Chapter_Order: 1, Chapter_Level: 1, Chapter_Parent_Id: null },
  { Chapter_Id: 12, Chapter_Name: '指针', Chapter_Order: 2, Chapter_Level: 1, Chapter_Parent_Id: null },
]

const lesson = (id, chapterId, title, type, extra = {}) => ({
  id, chapter_id: chapterId, course_id: COURSE_ID, title, type,
  content: type === 'video' ? '<p>视频课文字稿</p>' : `<h2>${title}小节</h2><p>正文段落，足够定位用。</p>`,
  duration: 12, order: 1, resource_url: null, create_time: '2026-09-01 10:00:00', ...extra,
})

const LESSONS = [
  { Chapter_Id: 11, lessons: [
    lesson(101, 11, '变量与类型', 'video', { resource_url: 'https://example.com/101.mp4', order: 1 }),
    lesson(102, 11, '运算符', 'text', { order: 2 }),
  ] },
  { Chapter_Id: 12, lessons: [
    lesson(201, 12, '指针概念', 'text', { order: 1 }),
  ] },
]

const progressRows = (completedIds = []) => LESSONS.flatMap(({ lessons: ls }) =>
  ls.map((l) => ({
    lesson_id: l.id, lesson_title: l.title, lesson_type: l.type, lesson_order: l.order,
    status: completedIds.includes(l.id) ? 'completed' : 'not_started',
    duration: 0, detail: null,
    start_time: completedIds.includes(l.id) ? '2026-09-18 09:00:00' : null,
    completed_time: completedIds.includes(l.id) ? '2026-09-18 09:30:00' : null,
  }))
)

const SEARCH = { code: 200, Course_Title: 'C语言程序设计', Chapters: 2, Learning_Mode: 'camp' }
const RESOURCES = {
  code: 200,
  data: [{ id: 301, course_id: COURSE_ID, name: '课程讲义.pdf', size: 204800,
    content_type: 'application/pdf', sort_order: 1, created_at: '2026-09-01 10:00' }]
}

// 完成打点捕获（断言请求体用）
let lastUpdateBody = null

// 完成本课（含防误触确认弹窗，2026-09-21 加入）：点主按钮 → 弹窗点「确认完成」
async function completeCurrentLesson(page) {
  await page.locator('.nav-cta', { hasText: '完成本课并继续' }).click()
  await page.getByRole('button', { name: '确认完成' }).click()
}

async function mockLearningPage(page, {
  completed = [101],
  updateResp = null,          // 覆盖完成接口响应；默认成功
  chapters = CHAPTERS,
  lessons = LESSONS,
  courseMode = 'camp',        // 学习方式（migrate_52）：open=自主学 / camp=营期学
  enrolled = true,            // userCourse/check 选课态
  canLearn = null,            // can_learn 显式覆盖；null=随 enrolled（正常口径两者一致）
  failChapterList = false,
  forbiddenChapterList = false,
} = {}) {
  lastUpdateBody = null
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false, level: 2,
      user: { role: 'user' }, checkinInfo: {},
    }))
  })
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/course/chapter_list')) {
      // 契约对齐真实后端：chapter_list 返回裸数组（无 code/data 包装）
      if (failChapterList) return route.fulfill({ status: 500, json: { code: 500, message: 'boom' } })
      if (forbiddenChapterList) return route.fulfill({ status: 403, json: { code: 403, message: '无权限' } })
      return route.fulfill({ json: chapters })
    }
    if (url.includes('/course/lesson/list')) {
      return route.fulfill({ json: { code: 200, message: 'ok', data: lessons } })
    }
    if (url.includes('/learningProgress/lesson/list')) {
      return route.fulfill({ json: { code: 200, message: 'ok', data: progressRows(completed),
        summary: { total: 3, completed: completed.length } } })
    }
    if (url.includes('/learningProgress/lesson/update')) {
      lastUpdateBody = route.request().postDataJSON()
      if (updateResp) return route.fulfill(updateResp)
      return route.fulfill({ json: { code: 200, message: 'ok', scope: 'global', progress: {} } })
    }
    if (url.includes('/course/resources')) {
      return route.fulfill({ json: RESOURCES })
    }
    if (url.includes('/course/resource_down')) {
      return route.fulfill({ json: { code: 200, Down_Code: 'e2e-code' } })
    }
    if (url.includes('/userCourse/check')) {
      // can_learn 是门禁唯一依据（A14 前全局自助行 enrolled=true 但 can_learn=false）
      return route.fulfill({ json: { code: 200, message: 'ok',
        data: { enrolled, status: enrolled ? 'active' : null, camp_session_id: null,
          learning_mode: courseMode,
          can_learn: canLearn == null ? enrolled : canLearn } } })
    }
    if (url.includes('/course/search')) {
      return route.fulfill({ json: { ...SEARCH, Learning_Mode: courseMode } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('无课时参数：默认打开第一条未完成课时，仅当前章展开', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page)

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  // 定位到 L102（第一条未完成）；URL 补写 lessonId
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  await expect(page).toHaveURL(/lessonId=102/)
  await expect(page).toHaveURL(/chapterId=11/)
  // 顶栏上下文
  await expect(page.locator('.tb-course')).toHaveText('C语言程序设计')
  await expect(page.locator('.tb-chapter')).toHaveText('基础语法')
  await expect(page.locator('.tb-count')).toHaveText('1/3 课时')
  // 当前章展开、另一章折叠；已完成课时有勾
  await expect(page.locator('[data-lesson-id="102"]')).toBeVisible()
  await expect(page.locator('[data-lesson-id="201"]')).toBeHidden()
  await expect(page.locator('[data-lesson-id="101"] .cat-lesson-check')).toBeVisible()
  expect(errors).toEqual([])
})

test('带 lessonId 精确恢复目标课时（跨章不被 chapterId 覆盖）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page)

  // 只带 lessonId（不带 chapterId）：定位到 ch12 的课时
  await page.goto(`${BASE}/course/chapter/${COURSE_ID}?lessonId=201`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lesson-title')).toHaveText('指针概念')
  await expect(page.locator('.tb-chapter')).toHaveText('指针')
  await expect(page).toHaveURL(/chapterId=12&lessonId=201|lessonId=201&chapterId=12/)

  // 带 chapterId=11 + lessonId=201：lessonId 优先，不被重置到该章第一课
  await page.goto(`${BASE}/course/chapter/${COURSE_ID}?chapterId=11&lessonId=201`,
    { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lesson-title')).toHaveText('指针概念')
  expect(errors).toEqual([])
})

test('点击目录课时：URL、目录高亮与正文同步', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page)

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  // 切到已完成的视频课：正文/URL/当前高亮一起变
  await page.locator('[data-lesson-id="101"]').click()
  await expect(page.locator('.lesson-title')).toHaveText('变量与类型')
  await expect(page).toHaveURL(/lessonId=101/)
  await expect(page.locator('[data-lesson-id="101"]')).toHaveClass(/is-current/)
  await expect(page.locator('[data-lesson-id="102"]')).not.toHaveClass(/is-current/)
  expect(errors).toEqual([])
})

test('上一课/下一课跨章节切换正确（含快捷键）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page)

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  // Ctrl + → 下一课：L102 → L201（跨章，目标章自动展开）
  await page.keyboard.press('Control+ArrowRight')
  await expect(page.locator('.lesson-title')).toHaveText('指针概念')
  await expect(page).toHaveURL(/lessonId=201/)
  await expect(page.locator('.tb-chapter')).toHaveText('指针')
  await expect(page.locator('[data-lesson-id="201"]')).toBeVisible()
  // 上一课：L201 → L102，按钮显示目标课时名
  await expect(page.locator('.nav-target')).toHaveText('运算符')
  await page.locator('.nav-prev').click()
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  await expect(page).toHaveURL(/lessonId=102/)
  expect(errors).toEqual([])
})

test('完成成功：后端确认后目录勾选/总进度/按钮同步并进入下一课', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page, { completed: [101] })

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  await completeCurrentLesson(page)

  // 成功后自动进入下一课（跨章）
  await expect(page.locator('.lesson-title')).toHaveText('指针概念')
  await expect(page).toHaveURL(/lessonId=201/)
  // 目录勾选 + 总进度 2/3
  await expect(page.locator('[data-lesson-id="102"] .cat-lesson-check')).toBeVisible()
  await expect(page.locator('.tb-count')).toHaveText('2/3 课时')
  await expect(page.locator('.catalog-count')).toContainText('2/3')
  // 打点请求体
  expect(lastUpdateBody).toMatchObject({ Lesson_Id: 102, Course_Id: COURSE_ID, Status: 'completed' })
  expect(errors).toEqual([])
})

test('完成失败：不乐观写成功，保留重试', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page, {
    completed: [101],
    updateResp: { status: 500, json: { code: 500, message: '服务器开小差' } },
  })

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  await completeCurrentLesson(page)

  // 失败：停留在本课，不出现完成态，进度不变，按钮可重试
  await expect(page.locator('.nav-error')).toHaveText('保存失败，请重试')
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  await expect(page.locator('[data-lesson-id="102"] .cat-lesson-check')).toHaveCount(0)
  await expect(page.locator('.tb-count')).toHaveText('1/3 课时')
  await expect(page.locator('.nav-cta', { hasText: '完成本课并继续' })).toBeEnabled()
  expect(errors).toEqual([])
})

test('刷新后完成状态从后端恢复（已完成课不再作为默认目标）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  // 101、102 均完成：默认定位应为第一条未完成 L201
  await mockLearningPage(page, { completed: [101, 102] })

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lesson-title')).toHaveText('指针概念')
  await expect(page.locator('.tb-count')).toHaveText('2/3 课时')
  // 已完成课时进入后显示「已完成」态 + 下一课按钮（先展开折叠的基础语法章）
  await page.locator('.cat-chapter', { hasText: '基础语法' }).click()
  await page.locator('[data-lesson-id="102"]').click()
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  await expect(page.locator('.nav-next')).toContainText('已完成')
  await expect(page.locator('.nav-next .dew-btn', { hasText: '下一课' })).toBeVisible()
  expect(errors).toEqual([])
})

test('营期语境：课时切换保留 from/sid，返回课程回营期学习方向', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page)

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}?from=camp&sid=7`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  // 切换课时后 from/sid 不丢
  await page.locator('[data-lesson-id="101"]').click()
  await expect(page).toHaveURL(/from=camp/)
  await expect(page).toHaveURL(/sid=7/)
  // 返回课程 → 营期学习方向 tab
  await page.locator('.tb-back').click()
  await expect(page).toHaveURL(/\/camp\?sid=7&tab=study/)
  expect(errors).toEqual([])
})

test('非营期入口返回课程详情并带课程 id', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page)

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await page.locator('.tb-back').click()
  await expect(page).toHaveURL(new RegExp(`/study/details\\?id=${COURSE_ID}`))
  expect(errors).toEqual([])
})

test('页面状态：无章节 / 加载失败 / 无权限分别给出正确文案', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  // 课程无章节
  await mockLearningPage(page, { chapters: [], lessons: [] })
  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.state-title')).toHaveText('课程内容尚未发布')
  await expect(page.locator('.catalog')).toHaveCount(0)

  // 接口失败：页面级错误 + 重试入口
  await mockLearningPage(page, { failChapterList: true })
  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.state-title')).toHaveText('课程内容加载失败')
  await expect(page.locator('.state-retry')).toBeVisible()

  // 无权限
  await mockLearningPage(page, { forbiddenChapterList: true })
  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.state-title')).toHaveText('你暂时无法学习本课程')
  expect(errors).toEqual([])
})

test('目录折叠后正文扩展，重新展开后当前课时仍可见', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page)

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}?lessonId=201`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lesson-title')).toHaveText('指针概念')

  // 收起目录：宽度归零，正文照常
  await page.locator('.tb-toggle').click()
  await expect(page.locator('.catalog')).toHaveClass(/is-collapsed/)
  await expect(page.locator('.lesson-paper')).toBeVisible()

  // 重新展开：当前课时仍可见且高亮
  await page.locator('.tb-toggle').click()
  await expect(page.locator('[data-lesson-id="201"]')).toBeVisible()
  await expect(page.locator('[data-lesson-id="201"]')).toHaveClass(/is-current/)
  expect(errors).toEqual([])
})

test('课程资源区：有资料时展示并可触发下载打点', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page)

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.paper-section-title')).toHaveText('课程资源')
  await expect(page.locator('.resource-file-list')).toContainText('课程讲义.pdf')
  expect(errors).toEqual([])
})

test('营期学未选课：学习页直接无权限态，不渲染目录', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page, { courseMode: 'camp', enrolled: false })

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.state-title')).toHaveText('你暂时无法学习本课程')
  await expect(page.locator('.state-desc')).toContainText('经营期选课')
  await expect(page.locator('.catalog')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('自主学未选课：登录即学，可完成且打点不带营戳', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page, { courseMode: 'open', enrolled: false })

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}`, { waitUntil: 'domcontentloaded' })
  // 未选课照常进入学习态
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  await expect(page.locator('.catalog')).toBeVisible()

  // 完成本课：成功后进下一课；全局口径打点不带 camp_session_id
  await completeCurrentLesson(page)
  await expect(page.locator('.lesson-title')).toHaveText('指针概念')
  expect(lastUpdateBody).toMatchObject({ Lesson_Id: 102, Course_Id: COURSE_ID, Status: 'completed' })
  expect(lastUpdateBody.camp_session_id).toBeUndefined()
  expect(errors).toEqual([])
})

test('营期学已选课：门禁放行，营内打点带 camp_session_id', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockLearningPage(page, { courseMode: 'camp', enrolled: true })

  await page.goto(`${BASE}/course/chapter/${COURSE_ID}?from=camp&sid=7`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.lesson-title')).toHaveText('运算符')
  await completeCurrentLesson(page)
  await expect(page.locator('.lesson-title')).toHaveText('指针概念')
  expect(lastUpdateBody.camp_session_id).toBe(7)
  expect(errors).toEqual([])
})
