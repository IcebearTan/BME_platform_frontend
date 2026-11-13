import { test, expect } from '@playwright/test'
import { resolve } from 'node:path'

const BASE = 'http://127.0.0.1:18096/AMEII'
const API = 'http://127.0.0.1:5016'
const GUIDE_PREFIX = 'bme-user-project-guide-v1:'
const SCREENSHOTS = resolve(__dirname, '../../outputs/project-guide')
const tour = page => page.locator('.pwg-tour .el-tour__content')
const title = page => tour(page).locator('.pwg-title')
const replay = page => page.locator('.pws-header').getByRole('button', { name: '功能引导', exact: true })
const nav = (page, key) => page.locator(`.pws-nav [data-guide-tab="${key}"]`)

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state = JSON.parse(localStorage.getItem('bme-user-state') || '{}')
    if (!Object.hasOwn(state, 'isDarkMode')) state.isDarkMode = false
    localStorage.setItem('bme-user-state', JSON.stringify(state))
    localStorage.setItem('themeInitialized', 'true')
  })
})

async function enter(page, name = '负责人演示') {
  await page.goto(`${BASE}/dev/project-workspace`)
  await page.locator('.preview-roles .dew-card')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .getByRole('button', { name: '进入工作台', exact: true }).click()
  await expect(page.locator('.project-workspace')).toBeVisible()
  await expect(page.locator('.pws-loading')).toHaveCount(0)
  await expect(replay(page)).toBeEnabled()
}

async function preferenceKey(page) {
  return page.evaluate(prefix => {
    const user = JSON.parse(localStorage.getItem('bme-user-state')).user
    const id = user.User_Id || user.id || user.user_id
    if (!id) throw Error('登录态未包含用户 ID')
    return `${prefix}${id}`
  }, GUIDE_PREFIX)
}

async function preference(page, key) {
  return page.evaluate(storageKey => localStorage.getItem(storageKey), key)
}

function observeGuideEffects(page) {
  const writes = [], errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => {
    if (request.url().startsWith(API) && /\/(camp|project-core|attendance|points)\//.test(request.url())
      && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
      writes.push(`${request.method()} ${request.url()}`)
    }
  })
  return { writes, errors }
}

async function startInvitation(page) {
  await page.locator('.pwg-invitation').getByRole('button', { name: '开始了解', exact: true }).click()
  await expect(title(page)).toHaveText('让项目的每一步，都有方向')
  await expect(tour(page).locator('.pwg-counter')).toHaveText(/1\s*\/\s*[1-9]\d*/)
}

async function next(page, expectedTitle) {
  await tour(page).getByRole('button', { name: /^(开始导览|下一步)$/ }).click()
  if (expectedTitle) await expect(title(page)).toHaveText(expectedTitle)
}

// 检查实际 SVG 遮罩在目标中心挖空，防止步骤文案更新但聚光位置丢失。
async function expectSpotlight(page, target) {
  await expect(target).toBeInViewport()
  await expect.poll(async () => {
    const box = await target.boundingBox()
    if (!box) return false
    return page.locator('.pwg-tour .el-tour__hollow').evaluate((path, point) => {
      return !path.isPointInFill(new DOMPoint(point.x, point.y))
        && path.isPointInFill(new DOMPoint(2, 2))
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
  }).toBe(true)
}

async function completeTour(page, inspectStep = async () => {}) {
  const counter = tour(page).locator('.pwg-counter')
  await expect(counter).toHaveText(/1\s*\/\s*[1-9]\d*/)
  const total = Number((await counter.textContent()).split('/')[1].trim())
  const visited = []
  for (let step = 1; step <= total; step++) {
    await expect(counter).toHaveText(new RegExp(`^${step}\\s*/\\s*${total}$`))
    const heading = await title(page).textContent()
    visited.push(heading)
    await inspectStep(heading, step, total)
    if (step === total) await tour(page).getByRole('button', { name: '完成引导', exact: true }).click()
    else await next(page)
  }
  await expect(tour(page)).toHaveCount(0)
  return visited
}

test('首次邀请可以开始、前后切步与退出，聚光不改变当前工作位置', async ({ page }) => {
  await enter(page)
  await expect(page.locator('body')).toHaveClass(/theme-light/)
  await expect(page.locator('.pwg-invitation')).toBeVisible()
  const location = page.url()
  const selected = await page.locator('.pws-nav [aria-current="page"]').getAttribute('data-guide-tab')
  const effects = observeGuideEffects(page)
  await startInvitation(page)
  await expect(tour(page).locator('.pwg-map > div')).toHaveCount(3)
  await expect(tour(page).locator('.pwg-role')).toContainText('负责人')
  await page.screenshot({ path: `${SCREENSHOTS}/desktop-welcome.png`, animations: 'disabled' })
  await expect(tour(page).getByRole('button', { name: '上一步', exact: true })).toHaveCount(0)
  await next(page, '先确认你的工作范围')
  await expectSpotlight(page, page.locator('.pws-scope'))
  await next(page, '工作概览')
  await expectSpotlight(page, nav(page, 'overview'))
  await page.screenshot({ path: `${SCREENSHOTS}/desktop-spotlight.png`, animations: 'disabled' })
  await tour(page).getByRole('button', { name: '上一步', exact: true }).click()
  await expect(title(page)).toHaveText('先确认你的工作范围')
  await expectSpotlight(page, page.locator('.pws-scope'))
  await tour(page).getByRole('button', { name: '退出引导', exact: true }).click()
  await expect(tour(page)).toHaveCount(0)
  await expect(replay(page)).toBeFocused()
  expect(page.url()).toBe(location)
  await expect(nav(page, selected)).toHaveAttribute('aria-current', 'page')
  expect(effects.writes).toEqual([])
  expect(effects.errors).toEqual([])
})

test('稍后再看按用户记忆，刷新和重登录后可由固定入口重看', async ({ page }) => {
  await enter(page)
  const leaderKey = await preferenceKey(page)
  expect(await preference(page, leaderKey)).toBeNull()
  await page.locator('.pwg-invitation').getByRole('button', { name: '稍后再看', exact: true }).click()
  await expect(page.locator('.pwg-invitation')).toHaveCount(0)
  expect(await preference(page, leaderKey)).toBeTruthy()
  await page.reload()
  await expect(replay(page)).toBeEnabled()
  await expect(page.locator('.pwg-invitation')).toHaveCount(0)
  await replay(page).click()
  await expect(title(page)).toHaveText('让项目的每一步，都有方向')
  await tour(page).locator('.el-tour__closebtn').click()
  await expect(tour(page)).toHaveCount(0)
  await enter(page, '成员演示')
  const memberKey = await preferenceKey(page)
  expect(memberKey).not.toBe(leaderKey)
  expect(await preference(page, memberKey)).toBeNull()
  await expect(page.locator('.pwg-invitation')).toBeVisible()
  await enter(page)
  await expect(page.locator('.pwg-invitation')).toHaveCount(0)
  await replay(page).click()
  await expect(tour(page).locator('.pwg-counter')).toHaveText(/1\s*\//)
  await page.keyboard.press('Escape')
  await expect(tour(page)).toHaveCount(0)
  await expect(replay(page)).toBeFocused()
})

test('长期项目完成导览后记住状态，所有聚光仅指向现有入口且没有业务写请求', async ({ page }) => {
  await enter(page)
  await page.goto(`${BASE}/my-projects`)
  await page.locator('.pd-projects .dew-card').filter({ hasText: '独立项目 · 日历试用' })
    .getByRole('button', { name: '进入项目', exact: true }).click()
  await expect(replay(page)).toBeEnabled()
  await expect(page.locator('.pws-loading')).toHaveCount(0)
  const location = page.url(), key = await preferenceKey(page)
  const labels = await page.locator('.pws-nav [data-guide-tab]').evaluateAll(buttons =>
    Object.fromEntries(buttons.map(button => [button.textContent.trim(), button.dataset.guideTab])))
  const effects = observeGuideEffects(page)
  await startInvitation(page)
  const visited = await completeTour(page, async (heading, step, total) => {
    if (step === 1 || step === total || heading.startsWith('先确认你的')) return
    expect(labels[heading], `引导「${heading}」必须有当前身份的导航入口`).toBeTruthy()
    await expectSpotlight(page, nav(page, labels[heading]))
    if (heading === '项目日历') await expect(tour(page)).toContainText('D0 与研发计划由有权限的长期项目负责人维护')
  })
  expect(visited).toEqual(expect.arrayContaining(['项目日历', '记录与成果', '长期团队']))
  expect(page.url()).toBe(location)
  expect(await preference(page, key)).toBeTruthy()
  expect(effects.writes).toEqual([])
  expect(effects.errors).toEqual([])
  await page.reload()
  await expect(replay(page)).toBeEnabled()
  await expect(page.locator('.pwg-invitation')).toHaveCount(0)
  await replay(page).click()
  await expect(title(page)).toHaveText('让项目的每一步，都有方向')
})

test('成员引导只介绍可见功能，日历和交付文案符合成员权限', async ({ page }) => {
  await enter(page, '成员演示')
  await expect(nav(page, 'projects')).toHaveCount(0)
  await expect(nav(page, 'settings')).toHaveCount(0)
  const labels = await page.locator('.pws-nav [data-guide-tab]').evaluateAll(buttons =>
    buttons.map(button => button.textContent.trim()))
  const location = page.url(), effects = observeGuideEffects(page)
  await startInvitation(page)
  const visited = await completeTour(page, async (heading, step, total) => {
    if (step === 1 || step === total || heading.startsWith('先确认你的')) return
    expect(labels).toContain(heading)
    await expect(tour(page)).not.toContainText('负责人可设置 D0')
    if (heading === '项目日历') await expect(tour(page)).toContainText('由有权限的长期项目负责人维护')
    if (heading === '本期考核' || heading === '节点与交付') {
      await expect(tour(page)).toContainText('提交自己的说明和附件')
      await expect(tour(page)).not.toContainText('完成节点评价')
    }
  })
  expect(visited).not.toContain('项目总览')
  expect(visited.some(heading => ['本期考核', '节点与交付'].includes(heading))).toBe(true)
  expect(page.url()).toBe(location)
  expect(effects.writes).toEqual([])
  expect(effects.errors).toEqual([])
})

test('老师引导适配全营范围，单项目考核明确只读且没有成员提交说明', async ({ page }) => {
  await enter(page, '管理老师演示')
  await expect(nav(page, 'projects')).toBeVisible()
  const location = page.url(), effects = observeGuideEffects(page)
  await startInvitation(page)
  await expect(tour(page).locator('.pwg-role')).toContainText('管理老师')
  const visited = await completeTour(page)
  expect(visited).toEqual(expect.arrayContaining(['项目总览', '人员与组队', '组会总览']))
  expect(visited).not.toContain('项目日历')
  expect(page.url()).toBe(location)
  await nav(page, 'projects').click()
  await page.locator('.project-dashboard').getByRole('button', { name: '智能肺康复口琴', exact: true }).click()
  await expect(page.locator('.pws-loading')).toHaveCount(0)
  await replay(page).click()
  let checkedReadOnly = false
  await completeTour(page, async heading => {
    if (heading === '本期考核' || heading === '节点与交付') {
      checkedReadOnly = true
      await expect(tour(page)).toContainText('只读')
      await expect(tour(page)).not.toContainText('提交自己的说明和附件')
      await expectSpotlight(page, nav(page, 'delivery'))
    }
  })
  expect(checkedReadOnly).toBe(true)
  expect(effects.writes).toEqual([])
  expect(effects.errors).toEqual([])
})

test('窄屏深色导览能定位折叠菜单，结束后还原菜单且浮层不溢出屏幕', async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 850 })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const state = JSON.parse(localStorage.getItem('bme-user-state') || '{}')
    state.isDarkMode = true
    localStorage.setItem('bme-user-state', JSON.stringify(state))
    localStorage.setItem('themeInitialized', 'true')
  })
  await enter(page)
  await expect(page.locator('body')).toHaveClass(/theme-dark/)
  const location = page.url()
  const menu = page.locator('.pws-mobile button')
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.pws-nav')).toBeHidden()
  await startInvitation(page)
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await page.screenshot({ path: `${SCREENSHOTS}/mobile-dark-welcome.png`, animations: 'disabled' })
  await next(page, '先确认你的工作范围')
  await expectSpotlight(page, page.locator('.pws-scope'))
  await next(page, '工作概览')
  await expectSpotlight(page, nav(page, 'overview'))
  const box = await tour(page).boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(401)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(851)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await tour(page).getByRole('button', { name: '退出引导', exact: true }).click()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.pws-nav')).toBeHidden()
  expect(page.url()).toBe(location)
  await menu.click()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
  await replay(page).click()
  await page.keyboard.press('Escape')
  await expect(tour(page)).toHaveCount(0)
  await expect(menu).toHaveAttribute('aria-expanded', 'true')
})
