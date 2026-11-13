import { test, expect } from '@playwright/test'

const BASE = 'http://127.0.0.1:18096/AMEII'
async function enter(page, name) {
  await page.goto(`${BASE}/dev/project-workspace`)
  await page.locator('.preview-roles .dew-card').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('button', { name: '进入工作台' }).click()
  await expect(page.locator('.project-workspace')).toBeVisible()
  await expect(page.locator('.pws-loading')).toHaveCount(0)
}
const nav = (page, name) => page.getByRole('navigation', { name: '项目营功能' }).getByRole('button', { name, exact: true })

test('真实负责人：侧栏、延迟加载、节点定位与历史恢复', async ({ page }) => {
  const errors = [], urls = []; page.on('pageerror', e => errors.push(e.message)); page.on('request', r => urls.push(r.url()))
  await enter(page, '负责人演示')
  await expect(page.locator('.pws-title h1')).toContainText('本地试用')
  await expect(page.locator('.hero-progress')).toHaveCount(0)
  expect(urls.filter(u => u.includes('/meetings') || u.includes('/outcomes'))).toEqual([])
  await nav(page, '节点与交付').click()
  await page.locator('.pm-node-nav').getByRole('button', { name: /结题报告/ }).click()
  await expect(page).toHaveURL(/node=/)
  await expect(page.locator('.ms-body')).toContainText('结题报告')
  await page.reload(); await expect(page.locator('.ms-body')).toContainText('结题报告')
  await nav(page, '组会与记录').click(); await expect(page.locator('.camp-meetings')).toContainText('方案与验证讨论')
  await page.goBack(); await expect(page.locator('.ms-body')).toContainText('结题报告')
  expect(errors).toEqual([])
})

test('真实成员：草稿保留、提交新版本、只见本人材料', async ({ page }) => {
  await enter(page, '成员演示'); await nav(page, '节点与交付').click()
  const body = page.locator('.ms-body')
  await expect(body).not.toContainText('双身份演示')
  await expect(body.locator('.chain-item')).toHaveCount(1)
  const marker = `本地交付检查 ${Date.now()}`
  await body.locator('textarea').fill(marker)
  await nav(page, '组会与记录').click(); await nav(page, '节点与交付').click()
  await expect(body.locator('textarea')).toHaveValue(marker)
  await body.getByRole('button', { name: /重提新版本|提交/, exact: true }).click()
  await expect(body.locator('.chain-content').filter({ hasText: marker })).toBeVisible()
  await nav(page, '项目成员').click(); await expect(page.locator('.pwl-roster')).toHaveCount(3)
})

test('真实负责人：0分评价写回后仍保留当前节点', async ({ page }) => {
  await enter(page, '负责人演示'); await nav(page, '节点与交付').click()
  const row = page.locator('.mem-row').filter({ hasText: '成员演示' })
  await row.getByRole('button', { name: /评价|修改/, exact: true }).click()
  await page.locator('.eval-form input[type=number]').fill('0')
  await page.getByRole('button', { name: '保存评价', exact: true }).click()
  await expect(row.locator('.eval-score')).toHaveText('0 分')
  await expect(page.locator('.pm-node-nav [aria-current=step]')).toContainText('样机测试')
})

test('真实老师：全营到单项目只读、组会按项目过滤', async ({ page }) => {
  await enter(page, '管理老师演示'); await nav(page, '项目总览').click()
  await page.locator('.project-dashboard').getByRole('button', { name: '智能肺康复口琴', exact: true }).click()
  await expect(page.locator('.pws-breadcrumb')).toContainText('智能肺康复口琴')
  await nav(page, '节点与交付').click(); await expect(page.locator('.pwr')).toContainText('只读查看')
  await expect(page.getByRole('button', { name: '评价', exact: true })).toHaveCount(0)
  await nav(page, '组会与记录').click(); await expect(page.locator('.teacher-meetings')).toContainText('方案与验证讨论')
})

test('切换项目保留栏目、无效项目不默认提交到首个项目', async ({ page }) => {
  await enter(page, '负责人演示'); await nav(page, '节点与交付').click()
  await page.locator('.pws-scope').click(); await page.getByText('质子治疗计划优化 · 成员', { exact: true }).click()
  await expect(page).toHaveURL(/tab=delivery/)
  await expect(page.locator('.pws-page-heading')).toContainText('质子治疗计划优化')
  await expect(page.getByRole('button', { name: '管理节点计划' })).toHaveCount(0)
  await page.goto(`${BASE}/camp?sid=1&scope=project&unit=999999&tab=delivery`)
  await expect(page.locator('.pws-notice')).toContainText('不在当前可访问列表')
  await expect(page.locator('.submit-box')).toHaveCount(0)
})

test('节点通知通过真实授权解析项目，非法节点不回落到可写页面', async ({ page }) => {
  await enter(page, '成员演示')
  await page.goto(`${BASE}/camp?sid=1&scope=project&tab=delivery&node=2`)
  await expect(page).toHaveURL(/unit=1/); await expect(page.locator('.pm-node-nav [aria-current=step]')).toContainText('样机测试')
  await page.goto(`${BASE}/camp?sid=1&scope=project&unit=1&tab=delivery&node=999999`)
  await expect(page.locator('.pm-content [role=alert]')).toContainText('不属于当前项目')
  await expect(page.locator('.submit-box')).toHaveCount(0)
})

test('旧积分链接沿用营期范围与真实奖励接口', async ({ page }) => {
  const points = []; page.on('request', r => { if (r.url().includes('/points/camps/')) points.push(r.url()) })
  await enter(page, '成员演示'); await page.goto(`${BASE}/camp?sid=1&tab=points`)
  await expect(page.locator('.pws-breadcrumb')).toContainText('营期事务')
  await expect(page.locator('.camp-points')).toBeVisible()
  expect(points.some(u => u.includes('/points/camps/1/tasks'))).toBe(true)
  expect(points.some(u => u.includes('/points/camps/1/rewards'))).toBe(true)
})

test('窄屏导航与实际交付详情不会撑出工作区', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 850 }); await enter(page, '负责人演示')
  await page.getByRole('button', { name: '展开菜单', exact: true }).click(); await nav(page, '节点与交付').click()
  await expect(page.locator('.pm-node-nav')).toBeVisible()
  expect(await page.locator('.project-workspace').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  await page.screenshot({ path: '/tmp/project-workspace-mobile-actual.png', fullPage: true })
})

test('双身份使用有效视角切换，成员模式不残留老师内容', async ({ page }) => {
  await enter(page, '双身份演示')
  await expect(nav(page, '项目总览')).toBeVisible()
  await page.locator('.pws-top-controls .dew-select').click()
  await page.getByText('项目参与者', { exact: true }).click()
  await expect(nav(page, '项目总览')).toHaveCount(0)
  await nav(page, '节点与交付').click()
  await expect(page.locator('.ms-body')).not.toContainText('成员演示')
})

test('培训营保留原学习工作台，结营项目使用冻结档案只读', async ({ page, request }) => {
  const health = await (await request.get('http://127.0.0.1:5016/preview/health')).json()
  await enter(page, '负责人演示')
  await page.goto(`${BASE}/camp?sid=${health.camps.training}`)
  await expect(page.locator('.project-workspace')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '学习方向', exact: true })).toBeVisible()
  await page.goto(`${BASE}/camp?sid=${health.camps.archived}`)
  await expect(page.locator('.pwa')).toContainText('结营冻结记录')
  await nav(page, '节点与交付').click()
  await expect(page.locator('.pwa')).toContainText('历史交付记录')
  await expect(page.locator('.submit-box')).toHaveCount(0)
  await nav(page, '成果与归档').click()
  await expect(page.locator('.pwa')).toContainText('历史结题报告')
})

test('成果登记和公告迁入新工作区后可以实际操作', async ({ page }) => {
  await enter(page, '负责人演示'); await nav(page, '成果与归档').click()
  await page.getByRole('button', { name: '登记成果', exact: true }).click()
  const title = `本地成果检查 ${Date.now()}`
  await page.getByPlaceholder('如：样机一台 / 论文一篇 / 开源仓库').fill(title)
  await page.getByRole('button', { name: '提交登记', exact: true }).click()
  await expect(page.locator('.outcome-list')).toContainText(title)
  await nav(page, '营期公告').click()
  await expect(page.locator('.pwl-row')).toContainText('本地工作台试用')
  await nav(page, '活动考勤').click()
  await expect(page.locator('.project-activities')).toBeVisible()
})
