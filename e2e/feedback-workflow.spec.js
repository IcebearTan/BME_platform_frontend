import { test, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

const USER = process.env.BME_FEEDBACK_USER_BASE || 'http://127.0.0.1:18081/AMEII'
const ADMIN = process.env.BME_FEEDBACK_ADMIN_BASE || 'http://127.0.0.1:15173/admin'
const API = 'http://127.0.0.1:5001'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
test.beforeAll(() => mkdirSync('screenshots/feedback', { recursive: true }))

async function session(page, app = 'user', theme = false) {
  await page.addInitScript(({ app, theme }) => {
    localStorage.setItem('themeInitialized', 'true')
    localStorage.setItem('bme-' + app + '-token', 'feedback-test-token')
    localStorage.setItem('bme-' + app + '-state', JSON.stringify({ token: 'feedback-test-token', isLogin: true, isDarkMode: theme,
      user: { id: 74, User_Id: 74, User_Name: '测试管理员', username: '测试用户', role: app === 'admin' ? 'super_admin' : 'user', verification_status: 'verified', permissions: [] } }))
  }, { app, theme })
}
async function apiBase(page) {
  await page.route(API + '/**', route => {
    const url = route.request().url()
    if (url.includes('/auth/session/config')) return route.fulfill({ json: { code: 200, refresh_cookie_enabled: false } })
    if (url.includes('/user/user_index')) return route.fulfill({ json: { code: 200, role: 'super_admin', User_Name: '测试用户', permissions: [], verification_status: 'verified', data: {} } })
    return route.fulfill({ json: { code: 200, data: [], sessions: [], notifications: [], unread_count: 0 } })
  })
}
const errorsFor = page => { const errors = []; page.on('pageerror', error => errors.push(error.message)); return errors }
async function fillReport(page) {
  await page.getByPlaceholder('一句话描述遇到的问题').fill('保存按钮没有响应')
  await page.getByPlaceholder('刚才进行了什么操作？期望与实际结果分别是什么？').fill('在当前页面点击保存按钮之后，页面没有反馈，也没有保存内容。')
}

test('所有路由只有一个固定入口，浮层上仍可点击，自动快照不要求手动截图', async ({ page }) => {
  const errors = errorsFor(page)
  await apiBase(page)
  await page.goto(USER + '/login')
  await page.getByPlaceholder('请输入密码').fill('private-password')
  await page.evaluate(() => {
    const blocker = document.createElement('div')
    blocker.textContent = '正在操作的页面弹层'
    blocker.style.cssText = 'position:fixed;inset:0;z-index:10000000;background:var(--dew-card-flat-bg);padding:80px;'
    blocker.dataset.testBlocker = ''
    document.body.append(blocker)
  })
  const launcher = page.getByRole('button', { name: '报个Bug', exact: true })
  await expect(launcher).toHaveCount(1)
  await launcher.hover()
  await expect(launcher).toContainText('(^_^)')
  await expect(launcher).toHaveAccessibleName('报个Bug')
  await page.mouse.move(0, 0)
  await expect(launcher).toContainText('报个Bug')
  expect(await launcher.evaluate(button => { const r = button.getBoundingClientRect(); return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)) })).toBe(true)
  await launcher.click()
  await expect(page.getByRole('button', { name: '预览页面快照' })).toBeVisible({ timeout: 15000 })
  expect(await page.getByAltText('当前页面快照').evaluate(image => image.getBoundingClientRect().height)).toBeGreaterThan(100)
  await expect(page.getByRole('button', { name: '登录后提交' })).toBeVisible()
  const snapshot = await page.getByAltText('当前页面快照').evaluate(async image => ({ width: image.naturalWidth, data: await (await fetch(image.src)).arrayBuffer().then(buffer => Array.from(new Uint8Array(buffer))) }))
  expect(snapshot.width).toBeGreaterThan(1000)
  writeFileSync('screenshots/feedback/captured-page.jpg', Buffer.from(snapshot.data))
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await page.goto(USER + '/about')
  await expect(launcher).toHaveCount(1)
  await page.setViewportSize({ width: 768, height: 1024 })
  await launcher.click()
  await expect(page.getByRole('button', { name: '预览页面快照' })).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: '登录后提交', exact: true })).toBeInViewport()
  await page.screenshot({ path: 'screenshots/feedback/report-tablet.png', animations: 'disabled' })
  await page.getByRole('button', { name: '取消', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await launcher.evaluate(button => getComputedStyle(button.parentElement).position)).toBe('fixed')
  await expect(launcher).toBeInViewport()
  await launcher.click()
  await expect(page.getByRole('button', { name: '预览页面快照' })).toBeVisible({ timeout: 15000 })
  await page.locator('.feedback-report-dialog .el-select').click()
  await page.getByRole('option', { name: '功能建议', exact: true }).click()
  await expect(page.locator('.feedback-report-dialog .el-select__selected-item:not(.el-select__input-wrapper)')).toContainText('功能建议')
  await page.getByRole('button', { name: '登录后提交', exact: true }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: '登录后提交', exact: true })).toBeInViewport()
  await expect(page.getByRole('dialog', { name: '问题反馈', exact: true }).getByRole('heading', { name: '问题反馈', exact: true })).toBeInViewport()
  await page.screenshot({ path: 'screenshots/feedback/report-mobile.png', animations: 'disabled' })
  expect(errors).toEqual([])
})

test('快照和手动图片同时提交，记录来源且排除认证参数，失败保留草稿', async ({ page }) => {
  const errors = errorsFor(page)
  await session(page)
  await apiBase(page)
  const submissions = []
  await page.route(API + '/feedback-tickets', route => {
    submissions.push(route.request())
    return route.fulfill(submissions.length === 1 ? { status: 500, json: { code: 500, message: '暂时无法保存工单' } } : { json: { code: 200, data: { id: 42 } } })
  })
  await page.goto(USER + '/about?sid=8&token=secret')
  await page.getByRole('button', { name: '报个Bug', exact: true }).click()
  await expect(page.getByRole('button', { name: '预览页面快照' })).toBeVisible({ timeout: 15000 })
  await fillReport(page)
  await page.locator('.feedback-report-dialog input[type=file]').setInputFiles({ name: 'repro.png', mimeType: 'image/png', buffer: PNG })
  await page.screenshot({ path: 'screenshots/feedback/report-desktop.png', animations: 'disabled' })
  await page.getByRole('button', { name: '提交反馈', exact: true }).click()
  await expect(page.getByText('暂时无法保存工单', { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder('一句话描述遇到的问题')).toHaveValue('保存按钮没有响应')
  await page.getByRole('button', { name: '提交反馈', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '问题反馈', exact: true })).toBeHidden()
  expect(submissions).toHaveLength(2)
  const body = submissions[1].postDataBuffer().toString('latin1')
  expect(body).toContain('name="snapshot"; filename="page-snapshot.jpg"')
  expect(body).toContain('name="image"; filename="repro.png"')
  expect(body).toContain('/about?sid=8')
  expect(body).not.toContain('token=secret')
  expect(submissions[1].headers()['content-type']).toContain('boundary=')
  expect(errors).toEqual([])
})

test('移除快照与采集失败均允许继续提交', async ({ page }) => {
  await session(page)
  await apiBase(page)
  const submissions = []
  await page.route(API + '/feedback-tickets', route => { submissions.push(route.request().postDataBuffer().toString('latin1')); return route.fulfill({ json: { code: 200, data: { id: 1 } } }) })
  await page.goto(USER + '/about')
  await page.getByRole('button', { name: '报个Bug', exact: true }).click()
  await expect(page.getByRole('button', { name: '预览页面快照' })).toBeVisible({ timeout: 15000 })
  await page.getByRole('button', { name: '移除', exact: true }).click()
  await fillReport(page)
  await page.getByRole('button', { name: '提交反馈', exact: true }).click()
  await expect.poll(() => submissions.length).toBe(1)
  expect(submissions[0]).not.toContain('name="snapshot"')
  await page.route('**/*html2canvas*', route => route.abort())
  await page.reload()
  await page.getByRole('button', { name: '报个Bug', exact: true }).click()
  await expect(page.getByRole('button', { name: '提交反馈', exact: true })).toBeEnabled({ timeout: 15000 })
  await fillReport(page)
  await page.getByRole('button', { name: '提交反馈', exact: true }).click()
  await expect.poll(() => submissions.length).toBe(2)
  expect(submissions[1]).not.toContain('name="snapshot"')
})

async function adminTickets(page) {
  await session(page, 'admin')
  await apiBase(page)
  const operations = []
  const ticket = { id: 501, title: '页面按钮没有响应', description: '打开项目页面，点击保存无反应。', reporter_name: '学员小一', reporter_user_id: 52,
    status: 'new', category: 'bug', severity: 'normal', priority: 'medium', assignee_user_id: null,
    created_at: '2026-11-01T10:00:00', updated_at: '2026-11-01T10:10:00',
    page_context: { url: USER + '/camp?sid=8', viewport_width: 390, viewport_height: 844, theme: 'dark', app_version: '3.6.3', user_agent: 'Chromium' },
    attachments: [{ id: 1, kind: 'snapshot', original_name: 'page-snapshot.jpg', url: '/feedback-tickets/attachments/1' }],
    messages: [{ id: 1, author_name: '管理员', visibility: 'internal', body: '内部判断：疑似缓存问题', created_at: '2026-11-01T10:02:00' }],
    events: [{ id: 1, event_type: 'created', actor_name: '学员小一', to_status: 'new', created_at: '2026-11-01T10:00:00' }, { id: 2, event_type: 'triaged', actor_name: '管理员', to_status: 'triaged', created_at: '2026-11-01T10:04:00' }] }
  const transitions = { new: ['rejected'], triaged: ['in_progress', 'rejected'], in_progress: ['waiting_user', 'resolved', 'rejected'], waiting_user: ['in_progress', 'resolved'], resolved: ['closed', 'reopened'] }
  await page.route(API + '/feedback-tickets/attachments/1', route => route.fulfill({ contentType: 'image/png', body: PNG }))
  await page.route(API + '/admin/feedback-tickets**', route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.pathname.endsWith('/stats')) return route.fulfill({ json: { code: 200, data: { by_status: { new: 1, in_progress: 2, resolved: 1 } } } })
    if (url.pathname.endsWith('/staff')) return route.fulfill({ json: { code: 200, staff: [{ id: 74, username: '测试管理员' }] } })
    if (request.method() === 'GET' && url.pathname.endsWith('/501')) return route.fulfill({ json: { code: 200, ticket: { ...ticket, can_triage: !['resolved', 'closed', 'rejected'].includes(ticket.status), allowed_transitions: transitions[ticket.status] || ['reopened'] } } })
    if (request.method() === 'GET') return route.fulfill({ json: { code: 200, tickets: [ticket], total: 1 } })
    const data = request.postDataJSON()
    operations.push({ path: url.pathname, data })
    if (url.pathname.endsWith('/triage')) { Object.assign(ticket, data); if (ticket.status === 'new') ticket.status = 'triaged' }
    if (url.pathname.endsWith('/transitions')) {
      ticket.status = data.to
      if (data.to === 'resolved') { ticket.resolution_code = data.resolution_code; ticket.resolution_summary = data.resolution_summary }
      if (data.to === 'waiting_user') ticket.messages.push({ id: 2, author_name: '管理员', visibility: 'public', body: data.reason, created_at: '2026-11-01T10:05:00' })
    }
    return route.fulfill({ json: { code: 200, message: '操作已完成' } })
  })
  return { operations, ticket }
}

test('管理员按队列处理并保留筛选位置，现场附件单独展示，记录按时间交错', async ({ page }) => {
  const errors = errorsFor(page)
  await adminTickets(page)
  await page.goto(ADMIN + '/operations/feedback-tickets')
  await expect(page.getByRole('row', { name: /页面按钮没有响应/ })).toBeVisible()
  await page.screenshot({ path: 'screenshots/feedback/admin-list-light.png', animations: 'disabled' })
  await page.getByRole('button', { name: '待受理 1' }).click()
  await expect(page).toHaveURL(/queue=inbox/)
  await page.getByRole('row', { name: /页面按钮没有响应/ }).click()
  await expect(page.getByText('问题现场', { exact: true })).toBeVisible()
  await expect(page.getByText('页面快照 · 点击放大')).toBeVisible()
  const entries = page.locator('.ticket-timeline li')
  await expect(entries.nth(0)).toContainText('提交工单')
  await expect(entries.nth(1)).toContainText('内部判断')
  await expect(entries.nth(2)).toContainText('受理 / 调整安排')
  await page.screenshot({ path: 'screenshots/feedback/admin-detail-light.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '返回列表', exact: true }).click()
  await expect(page).toHaveURL(/queue=inbox/)
  await expect(page.getByRole('button', { name: '待受理 1' })).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('受理、开始、补充说明与解决分步推进，公开说明必填', async ({ page }) => {
  const errors = errorsFor(page)
  const { operations } = await adminTickets(page)
  await page.goto(ADMIN + '/operations/feedback-tickets/501')
  await page.getByRole('button', { name: '受理', exact: true }).click()
  await expect(page.getByRole('button', { name: '开始处理', exact: true })).toBeVisible()
  expect(operations[0].data.expected_status).toBe('new')
  await page.getByRole('button', { name: '开始处理', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: '确认', exact: true }).click()
  await expect(page.getByRole('button', { name: '要求用户补充', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '要求用户补充', exact: true }).click()
  const action = page.getByRole('dialog', { name: '要求用户补充', exact: true })
  await expect(action.getByRole('button', { name: '确认', exact: true })).toBeDisabled()
  await action.getByPlaceholder('写明用户可见的说明，便于继续跟进').fill('请补充保存前的操作步骤')
  await action.getByRole('button', { name: '确认', exact: true }).click()
  await expect(page.getByText('请补充保存前的操作步骤', { exact: true })).toBeVisible()
  expect(operations.at(-1).data).toMatchObject({ to: 'waiting_user', reason: '请补充保存前的操作步骤', expected_status: 'in_progress' })
  await page.getByRole('button', { name: '标记解决', exact: true }).click()
  const resolve = page.getByRole('dialog', { name: '标记解决', exact: true })
  await expect(resolve.getByRole('button', { name: '确认', exact: true })).toBeDisabled()
  await resolve.getByPlaceholder('写明用户可见的说明，便于继续跟进').fill('已修复按钮事件并更新版本')
  await resolve.getByRole('button', { name: '确认', exact: true }).click()
  await expect(page.getByText('已修复：已修复按钮事件并更新版本')).toBeVisible()
  await expect(page.getByRole('button', { name: '保存安排', exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('工单加载失败可重试；深色手机布局没有页面横向溢出', async ({ page }) => {
  await adminTickets(page)
  await page.route(API + '/admin/feedback-tickets/501', route => route.fulfill({ status: 500, json: { code: 500, message: '工单暂时无法加载' } }))
  await page.goto(ADMIN + '/operations/feedback-tickets/501')
  await expect(page.getByText('工单暂时无法加载', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '重新加载', exact: true })).toBeVisible()
  await page.unroute(API + '/admin/feedback-tickets/501')
  await page.getByRole('button', { name: '重新加载', exact: true }).click()
  await expect(page.getByText('问题现场', { exact: true })).toBeVisible()
  await page.evaluate(async () => { const store = (await import('/admin/src/store.js')).default; store.commit('setTheme', true) })
  await page.setViewportSize({ width: 768, height: 1024 })
  await expect.poll(() => page.locator('.ticket-detail-main').evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(600)
  await page.screenshot({ path: 'screenshots/feedback/admin-detail-dark-tablet.png', fullPage: true, animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => page.locator('.ticket-detail-main').evaluate(element => element.getBoundingClientRect().width)).toBeGreaterThan(300)
  await expect(page.locator('.sidebar-container')).toHaveClass(/collapsed/)
  await page.screenshot({ path: 'screenshots/feedback/admin-detail-dark-mobile.png', fullPage: true, animations: 'disabled' })
  await page.getByRole('button', { name: '展开导航', exact: true }).click()
  await expect(page.getByRole('button', { name: '关闭导航', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '关闭导航', exact: true }).click({ position: { x: 350, y: 30 } })
  await expect(page.locator('.sidebar-container')).toHaveClass(/collapsed/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
  await page.getByRole('button', { name: '返回列表', exact: true }).click()
  await expect(page.getByRole('row', { name: /页面按钮没有响应/ })).toBeVisible()
  await page.screenshot({ path: 'screenshots/feedback/admin-list-dark-mobile.png', animations: 'disabled' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('切换工单不被旧详情覆盖，状态冲突保留未发送回复', async ({ page }) => {
  const { ticket } = await adminTickets(page)
  let release
  const wait = new Promise(resolve => { release = resolve })
  await page.route(API + '/admin/feedback-tickets/501', async route => { await wait; await route.fulfill({ json: { code: 200, ticket } }) })
  await page.route(API + '/admin/feedback-tickets/502', route => route.fulfill({ json: { code: 200, ticket: { ...ticket, id: 502, title: '另一张工单' } } }))
  const firstRequest = page.waitForRequest(API + '/admin/feedback-tickets/501')
  await page.goto(ADMIN + '/operations/feedback-tickets/501')
  await firstRequest
  await page.evaluate(async () => { const router = (await import('/admin/src/router.js')).default; await router.push('/operations/feedback-tickets/502') })
  await expect(page.getByRole('heading', { name: '另一张工单', exact: true })).toBeVisible()
  const oldResponse = page.waitForResponse(API + '/admin/feedback-tickets/501')
  release()
  await oldResponse
  await expect(page.getByRole('heading', { name: '另一张工单', exact: true })).toBeVisible()
  await page.route(API + '/admin/feedback-tickets/502/messages', route => route.fulfill({ status: 409, json: { code: 409, message: '工单状态已更新，请刷新后再操作' } }))
  await page.getByPlaceholder('公开回复对用户可见；内部备注仅管理端可见').fill('未发送的回复不能丢失')
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByText('工单状态已更新，请刷新后再操作', { exact: true })).toBeVisible()
  await expect(page.getByPlaceholder('公开回复对用户可见；内部备注仅管理端可见')).toHaveValue('未发送的回复不能丢失')
})

test('提交人在我的反馈中能看到处理结果和页面快照', async ({ page }) => {
  await session(page)
  await apiBase(page)
  const ticket = { id: 501, title: '保存按钮问题', description: '点击保存按钮无响应', category: 'bug', status: 'resolved', created_at: '2026-11-01T10:00:00', resolution_summary: '保存事件已修复并上线', page_context: { url: USER + '/camp?sid=8' }, attachments: [{ id: 1, kind: 'snapshot', original_name: 'page.jpg', url: '/feedback-tickets/attachments/1' }], messages: [] }
  await page.route(API + '/feedback-tickets/mine?*', route => route.fulfill({ json: { code: 200, tickets: [ticket], total: 1 } }))
  await page.route(API + '/feedback-tickets/501', route => route.fulfill({ json: { code: 200, ticket } }))
  await page.route(API + '/feedback-tickets/attachments/1', route => route.fulfill({ contentType: 'image/png', body: PNG }))
  await page.goto(USER + '/user-center/my-feedbacks')
  await page.getByRole('button', { name: '详情', exact: true }).click()
  await expect(page.getByText('处理结果：保存事件已修复并上线', { exact: true })).toBeVisible()
  await expect(page.getByText('页面快照', { exact: true })).toBeVisible()
  await expect(page.getByText(USER + '/camp?sid=8', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '报个Bug', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '报个Bug', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '问题反馈', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '预览页面快照' })).toBeVisible({ timeout: 15000 })
})
