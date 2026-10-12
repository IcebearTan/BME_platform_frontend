import { test, expect } from '@playwright/test'

const API = 'http://127.0.0.1:5001'
const USER = 'http://127.0.0.1:18081/AMEII'
const ADMIN = 'http://127.0.0.1:15173/admin'
const session = (status = 'running') => ({ id: 30, name: '项目营交付检查', category: 'project', status,
  start_date: '2026-10-01', end_date: '2026-12-01', is_member: true, my_role: 'member',
  policy: { capabilities: { attendance: false, leave: false, seat: false } } })

async function login(page, admin = false) {
  await page.addInitScript((isAdmin) => {
    const client = isAdmin ? 'admin' : 'user'
    localStorage.setItem(`bme-${client}-token`, 'e2e-mock-token')
    localStorage.setItem(`bme-${client}-state`, JSON.stringify({ token: 'e2e-mock-token',
      isLogin: true, isDarkMode: false, user: { role: isAdmin ? 'super_admin' : 'user' }, checkinInfo: {} }))
  }, admin)
  await page.route(`${API}/**`, (route) => {
    if (route.request().url().includes('/user/user_index')) return route.fulfill({ json: {
      code: 200, role: admin ? 'super_admin' : 'user', permissions: [], User_Name: '测试用户' } })
    return route.fulfill({ json: { code: 200, data: {}, message: 'ok' } })
  })
}

test('项目营修复：单人负责人提交与管理员验收结果', async ({ page }) => {
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await login(page)
  await page.route(`${API}/camp/sessions`, r => r.fulfill({ json: { code: 200, sessions: [session()] } }))
  await page.route(`${API}/camp/projects/30/mine`, r => r.fulfill({ json: { code: 200, leading: [
    { unit_id: 41, name: '单人研发项目', status: 'active', my_role: 'leader', leader_user_id: 61,
      leader_name: '负责人', member_count: 1 }], joining: [], applications: [] } }))
  let submitted = false
  let complete = false
  await page.route(`${API}/camp/units/41/milestones`, r => r.fulfill({ json: {
    code: 200, my_role: 'leader', can_submit: true, eval_members: [], milestones: [{ id: 501,
      title: '样机验收', order_no: 1, status: complete ? 'approved' : submitted ? 'submitted' : 'open',
      completion_mode: 'leader_review', member_count: 0, evaluated_count: 0, node_complete: complete,
      evaluations: [], submissions: submitted ? [{ id: 81, version: 1, content: '独立完成的样机',
        status: complete ? 'approved' : 'submitted', attachments: [], review_note: complete ? '通过测试' : null }] : [] }] } }))
  let body = ''
  await page.route(`${API}/camp/milestones/501/submissions`, r => {
    submitted = true
    body = r.request().postData()
    return r.fulfill({ json: { code: 200, message: '已提交' } })
  })
  await page.goto(`${USER}/camp?sid=30`)
  await page.getByRole('button', { name: '我负责的' }).click()
  await expect(page.getByText('负责人交付 · 管理员验收')).toBeVisible()
  await expect(page.locator('.submit-box')).toBeVisible()
  await expect(page.getByRole('button', { name: '评价', exact: true })).toHaveCount(0)
  await page.locator('.file-input-hidden').setInputFiles(Array.from({ length: 21 }, (_, i) => ({
    name: `${i}.txt`, mimeType: 'text/plain', buffer: Buffer.from('small file'),
  })))
  await expect(page.getByText('附件合计不能超过48MB，且最多20个')).toBeVisible()
  await page.locator('.submit-box textarea').fill('独立完成的样机')
  await page.locator('.submit-box').getByRole('button', { name: '提交', exact: true }).click()
  await expect(page.locator('.chain-content')).toContainText('独立完成的样机')
  expect(body).toContain('独立完成的样机')
  complete = true
  await page.reload()
  await page.getByRole('button', { name: '我负责的' }).click()
  await expect(page.getByText('管理员已验收')).toBeVisible()
  await expect(page.locator('.submit-box')).toHaveCount(0)
  await expect(page.getByText('审核说明：通过测试')).toBeVisible()
  expect(errors).toEqual([])
})

test('项目营修复：管理端附件先换短签，审核请求仍可用', async ({ page, context }) => {
  await login(page, true)
  await page.route(`${API}/camp/sessions/30`, r => r.fulfill({ json: { code: 200, session: session() } }))
  let pending = true
  await page.route(`${API}/camp/sessions/30/delivery-admin`, r => r.fulfill({ json: {
    code: 200, outcomes: [], pending_reviews: pending ? [{ submission_id: 81, unit_name: '单人研发',
      milestone_title: '验收', submitted_by_name: '负责人', version: 1, attachments: [{ id: 91, filename: '样机报告.txt' }] }] : [] } }))
  let authorization
  await page.route(`${API}/camp/submissions/attachments/91/token`, r => {
    authorization = r.request().headers().authorization
    return r.fulfill({ json: { code: 200, url: '/camp/submissions/attachments/91?st=short-sign&u=1&e=9999999999' } })
  })
  await context.route(`${API}/camp/submissions/attachments/91?*`, r => r.fulfill({ contentType: 'text/plain', body: 'report' }))
  await page.route(`${API}/camp/submissions/81/review`, r => {
    expect(r.request().postDataJSON()).toEqual({ action: 'approve' })
    pending = false
    return r.fulfill({ json: { code: 200 } })
  })
  await page.goto(`${ADMIN}/camps/30/project/deliveries`)
  const popupPromise = page.waitForEvent('popup')
  await page.getByRole('button', { name: '样机报告.txt' }).click()
  const popup = await popupPromise
  await expect(popup).toHaveURL(/st=short-sign/)
  expect(authorization).toBe('Bearer e2e-mock-token')
  await popup.close()
  await page.getByRole('button', { name: '通过', exact: true }).click()
  await expect(page.getByText('没有待你审核的材料')).toBeVisible()
})

test('项目营修复：归档空修正、追加修正和只读操作', async ({ page }) => {
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await login(page, true)
  await page.route(`${API}/camp/sessions/30`, r => r.fulfill({ json: { code: 200, session: session('archived') } }))
  const revisions = []
  await page.route(`${API}/camp/sessions/30/archive`, r => r.fulfill({ json: {
    code: 200, archive: { id: 1, version: revisions.length + 1, frozen_at: '2026-10-13', snapshot: { units: [] } }, revisions } }))
  await page.route(`${API}/camp/sessions/30/archive/revisions`, r => {
    expect(r.request().postDataJSON()).toEqual({ reason: '补充成果说明', expected_version: 1 })
    revisions.push({ version: 2, reason: '补充成果说明', created_at: '2026-10-13' })
    return r.fulfill({ json: { code: 200, message: '已登记' } })
  })
  await page.goto(`${ADMIN}/camps/30/project/archive`)
  await expect(page.getByText('修正 0 次', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: '登记修正' }).click()
  await page.locator('.el-message-box__input input').fill('补充成果说明')
  await page.getByRole('button', { name: '登记', exact: true }).click()
  await expect(page.getByText('修正 1 次', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: '修正记录（1）' }).click()
  await expect(page.getByText('补充成果说明', { exact: false })).toBeVisible()
  await page.route(`${API}/camp/sessions/30/delivery-admin`, r => r.fulfill({ json: { code: 200,
    pending_reviews: [{ submission_id: 81, attachments: [] }], outcomes: [{ id: 2, title: '历史成果', status: 'submitted' }] } }))
  await page.goto(`${ADMIN}/camps/30/project/deliveries`)
  await expect(page.getByRole('button', { name: '通过', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '核验', exact: true })).toHaveCount(0)
  expect(errors).toEqual([])
})

test('项目营修复：申报页不再选择失效交付模式', async ({ page }) => {
  await login(page)
  const camp = { ...session('upcoming'), is_member: false, my_role: null }
  await page.route(`${API}/camp/sessions`, r => r.fulfill({ json: { code: 200, sessions: [camp] } }))
  await page.route(`${API}/camp/projects/30/mine`, r => r.fulfill({ json: {
    code: 200, can_apply: true, applications: [], leading: [], joining: [] } }))
  await page.goto(`${USER}/camp?sid=30`)
  await expect(page.getByText('多人项目由成员交付、负责人评价；单人项目由负责人交付、管理员验收。')).toBeVisible()
  await expect(page.getByText('整队交付（负责人交·老师审）')).toHaveCount(0)
})
