import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'

const API = 'http://127.0.0.1:5001', USER = 'http://127.0.0.1:18091/AMEII', ADMIN = 'http://127.0.0.1:15183/admin'
const session = { id: 30, name: '秋季项目营', category: 'project', status: 'running', start_date: '2026-09-01', end_date: '2027-01-18',
  is_member: false, my_staff_role: 'teacher', available_perspectives: ['teacher'], has_camp_access: true,
  policy: { capabilities: { attendance: false, leave: false, seat: false } } }
const node = (extra = {}) => ({ id: 101, title: '样机测试', order_no: 2, stage_key: 'prototype', due_date: '2026-10-13', status: 'submitted',
  node_complete: false, completion_mode: 'member_evaluation', overdue: true, required_count: 2, submitted_count: 1,
  evaluated_count: 0, pending_evaluations: 1, pending_reviews: 0, ...extra })
const project = (extra = {}) => ({ key: '41', unit_id: 41, name: '术中监测', status: 'active', leader_name: '彭珂', leader_user_id: 61,
  leader_active: true, member_count: 3, members: [{ user_id: 61, name: '彭珂', role: 'leader' }, { user_id: 62, name: '邹雨濠', role: 'member' }, { user_id: 63, name: '张日轩', role: 'member' }],
  node_count: 2, completed_nodes: 1, completion_rate: 50, configured: true, overdue_nodes: 1, pending_evaluations: 1, pending_reviews: 0,
  current_node: '样机测试', next_due_date: '2026-10-13', risks: ['overdue', 'pending'], verified_outcomes: 1, pending_outcomes: 0, last_activity_at: '2026-10-14T12:00:00',
  nodes: [node({ id: 100, title: '需求规格书', order_no: 1, stage_key: 'requirements', node_complete: true, overdue: false, status: 'approved', pending_evaluations: 0 }), node()], ...extra })
const board = () => ({ code: 200, camp_id: 30, camp_name: '秋季项目营', status: 'running', as_of: '2026-10-14T12:30:00+08:00', archived: false,
  summary: { project_count: 3, participant_count: 5, completed_projects: 0, total_nodes: 3, completed_nodes: 1, completion_rate: 33.3,
    unconfigured_projects: 1, overdue_projects: 1, overdue_nodes: 1, pending_reviews: 1, pending_evaluations: 1, verified_outcomes: 1, pending_outcomes: 0 },
  columns: [{ key: 'requirements', title: '需求规格书' }, { key: 'prototype', title: '样机测试' }],
  projects: [project(), project({ key: '42', unit_id: 42, name: '尿湿检测', leader_name: '陈瑞丰', member_count: 1, members: [{ user_id: 64, name: '陈瑞丰', role: 'leader' }],
    nodes: [node({ id: 102, completion_mode: 'leader_review', overdue: false, pending_reviews: 1, pending_evaluations: 0 })], completed_nodes: 0, node_count: 1, completion_rate: 0, overdue_nodes: 0, pending_reviews: 1, pending_evaluations: 0, risks: ['pending'], verified_outcomes: 0 }),
    project({ key: '43', unit_id: 43, name: 'VR康复', leader_name: '王继孟', member_count: 1, members: [{ name: '王继孟', role: 'leader' }], nodes: [],
      completed_nodes: 0, node_count: 0, completion_rate: null, configured: false, current_node: '未配置节点', next_due_date: null, overdue_nodes: 0, pending_reviews: 0, pending_evaluations: 0, risks: ['unconfigured'], verified_outcomes: 0 })] })

async function setup(page, { admin = false, dark = false, sessions = [session] } = {}) {
  await page.addInitScript(({ admin, dark }) => {
    const client = admin ? 'admin' : 'user'
    localStorage.setItem('themeInitialized', 'true')
    localStorage.setItem(`bme-${client}-token`, 'e2e-mock-token')
    localStorage.setItem(`bme-${client}-state`, JSON.stringify({ token: 'e2e-mock-token', isLogin: true, isDarkMode: dark,
      user: { role: admin ? 'super_admin' : 'user' }, checkinInfo: {} }))
  }, { admin, dark })
  await page.route(`${API}/**`, r => {
    const path = new URL(r.request().url()).pathname
    if (path === '/user/user_index') return r.fulfill({ json: { code: 200, role: admin ? 'super_admin' : 'user', User_Name: '管理老师', permissions: [] } })
    if (path === '/camp/sessions') return r.fulfill({ json: { code: 200, sessions } })
    if (path === '/camp/sessions/30') return r.fulfill({ json: { code: 200, session } })
    if (path === '/camp/sessions/31') return r.fulfill({ json: { code: 200, session: { ...session, id: 31, name: '另一个营' } } })
    if (path === '/camp/projects/30/dashboard') return r.fulfill({ json: board() })
    if (path === '/camp/projects/30/dashboard/41') return r.fulfill({ json: { code: 200, project: project({ outcomes: [{ title: '样机验证报告', status: 'verified', description: '验证通过' }],
      nodes: [node({ requirement: '测试记录与报告', evaluations: [{ name: '张日轩', score: 0, comment: '尚需改进' }], submissions: [{ id: 81, name: '邹雨濠', version: 2, status: 'submitted', content: '第二版样机测试记录', created_at: '2026-10-14T12:00:00', attachments: [{ id: 91, filename: '样机报告.txt' }] }] })] }) } })
    return r.fulfill({ json: { code: 200, data: {}, message: 'ok' } })
  })
}

test('培训营老师保留学员导生、报名及考勤的原有用语与操作', async ({ page }) => {
  const learning = { ...session, category: 'learning', policy: { attendance_mode: 'weekly', capabilities: { attendance: true, leave: true } } }
  await setup(page, { sessions: [learning] })
  await page.route(`${API}/camp/sessions/30`, r => r.fulfill({ json: { code: 200, session: learning } }))
  await page.route(`${API}/camp/sessions/30/members**`, r => r.fulfill({ json: { code: 200, total: 1, counts: { student: 1, mentor: 0 }, members: [{ user_id: 62, username: '培训学员', role: 'student', roles: ['student'] }] } }))
  await page.route(`${API}/camp/sessions/30/member-candidates**`, r => r.fulfill({ json: { code: 200, users: [{ User_Id: 63, User_Name: '候选学员', User_Email: 'candidate@seed.dev' }] } }))
  await page.route(`${API}/camp/sessions/30/join-requests**`, r => r.fulfill({ json: { code: 200, requests: [{ id: 1, username: '报名学员', apply_role: 'student', selected_days: '["2026-10-17"]' }], mentors: [] } }))
  await page.route(`${API}/camp/attendance/dashboard/30**`, r => r.fulfill({ json: { code: 200, mode: 'weekly', rows: [{ user_id: 62, username: '培训学员', weeks: [], total_days: 0, total_hours: 0 }] } }))
  await page.goto(`${USER}/camp?sid=30`)
  await page.getByRole('button', { name: '成员管理', exact: true }).click()
  await expect(page.locator('.teacher-members .mentor-select')).toBeVisible()
  await expect(page.locator('.project-formation-note')).toHaveCount(0)
  await page.getByRole('button', { name: '加成员', exact: true }).click()
  await expect(page.locator('.add-hint')).toContainText('预分配导生')
  await page.locator('.dew-dialog').getByRole('button', { name: '搜索', exact: true }).click()
  await page.locator('.cand-row').click()
  let body
  await page.route(`${API}/camp/sessions/30/members/batch`, r => { body = r.request().postDataJSON(); return r.fulfill({ json: { code: 200, added: 1, results: [] } }) })
  await page.getByRole('button', { name: '加入（1）', exact: true }).click()
  await expect(page.locator('.dew-dialog')).toHaveCount(0)
  expect(body.items[0].role).toBe('student')
  await page.getByRole('button', { name: '报名审批', exact: true }).click()
  await expect(page.locator('.teacher-admissions')).toContainText('学员报名')
  await expect(page.locator('.app-date')).toContainText('承诺出勤 1 天')
  await page.getByRole('button', { name: '全营考勤', exact: true }).click()
  await expect(page.locator('.mentor-dashboard')).toContainText('1 名学员')
  await expect(page.locator('.project-workspace')).toHaveCount(0)
})

test('老师项目总览：默认入口、矩阵、筛选和当前筛选导出', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await setup(page)
  await page.goto(`${USER}/camp?sid=30&scope=camp&tab=projects`)
  const dashboard = page.locator('.project-dashboard')
  await expect(dashboard.getByRole('heading', { name: '项目总览' })).toBeVisible()
  await expect(dashboard.locator('.summary-grid')).toContainText('33.3%')
  await expect(dashboard.locator('.progress-matrix')).toContainText('未配置节点')
  await expect(page.getByRole('button', { name: '学习进度', exact: true })).toHaveCount(0)
  await page.screenshot({ path: '/tmp/bme-project-dashboard-teacher.png', fullPage: true })
  await dashboard.getByRole('textbox', { name: '搜索项目、负责人或成员' }).fill('邹雨濠')
  await expect(dashboard.getByRole('button', { name: '术中监测', exact: true })).toBeVisible()
  await expect(dashboard.getByRole('button', { name: '尿湿检测', exact: true })).toHaveCount(0)
  await expect(dashboard.locator('.summary-grid')).toContainText('3 / 5')
  const download = page.waitForEvent('download')
  await dashboard.getByRole('button', { name: '导出当前名单与进度' }).click()
  const file = await download, content = await fs.readFile(await file.path(), 'utf8')
  expect(content).toContain('术中监测'); expect(content).not.toContain('尿湿检测')
  await dashboard.getByRole('textbox', { name: '搜索项目、负责人或成员' }).fill('')
  await page.getByTitle('切换到夜间模式').click()
  await expect(page.locator('body')).toHaveClass(/theme-dark/)
  await expect(dashboard.locator('td.el-table-fixed-column--left').first()).toHaveCSS('background-color', 'rgb(22, 22, 26)')
  await page.screenshot({ path: '/tmp/bme-project-dashboard-teacher-dark.png', fullPage: true })
  expect(errors).toEqual([])
})

test('老师项目详情：新版材料、零分评价、附件短签及只读操作', async ({ page, context }) => {
  await setup(page)
  let authorization
  await page.route(`${API}/camp/submissions/attachments/91/token`, r => { authorization = r.request().headers().authorization; return r.fulfill({ json: { code: 200, url: '/camp/submissions/attachments/91?st=sign&u=1&e=9999999999' } }) })
  await context.route(`${API}/camp/submissions/attachments/91?*`, r => r.fulfill({ contentType: 'text/plain', body: 'report' }))
  await page.goto(`${USER}/camp?sid=30&scope=camp&tab=projects`)
  await page.getByRole('button', { name: '术中监测', exact: true }).click()
  await page.locator('.pws-nav').getByRole('button', { name: '节点与交付', exact: true }).click()
  const drawer = page.locator('.pwr')
  await expect(drawer).toContainText('第二版样机测试记录')
  await expect(drawer).toContainText('张日轩 · 0分')
  const popup = page.waitForEvent('popup')
  await drawer.getByRole('button', { name: '样机报告.txt' }).click()
  const tab = await popup; await expect(tab).toHaveURL(/st=sign/)
  expect(authorization).toBe('Bearer e2e-mock-token')
  await expect(drawer.getByRole('button', { name: '通过', exact: true })).toHaveCount(0)
  await expect(drawer.getByRole('button', { name: '评价', exact: true })).toHaveCount(0)
  await page.locator('.pws-nav').getByRole('button', { name: '成果与归档', exact: true }).click()
  await expect(drawer).toContainText('样机验证报告')
})

test('管理端项目总览：导航、深链和明暗主题', async ({ page }) => {
  await setup(page, { admin: true, dark: true })
  await page.goto(`${ADMIN}/camps/30/project/dashboard`)
  await expect(page.locator('.ws-nav').getByText('项目总览', { exact: true })).toBeVisible()
  await expect(page.locator('.project-dashboard .page-title')).toHaveText('项目总览')
  await expect(page.locator('.progress-matrix')).toContainText('术中监测')
  await page.screenshot({ path: '/tmp/bme-project-dashboard-admin-dark.png', fullPage: true })
})

test('看板错误可重试，重试成功后不残留错误', async ({ page }) => {
  await setup(page)
  let failed = true
  await page.route(`${API}/camp/projects/30/dashboard`, r => failed ? r.fulfill({ status: 403, json: { code: 403, message: '需要本营负责人权限' } }) : r.fulfill({ json: board() }))
  await page.goto(`${USER}/camp?sid=30&scope=camp&tab=projects`)
  await expect(page.locator('.pws-error')).toContainText('需要本营负责人权限')
  await expect(page.locator('.summary-grid')).toHaveCount(0)
  failed = false
  await page.locator('.pws-error').getByRole('button', { name: '重试' }).click()
  await expect(page.locator('.summary-grid')).toBeVisible()
  await expect(page.locator('.project-dashboard .error-state')).toHaveCount(0)
})

test('未配置节点空态、结营冻结及窄屏详情', async ({ page }) => {
  await setup(page)
  const data = board(); data.archived = true; data.status = 'archived'; data.frozen_at = '2026-10-14T12:00:00'
  data.summary.completion_rate = null; data.summary.total_nodes = 0; data.summary.completed_nodes = 0
  data.columns = []; data.projects = [data.projects[2]]; data.projects[0].key = 'archive-0'
  await page.route(`${API}/camp/projects/30/dashboard`, r => r.fulfill({ json: data }))
  await page.route(`${API}/camp/projects/30/dashboard/archive-0`, r => r.fulfill({ json: { code: 200, project: { ...data.projects[0], outcomes: [] } } }))
  await page.setViewportSize({ width: 400, height: 850 })
  await page.goto(`${USER}/camp?sid=30&scope=camp&tab=projects`)
  await expect(page.getByText(/结营复盘/)).toBeVisible()
  await expect(page.locator('.summary-grid')).not.toContainText('100%')
  await page.getByRole('button', { name: 'VR康复', exact: true }).click()
  await page.locator('.pws-nav').getByRole('button', { name: '展开菜单', exact: true }).count()
  await page.getByRole('button', { name: '展开菜单', exact: true }).click()
  await page.locator('.pws-nav').getByRole('button', { name: '节点与交付', exact: true }).click()
  await expect(page.locator('.pwr')).toContainText('尚未配置节点')
  expect(await page.locator('.project-workspace').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
})

test('切营时忽略旧请求，不展示上一营的项目与弹窗', async ({ page }) => {
  await setup(page, { admin: true })
  let releaseOldRequest, oldDelivered = false, calls = 0
  const held = new Promise(resolve => { releaseOldRequest = resolve })
  await page.route(`${API}/camp/projects/30/dashboard`, async r => {
    if (++calls > 1) await held
    await r.fulfill({ json: board() })
    if (calls > 1) oldDelivered = true
  })
  await page.route(`${API}/camp/projects/31/dashboard`, async r => {
    await new Promise(resolve => setTimeout(resolve, 100))
    return r.fulfill({ json: { ...board(), camp_id: 31, camp_name: '另一个营', projects: [], columns: [] } })
  })
  await page.goto(`${ADMIN}/camps/30/project/dashboard`)
  await expect(page.getByRole('button', { name: '术中监测', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '术中监测', exact: true }).click()
  await expect(page.locator('.project-detail-drawer')).toContainText('第二版样机测试记录')
  await page.keyboard.press('Escape')
  await expect(page.locator('.project-detail-drawer')).not.toBeVisible()
  await page.locator('.project-dashboard').getByRole('button', { name: '刷新', exact: true }).click()
  await expect.poll(() => calls).toBe(2)
  // 同一个工作区实例通过客户端路由换营。
  await page.evaluate(() => { window.history.pushState({}, '', '/admin/camps/31/project/dashboard'); window.dispatchEvent(new PopStateEvent('popstate')) })
  await expect(page.getByRole('button', { name: '术中监测', exact: true })).toHaveCount(0)
  await expect(page.locator('.project-detail-drawer')).not.toBeVisible()
  await expect(page.locator('.progress-matrix')).toContainText('本营暂无项目')
  releaseOldRequest()
  await expect.poll(() => oldDelivered).toBe(true)
  await expect(page.getByRole('button', { name: '术中监测', exact: true })).toHaveCount(0)
  await expect(page.locator('.progress-matrix')).toContainText('本营暂无项目')
})

test('培训营保留老师概览和学习进度，项目总览深链被门禁拦回', async ({ page }) => {
  await setup(page, { sessions: [{ ...session, category: 'learning' }] })
  await page.goto(`${USER}/camp?sid=30&scope=camp&tab=projects`)
  await expect(page.getByRole('button', { name: '学习进度', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '项目总览', exact: true })).toHaveCount(0)
  await expect(page.getByText('今日待办', { exact: true })).toBeVisible()
  await setup(page, { admin: true })
  await page.route(`${API}/camp/sessions/30`, r => r.fulfill({ json: { code: 200, session: { ...session, category: 'learning' } } }))
  await page.goto(`${ADMIN}/camps/30/project/dashboard`)
  await expect(page).toHaveURL(/\/camps\/30\/overview/)
  await expect(page.locator('.ws-nav').getByText('项目总览', { exact: true })).toHaveCount(0)
})
