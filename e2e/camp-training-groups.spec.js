import { test, expect } from '@playwright/test'

const members = [
  { user_id: 101, username: '林泽宇', role: 'mentor', status: 'active' },
  { user_id: 102, username: '陈思涵', role: 'mentor', status: 'active' },
  { user_id: 201, username: '李沐阳', role: 'student', status: 'active' },
]
const role = (id, name, scope = 0) => ({ id, role: name, active: true, scope_type: scope ? 'course' : 'group', scope_id: scope })
const groups = [
  { unit_id: 11, name: 'Web 开发组', direction: 'Web 开发', course_ids: [101, 102], owner_user_id: 101,
    members: [{ ...members[0], roles: [role(1, 'mentor')] }, { ...members[2], roles: [role(2, 'learner', 101)] }] },
  { unit_id: 12, name: '深度学习组', direction: '深度学习', course_ids: [201], owner_user_id: 102,
    members: [{ ...members[1], roles: [role(3, 'mentor')] }, { ...members[0], roles: [role(4, 'learner')] }] },
].map(g => ({ ...g, status: 'active', version: 3 }))
const camp = { id: 7, name: '秋季大二培训营 · 本地演示', category: 'learning', status: 'running',
  start_date: '2026-10-01', end_date: '2026-11-15', is_member: false, my_staff_role: 'owner',
  available_perspectives: ['teacher'], has_camp_access: true, mentor_selection_enabled: false,
  policy: { capabilities: { attendance: true, leave: true } },
  ms_directions: groups.map(g => ({ name: g.direction, course_ids: g.course_ids })) }

async function setup(page, app, dark = false, overrides = {}) {
  const errors = [], writes = []
  page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(({ app, dark }) => {
    localStorage.setItem('themeInitialized', 'true')
    localStorage.setItem(`bme-${app}-token`, 'isolated-ui-token')
    localStorage.setItem(`bme-${app}-state`, JSON.stringify({ token: 'isolated-ui-token', isLogin: true,
      isDarkMode: dark, user: { role: app === 'admin' ? 'super_admin' : 'user', verification_status: 'verified' }, checkinInfo: {} }))
  }, { app, dark })
  await page.route('http://127.0.0.1:5001/**', route => {
    const path = new URL(route.request().url()).pathname
    let json = { code: 200, data: {} }
    if (path === '/user/user_index') json = { code: 200, role: app === 'admin' ? 'super_admin' : 'user', permissions: [] }
    else if (path === '/camp/sessions') json = { code: 200, sessions: [{ ...camp, ...overrides }] }
    else if (path === '/camp/sessions/7') json = { code: 200, session: { ...camp, ...overrides } }
    else if (path.includes('/training-groups') && route.request().method() !== 'GET') {
      writes.push({ path, method: route.request().method(), data: route.request().postDataJSON() })
    } else if (path.endsWith('/training-groups')) json = { code: 200, ready: true, groups }
    else if (path.endsWith('/members')) json = { code: 200, members, total: members.length }
    else if (path.endsWith('/courses')) json = { code: 200, courses: [
      { course_id: 101, title: 'Web 前端基础' }, { course_id: 102, title: 'Web 服务端开发' }, { course_id: 201, title: '深度学习入门' }] }
    else if (path.endsWith('/teacher/overview')) json = { code: 200, overview: { counts: {}, work_items: [] } }
    else if (path.includes('join-requests')) json = { code: 200, requests: [] }
    else if (path === '/course/admin_list') json = []
    return route.fulfill({ json })
  })
  await page.goto(app === 'user' ? 'http://127.0.0.1:18081/AMEII/camp?sid=7' : 'http://127.0.0.1:15173/admin/camps/7/people/members')
  if (app === 'user') await page.getByRole('button', { name: '培训小组', exact: true }).click()
  await expect(page.locator('.training-panel').getByText('深度学习组', { exact: true })).toBeVisible()
  return { errors, writes }
}

for (const app of ['user', 'admin']) {
  for (const dark of [false, true]) {
    test(`${app} 培训小组：${dark ? '深色' : '浅色'}主题、课程名称与职责转交`, async ({ page }, info) => {
      await page.setViewportSize({ width: 1440, height: 1080 })
      const { errors, writes } = await setup(page, app, dark)
      const panel = page.locator('.training-panel')
      await expect(panel.getByText('林泽宇', { exact: true })).toHaveCount(2)
      await expect(panel.getByText('Web 前端基础', { exact: true })).toBeVisible()
      const colors = await panel.locator(app === 'user' ? '.el-table' : '.el-table td').first().evaluate(el => ({
        bg: getComputedStyle(el).backgroundColor, target: getComputedStyle(el).getPropertyValue('--dew-dialog-bg').trim(),
      }))
      const channels = colors.bg.match(/[\d.]+/g).slice(0, 3).map(Number)
      expect(channels.every(v => dark ? v < 80 : v > 200)).toBe(true)
      await page.screenshot({ path: info.outputPath(`${app}-${dark ? 'dark' : 'light'}.png`), fullPage: true })
      await panel.getByRole('button', { name: '添加职责', exact: true }).first().click()
      const dialog = page.locator('.dew-dialog').filter({ hasText: '添加职责 · Web 开发组' })
      await expect(dialog.getByRole('button', { name: '保存', exact: true })).toBeDisabled()
      await dialog.getByRole('combobox').first().click()
      await page.locator('.dew-select__option').filter({ hasText: '李沐阳' }).click()
      await dialog.getByRole('combobox').nth(1).click()
      await page.locator('.dew-select__option').filter({ hasText: 'Web 前端基础' }).click()
      await dialog.locator('.el-checkbox__label').click()
      await dialog.getByRole('button', { name: '保存', exact: true }).click()
      await expect.poll(() => writes.length).toBe(1)
      expect(writes[0].data).toMatchObject({ user_id: 201, role: 'learner', course_id: 101, transfer_courses: true, expected_version: 3 })
      expect(writes[0].data).not.toHaveProperty('attendance_required')
      await panel.getByRole('button', { name: '添加职责', exact: true }).first().click()
      await expect(dialog.getByRole('checkbox')).not.toBeChecked()
      await expect(dialog.getByText('本组全部课程', { exact: true })).toBeVisible()
      await expect(dialog).toBeVisible()
      await page.waitForTimeout(350)
      await page.screenshot({ path: info.outputPath(`${app}-dialog.png`) })
      expect(errors).toEqual([])
    })
  }
  test(`${app} 培训小组：创建、改名不重配课程、结束职责`, async ({ page }) => {
    const { errors, writes } = await setup(page, app)
    const panel = page.locator('.training-panel')
    await panel.getByRole('button', { name: '创建小组', exact: true }).click()
    let dialog = page.getByRole('dialog').filter({ hasText: '创建培训小组' })
    await expect(dialog.getByRole('button', { name: '创建', exact: true })).toBeDisabled()
    await dialog.getByRole('textbox').fill('Web 实践组')
    await dialog.getByRole('combobox').first().click()
    await page.locator('.dew-select__option').filter({ hasText: '林泽宇' }).click()
    await dialog.getByRole('combobox').nth(1).click()
    await page.locator('.dew-select__option').filter({ hasText: 'Web 开发' }).click()
    await dialog.getByRole('button', { name: '创建', exact: true }).click()
    await expect.poll(() => writes.length).toBe(1)
    expect(writes[0].data).toMatchObject({ name: 'Web 实践组', mentor_user_id: 101, direction: 'Web 开发', capacity: null })
    await panel.getByRole('button', { name: '调整小组', exact: true }).first().click()
    dialog = page.getByRole('dialog').filter({ hasText: '调整培训小组' })
    await dialog.getByRole('textbox').fill('Web 工程组')
    await dialog.getByRole('button', { name: '保存', exact: true }).click()
    await expect.poll(() => writes.length).toBe(2)
    expect(writes[1].data).toMatchObject({ name: 'Web 工程组', expected_version: 3 })
    expect(writes[1].data).not.toHaveProperty('course_ids')
    await panel.getByRole('button', { name: '结束职责', exact: true }).nth(1).click()
    dialog = page.getByRole('dialog').filter({ hasText: '原学习历史保留' })
    await dialog.getByRole('button', { name: '确认', exact: true }).click()
    await expect.poll(() => writes.length).toBe(3)
    expect(writes[2]).toMatchObject({ method: 'DELETE', data: { user_id: 201, role: 'learner', course_id: 101, expected_version: 3 } })
    await page.setViewportSize({ width: 390, height: 844 })
    if (app === 'admin') await page.locator('.sidebar-toggle').click()
    await panel.getByRole('button', { name: '添加职责', exact: true }).first().click()
    dialog = page.getByRole('dialog').filter({ hasText: '添加职责 · Web 开发组' })
    await expect(dialog).toBeVisible()
    const box = await dialog.boundingBox()
    expect(box.width).toBeLessThanOrEqual(390)
    expect(errors).toEqual([])
  })
  test(`${app} 培训小组：窄屏表单与归档只读`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const { errors } = await setup(page, app, false, { status: 'archived' })
    const panel = page.locator('.training-panel')
    await expect(panel.getByRole('button', { name: '创建小组', exact: true })).toBeDisabled()
    await expect(panel.getByRole('button', { name: '添加职责', exact: true })).toHaveCount(0)
    await expect(panel.getByRole('button', { name: '结束职责', exact: true })).toHaveCount(0)
    const box = await panel.boundingBox()
    expect(box.width).toBeLessThanOrEqual(390)
    expect(errors).toEqual([])
  })
}
