import { test, expect } from '@playwright/test'

// 学员进度看板（2026-09-19 重构）：折叠列表 → 学员×章节认证矩阵。
// 冻结首列/两层表头/汇总列/任务尾列（点击跳组会 tab）；点格子=共享 ChapterCertDialog
// 认证（与组会审阅同款）；材料角标=学员×章材料弹层。mock 后端，零依赖真实库。
// 契约对齐 camp.py team/progress + camp_meeting.py task-summary。

const BASE = 'http://127.0.0.1:18081/AMEII'

const SESSIONS = {
  code: 200,
  sessions: [{ id: 1, name: '进行中的培训营', category: 'learning', cycle_name: '2026 暑期',
    start_date: '2026-08-26', end_date: '2026-09-30', status: 'running',
    is_member: true, my_role: 'mentor', member_count: 5, mentor_selection_enabled: false }],
}

// 2 学员 × 2 课程 × 2 章：含 已认证带分 / 已认证未打分 / 未认证 / 有材料 各态
const ch = (id, name, certified, score, mats) => ({
  chapter_id: id, name, order: id, lessons: 3, lessons_completed: certified ? 3 : 1,
  certified, certified_at: certified ? '2026-09-16 10:00' : null, certified_by: certified ? 49 : null,
  score: certified ? score : null, material_count: mats || 0,
})
const courseBlock = (cid, title, chapters, status = 'in_progress') => ({
  course_id: cid, course_title: title, difficulty: null, chapters,
  certified_chapters: chapters.filter((c) => c.certified).length, total_chapters: chapters.length,
  score_avg: (() => { const s = chapters.filter((c) => c.certified && c.score != null).map((c) => c.score)
    return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null })(),
  course_status: status,
})

const PROGRESS = () => ({
  code: 200, direction: '医疗信号',
  courses: [{ course_id: 4, course_title: '生物医学工程导论' }, { course_id: 5, course_title: '医学影像基础' }],
  students: [
    { student_user_id: 52, username: '学员小一', courses: [
      courseBlock(4, '生物医学工程导论', [ch(7, '第一章：概述', true, 88), ch(8, '第二章：材料', false, null, 2)]),
      courseBlock(5, '医学影像基础', [ch(21, '成像原理', true, null), ch(22, '影像伪影', false, null)]),
    ] },
    { student_user_id: 53, username: '学员小二', courses: [
      courseBlock(4, '生物医学工程导论', [ch(7, '第一章：概述', false, null, 1), ch(8, '第二章：材料', false, null)]),
      courseBlock(5, '医学影像基础', [ch(21, '成像原理', true, 92), ch(22, '影像伪影', true, null)],
        'completed'),
    ] },
  ],
})

const TASK_SUMMARY = {
  code: 200, meeting_count: 1, task_total: 2,
  summary: [{ user_id: 52, submitted: 2 }, { user_id: 53, submitted: 1 }],
}

const MATERIALS = {
  code: 200,
  materials: [{ id: 301, content: '第二章学习笔记与代码。', created_at: '2026-09-17T20:31:00',
    attachments: [{ id: 311, filename: 'note.pdf', size: 20480 }] }],
}

const TEAM_MEETINGS = {
  code: 200,
  group: { scope: 'team', mentor_id: 49, mentor_name: '导生阿明', member_count: 2 },
  is_leader: true, meetings: [],
}

async function loginAsMentor(page, extraMocks = []) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false, level: 2,
      user: { role: 'mentor' }, checkinInfo: {},
    }))
  })
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

test('导生·学员进度看板渲染：矩阵/汇总列/任务尾列', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsMentor(page, [
    { url: '/team/progress', json: PROGRESS() },
    { url: '/team/task-summary', json: TASK_SUMMARY },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=members`, { waitUntil: 'domcontentloaded' })
  // 两层表头：课程行 + 章节行 + 汇总列；冻结首列学员名
  await expect(page.locator('.h-course-title', { hasText: '生物医学工程导论' })).toBeVisible()
  await expect(page.locator('.h-ch-name', { hasText: '第二章：材料' })).toBeVisible()
  await expect(page.locator('.board thead .c-name')).toHaveText('学员')
  await expect(page.locator('.board tbody .c-name').first()).toHaveText('学员小一')
  // 认证格子：带分 / 未打分(check) / 未认证；材料角标
  const row1 = page.locator('.board tbody tr').first()
  await expect(row1.locator('.cell.ok', { hasText: '88' })).toBeVisible()
  await expect(row1.locator('.cell.ok', { hasText: '成像原理' })).toHaveCount(0)
  await expect(row1.locator('.cell .ok-icon')).toHaveCount(1)          // 成像原理=已认证未打分
  await expect(row1.locator('.mat-dot').first()).toHaveText('2')
  // 汇总列与完成态
  await expect(row1.locator('.sum', { hasText: '1/2' }).first()).toBeVisible()
  const row2 = page.locator('.board tbody tr').nth(1)
  await expect(row2.locator('.sum-done').first()).toBeVisible()        // 小二影像课全章认证=完成
  // header 任务摘要 + 尾列徽标（小二未交满=警示）
  await expect(page.locator('.mm-task')).toContainText('未交 1 人')
  await expect(row1.locator('.task-badge')).toHaveText('2/2')
  await expect(row2.locator('.task-badge.miss')).toHaveText('1/2')
  expect(errors).toEqual([])
})

test('导生·点格子认证：共享弹窗打分，格子即时翻分数', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  let certBody = null
  const progress = PROGRESS()
  await loginAsMentor(page, [
    // certify 必须排在 progress 之前（includes 前缀匹配，后注册先撞）
    { url: '/team/progress/certify', resp: (route) => {
        if (route.request().method() !== 'POST') {
          return route.fulfill({ json: { code: 200, message: '已撤销' } })
        }
        certBody = route.request().postDataJSON()
        // 认证后小一「第二章：材料」翻已认证带分（reload 的 progress 即更新）
        progress.students[0].courses[0].chapters[1] = ch(8, '第二章：材料', true, 90, 2)
        progress.students[0].courses[0].certified_chapters = 2
        return route.fulfill({ json: { code: 200, message: '已认证' } })
      } },
    { url: '/team/progress', json: progress },
    { url: '/team/task-summary', json: TASK_SUMMARY },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=members`, { waitUntil: 'domcontentloaded' })
  // 点小一第二格（未认证）→ 共享认证弹窗（与组会审阅同款）
  await page.locator('.board tbody tr').first().locator('.cell:not(.ok)').first().click()
  const dlg = page.locator('.dew-dialog')
  await expect(dlg).toBeVisible()
  await expect(dlg).toContainText('学员小一')
  await expect(dlg).toContainText('第二章：材料')
  await dlg.locator('input').fill('90')
  await dlg.getByRole('button', { name: '认证', exact: true }).click()
  await expect(page.locator('.el-message', { hasText: '已认证' })).toBeVisible()
  await expect(page.locator('.dew-dialog')).toHaveCount(0)
  // 刷新后的矩阵：该格翻分数、汇总 2/2
  await expect(page.locator('.board tbody tr').first()
    .locator('.cell.ok', { hasText: '90' })).toBeVisible()
  expect(certBody).toMatchObject({ student_user_id: 52, chapter_id: 8, score: 90 })
  expect(errors).toEqual([])
})

test('导生·材料角标：学员×章材料弹层', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsMentor(page, [
    { url: '/team/progress', json: PROGRESS() },
    { url: '/team/task-summary', json: TASK_SUMMARY },
    { url: '/materials', json: MATERIALS },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=members`, { waitUntil: 'domcontentloaded' })
  await page.locator('.board tbody tr').first().locator('.mat-dot').first().click()
  const dlg = page.locator('.dew-dialog')
  await expect(dlg).toBeVisible()
  await expect(dlg).toContainText('章节材料 · 学员小一 · 第二章：材料')
  await expect(dlg.locator('.mat-content')).toHaveText('第二章学习笔记与代码。')
  await expect(dlg.locator('.att-link')).toContainText('note.pdf')
  expect(errors).toEqual([])
})

test('导生·任务尾列点击跳「组会任务」tab', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await loginAsMentor(page, [
    { url: '/team/progress', json: PROGRESS() },
    { url: '/team/task-summary', json: TASK_SUMMARY },
    { url: '/team-meetings', json: TEAM_MEETINGS },
  ])

  await page.goto(`${BASE}/camp?sid=1&tab=members`, { waitUntil: 'domcontentloaded' })
  await page.locator('.task-badge.miss').click()
  // 切到组会 tab：导生视角渲染组会列表头（发起入口）
  await expect(page.getByRole('button', { name: '发起组会' })).toBeVisible()
  expect(errors).toEqual([])
})
