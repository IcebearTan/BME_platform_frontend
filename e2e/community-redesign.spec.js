import { test, expect } from '@playwright/test'

// 社区广场重设计（09-19）：公告条 / 推文精选带 / 分层混排卡片 / 帖子图集 /
// 回复折叠 / XLAB 引流卡 / 发帖弹层。mock 后端，契约对齐 blueprints/community.py。

const BASE = 'http://127.0.0.1:18081/AMEII'

// 1x1 PNG（封面/图集 DewImage 的 /media 请求需要真图，否则走 error 兜底）
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

const FEED = {
  code: 200,
  data: [
    { type: 'discussion', id: 51, title: '带图帖子', summary: '一张现场图分享',
      images: ['/media/discussions/t/a.webp', '/media/discussions/t/b.webp'],
      category: 'recruit', category_text: '招人', project_id: 801, project_title: '智能输液监护',
      project_summary: '病房样机', project_cover_thumb: '/media/showcase/801/c_thumb.webp',
      project_status: 'ongoing', project_status_text: '进行中', project_source: 'community',
      project_source_text: '自由分享', project_tags: ['医疗设备'], project_view_count: 9,
      author_id: 11, author_name: '陈嘉树', author_avatar: '', author_badge: '社长',
      created_at: '2026-09-18 09:00:00', reply_count: 2, like_count: 1, view_count: 9,
      is_pinned: false,
      replies: [{ id: 1, author_id: 12, author_name: '林知遥', author_avatar: '', content: '第一条回复内容', like_count: 0, liked: false, created_at: '2026-09-18 10:00:00' }] },
    { type: 'article', id: 61, article_id: 61, article_version: 2, title: '带封面文章',
      summary: '封面左图右文中卡', cover: '/media/articles/61/c.webp', cover_thumb: '/media/articles/61/c_thumb.webp',
      images: [],
      author_id: 12, author_name: '林知遥', author_avatar: '', author_badge: '组长',
      created_at: '2026-09-17 20:00:00', reply_count: 0, like_count: 3, view_count: 20, is_pinned: false },
  ],
  total: 2, page: 1, per_page: 20, pages: 1,
}

const SPOTLIGHT = {
  code: 200,
  data: [
    { id: 71, title: '官方推文一：新学期招募', summary: '封面大卡', cover: '/media/articles/71/s.webp',
      cover_thumb: '/media/articles/71/s_thumb.webp', author_id: 5, author_name: '管理员', publish_time: '2026-09-19 09:00:00' },
    { id: 72, title: '官方推文二：实验室开放日', summary: '封面大卡', cover: '/media/articles/72/s.webp',
      cover_thumb: '/media/articles/72/s_thumb.webp', author_id: 5, author_name: '管理员', publish_time: '2026-09-18 09:00:00' },
  ],
}

const NOTICES = {
  code: 200,
  data: { notifications: [
    { id: 1, title: '系统维护通知：周日凌晨停机', category: 'system', is_important: true, is_read: false, created_at: '2026-09-19 08:00:00' },
    { id: 2, title: '非重要的普通通知', category: 'system', is_important: false, is_read: false, created_at: '2026-09-19 07:00:00' },
  ], total: 2, unread_count: 2, page: 1, per_page: 5 },
}

const PROJECTS = {
  code: 200, total: 2, all_tags: [],
  projects: [
    { id: 801, source: 'community', source_text: '自由分享', title: '智能输液监护', summary: '病房样机',
      cover: '/media/showcase/801/c.webp', cover_thumb: '/media/showcase/801/c_thumb.webp', images: [], tags: [],
      project_status: 'ongoing', project_status_text: '进行中', status: 'visible', view_count: 9, favorite_count: 0,
      members: [], links: [], owner_name: 'proj_s1', created_at: '2026-09-01T10:00:00' },
    { id: 802, source: 'camp', source_text: '营期项目', title: '宿舍门锁', summary: '旧平板改造',
      cover: null, cover_thumb: null, images: [], tags: [], project_status: 'ongoing', project_status_text: '进行中',
      status: 'visible', view_count: 7, favorite_count: 0, members: [], links: [], camp_name: '秋季项目营',
      owner_name: 'proj_s2', created_at: '2026-09-02T10:00:00' },
  ],
}

async function mockCommunity(page) {
  // 挂 context 级：新开标签页（popup）与原页共享同一 context 的 mock 与 init script
  await page.context().addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: 'user', User_Id: '0000011' }, checkinInfo: {},
    }))
  })
  await page.context().route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/media/')) {
      return route.fulfill({ contentType: 'image/png', body: PNG_1PX })
    }
    if (url.includes('/community/spotlight')) {
      return route.fulfill({ json: SPOTLIGHT })
    }
    if (url.includes('/notification/list')) {
      return route.fulfill({ json: NOTICES })
    }
    if (url.includes('/showcase/projects')) {
      // 面板请求带 sort/limit/project_status（XLab 引流优化 §7.1 契约）；发帖下拉无参全量
      const u = new URL(url)
      let projects = PROJECTS.projects.slice()
      const ps = u.searchParams.get('project_status')
      if (ps) projects = projects.filter(p => p.project_status === ps)
      const sort = u.searchParams.get('sort')
      if (sort === 'popular') projects.sort((a, b) => b.view_count - a.view_count)
      else if (sort === 'latest') projects.sort((a, b) => b.created_at.localeCompare(a.created_at))
      const limit = u.searchParams.get('limit')
      if (limit) projects = projects.slice(0, Number(limit))
      return route.fulfill({ json: { ...PROJECTS, projects, total: projects.length } })
    }
    if (url.includes('/community/feed')) {
      return route.fulfill({ json: FEED })
    }
    if (/\/discussions\/threads\/51\/replies/.test(url)) {
      return route.fulfill({ json: { code: 200, data: [
        { id: 1, author_id: 12, author_name: '林知遥', author_avatar: '', content: '第一条回复内容',
          like_count: 0, liked: false, created_at: '2026-09-18 10:00:00' },
        { id: 2, author_id: 13, author_name: '周启航', author_avatar: '', content: '第二条回复内容',
          like_count: 1, liked: false, created_at: '2026-09-18 11:00:00' },
      ], total: 2, page: 1, per_page: 20, pages: 1 } })
    }
    if (/\/discussions\/threads\/\d+$/.test(url)) {
      return route.fulfill({ json: { code: 200, data: {
        id: 51, title: '带图帖子', content: '一张现场图分享，这里是完整正文。',
        images: ['/media/discussions/t/a.webp', '/media/discussions/t/b.webp'],
        category: 'recruit', category_text: '招人', project_id: 801, project_title: '智能输液监护',
        scope_type: 'global', scope_id: null, author_id: 11, author_name: '陈嘉树', author_avatar: '',
        status: 'normal', is_pinned: false, pinned_effective: false, is_essence: false,
        reply_count: 2, like_count: 1, view_count: 9, liked: false, created_at: '2026-09-18 09:00:00',
      } } })
    }
    if (url.includes('/discussions/threads') && route.request().method() === 'POST') {
      return route.fulfill({ json: { code: 201, message: 'created', data: { id: 99 } } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('社区重设计：公告条 + 推文精选带', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockCommunity(page)

  await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' })
  // 公告条：取 system + is_important 的一条（普通通知不上条）
  const bar = page.locator('.notice-bar')
  await expect(bar).toBeVisible()
  await expect(bar).toContainText('系统维护通知')
  await expect(bar).not.toContainText('非重要的普通通知')

  // 精选带：两张官方推文大卡，封面图挂上，点击进阅读页
  await expect(page.locator('.spotlight-card')).toHaveCount(2)
  const card1 = page.locator('.spotlight-card').first()
  await expect(card1).toContainText('官方推文一')
  await expect(card1.locator('.spotlight-card__cover img')).toHaveAttribute('src', /71\/s\.webp$/)
  // 点击新开标签页打开（社区页原地保留）
  const [readTab] = await Promise.all([
    page.waitForEvent('popup'),
    card1.click(),
  ])
  await expect(readTab).toHaveURL(new RegExp(`/article-v2.*id=71`))
  await expect(page).toHaveURL(/\/community$/)

  expect(errors).toEqual([])
})

test('社区重设计：分层混排卡片（文章封面 / 帖子图集 / 回复折叠）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockCommunity(page)

  await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' })
  // 文章卡：左图右文，封面缩略挂上
  const ac = page.locator('.article-card').first()
  await expect(ac).toContainText('带封面文章')
  await expect(ac.locator('.ac-cover img')).toHaveAttribute('src', /61\/c_thumb\.webp$/)

  // 帖子卡：图集两张网格
  const dc = page.locator('.discussion-card').first()
  await expect(dc).toContainText('带图帖子')
  await expect(dc.locator('.dc-images--2 .dc-images__item')).toHaveCount(2)

  // 回复不在卡内联：点击卡片新开标签页进详情页（09-20；点标题区域避开作者行 stop 区）
  await expect(dc.locator('.dc-replies')).toHaveCount(0)
  const [threadTab] = await Promise.all([
    page.waitForEvent('popup'),
    dc.locator('.dc-title').click(),
  ])
  await expect(threadTab).toHaveURL(/\/community\/thread\/51$/)
  await expect(threadTab.locator('.t-title')).toHaveText('带图帖子')
  await expect(threadTab.locator('.reply-item')).toHaveCount(2)
  // 详情页回复提交
  await threadTab.locator('.reply-input-row textarea').fill('详情页回复联调')
  const replyReq = threadTab.waitForRequest((req) =>
    /\/discussions\/threads\/51\/replies$/.test(req.url()) && req.method() === 'POST')
  await threadTab.locator('.reply-input-row button', { hasText: '回复' }).click()
  expect((await replyReq).postDataJSON()).toEqual({ content: '详情页回复联调' })
  await threadTab.close()

  expect(errors).toEqual([])
})

test('社区 XLAB 信号面板：主/次项目 + 排序切换 + 导流', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockCommunity(page)

  await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' })
  const panel = page.locator('.community-xlab-panel')
  await expect(panel).toBeVisible()

  // 默认 latest：created_at 新者（802 宿舍门锁）为主项目，801 为唯一次项目
  await expect(panel.locator('.cxp-main')).toContainText('宿舍门锁')
  await expect(panel.locator('.cxp-rest__btn')).toHaveCount(1)
  await expect(panel.locator('.cxp-rest__btn')).toContainText('智能输液监护')

  // 主项目点击：新开标签页进 XLAB 详情，社区页原地保留
  const [projTab] = await Promise.all([
    page.waitForEvent('popup'),
    panel.locator('.cxp-main').click(),
  ])
  await expect(projTab).toHaveURL(/\/projects\/802$/)
  await projTab.close()
  await expect(page).toHaveURL(/\/community$/)

  // 切「最多浏览」：请求带 sort=popular + limit=3，主项目变为浏览量更高的 801
  const popularReq = page.waitForRequest((req) =>
    req.url().includes('/showcase/projects') && req.url().includes('sort=popular'))
  await panel.getByRole('tab', { name: '最多浏览' }).click()
  const popularUrl = (await popularReq).url()
  expect(popularUrl).toContain('project_status=ongoing')
  expect(popularUrl).toContain('limit=3')
  await expect(panel.locator('.cxp-main')).toContainText('智能输液监护')

  // 品牌行点击：进 XLAB 列表页（新标签页）
  const [xlabTab] = await Promise.all([
    page.waitForEvent('popup'),
    panel.locator('.cxp-brand').click(),
  ])
  await expect(xlabTab).toHaveURL(/\/projects$/)
  await xlabTab.close()

  expect(errors).toEqual([])
})

test('社区 XLAB 信号面板：错误态重试 + reduced-motion', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockCommunity(page)

  // 首次请求失败 → 面板内错误态（非全局 Toast），点重试恢复
  let failFirst = true
  await page.route(/\/showcase\/projects/, (route) => {
    if (failFirst) { failFirst = false; return route.fulfill({ status: 500, json: { code: 500 } }) }
    return route.fallback()
  })
  await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' })
  const panel = page.locator('.community-xlab-panel')
  await expect(panel.locator('.cxp-state')).toContainText('信号暂时中断')
  await panel.getByRole('button', { name: '重试' }).click()
  await expect(panel.locator('.cxp-main')).toContainText('宿舍门锁')

  // reduced-motion：扫描线动画关停（骨架/装饰动画不出现在 reduce 环境）
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const scan = panel.locator('.cxp-scan')
  await expect(scan).toBeVisible()
  const anim = await scan.evaluate((el) => getComputedStyle(el).animationName)
  expect(anim).toBe('none')

  expect(errors).toEqual([])
})


test('社区：发帖弹层（无话题发帖 + 候选全量）', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockCommunity(page)

  await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' })
  // 发帖：入口一行 → DewDialog 弹层 → 字数门槛可见 → POST body
  await page.locator('.post-entry').click()
  const dlg = page.locator('.dew-dialog').filter({ hasText: '发布新帖' })
  await expect(dlg).toBeVisible()
  const publish = dlg.getByRole('button', { name: '发布', exact: true })
  await expect(publish).toBeDisabled()
  await dlg.getByPlaceholder('标题（至少 4 字）').fill('联调发帖标题')
  await dlg.getByPlaceholder(/分享你的想法/).fill('这条帖子内容满足十个字的门槛')
  await expect(publish).toBeEnabled()
  const post = page.waitForRequest((req) =>
    req.url().includes('/discussions/threads') && req.method() === 'POST')
  await publish.click()
  const body = (await post).postDataJSON()
  expect(body).toEqual({ title: '联调发帖标题', content: '这条帖子内容满足十个字的门槛',
    scope_type: 'global', scope_id: null, category: null, project_id: null, images: [] })
  await expect(page.getByText('发布成功')).toBeVisible()

  expect(errors).toEqual([])
})


test('社区 XLAB 面板与关联卡：约 400px 窄屏不溢出', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockCommunity(page)

  await page.setViewportSize({ width: 400, height: 800 })
  await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' })
  // 右栏上移：只展示主项目（次项目隐藏），关联卡封面上文字在下
  await expect(page.locator('.community-xlab-panel .cxp-main')).toContainText('宿舍门锁')
  await expect(page.locator('.community-xlab-panel .cxp-rest')).toBeHidden()
  const lpc = page.locator('.linked-project-card').first()
  await expect(lpc).toBeVisible()
  // 约 400px 无横向溢出（§12.2.14）
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)

  expect(errors).toEqual([])
})


// Phase 2（09-20）：话题标签 + 关联 XLAB 项目（招人帖导流）
test('社区 Phase 2：帖子话题/项目 chip + 发帖选话题关联项目', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockCommunity(page)

  await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' })
  // 帖子卡：话题 tag + 关联项目大卡（feed 投影摘要：封面/状态/简介/浏览），点整卡进 XLAB 详情
  const dc = page.locator('.discussion-card').first()
  await expect(dc.locator('.dc-tags')).toContainText('招人')
  const lpc = dc.locator('.linked-project-card')
  await expect(lpc).toContainText('智能输液监护')
  await expect(lpc).toContainText('病房样机')
  await expect(lpc).toContainText('进行中')
  await expect(lpc).toContainText('自由分享')
  await expect(lpc.locator('.lpc-cover img')).toHaveAttribute('src', /showcase\/801\/c_thumb\.webp$/)
  const [cardTab] = await Promise.all([
    page.waitForEvent('popup'),
    lpc.click(),
  ])
  await expect(cardTab).toHaveURL(/\/projects\/801$/)
  await cardTab.close()

  // 键盘访问（§12.2.11）：Enter 原生导航、Space 由组件接管，均新开标签页
  await lpc.focus()
  const [enterTab] = await Promise.all([
    page.waitForEvent('popup'),
    page.keyboard.press('Enter'),
  ])
  await expect(enterTab).toHaveURL(/\/projects\/801$/)
  await enterTab.close()
  await lpc.focus()
  const [spaceTab] = await Promise.all([
    page.waitForEvent('popup'),
    page.keyboard.press('Space'),
  ])
  await expect(spaceTab).toHaveURL(/\/projects\/801$/)
  await spaceTab.close()

  // 话题筛选 chips 从 feed 聚合出现
  await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' })
  const topicBar = page.locator('.filter-bar .dew-bar').filter({ hasText: '招人' })
  await expect(topicBar).toBeVisible()

  // 发帖弹层：选「招人」话题 → 出现关联项目下拉 → POST body 带 category/project_id
  await page.locator('.post-entry').click()
  const dlg = page.locator('.dew-dialog').filter({ hasText: '发布新帖' })
  await expect(dlg).toBeVisible()
  await dlg.getByPlaceholder('标题（至少 4 字）').fill('招前端搭档联调帖')
  await dlg.getByPlaceholder(/分享你的想法/).fill('这篇帖子内容满足十个字的门槛')
  dlg.getByRole('button', { name: '招人' }).click()
  const projSelect = dlg.locator('.create-dlg__select')
  await expect(projSelect).toBeVisible()
  await projSelect.selectOption('801')
  const publish = dlg.getByRole('button', { name: '发布', exact: true })
  await expect(publish).toBeEnabled()
  const post = page.waitForRequest((req) =>
    req.url().includes('/discussions/threads') && req.method() === 'POST')
  await publish.click()
  const body = (await post).postDataJSON()
  expect(body.category).toBe('recruit')
  expect(body.project_id).toBe(801)
  await expect(page.getByText('发布成功')).toBeVisible()

  expect(errors).toEqual([])
})

// 我的帖子（个人中心「我的内容」子页，09-20）：列表 + 查看（新开页）/ 删除
test('个人中心：我的帖子列表与操作', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockCommunity(page)

  // mock 本人帖子列表（User_Id=0000011 → author_id=11；含一条已隐藏）
  await page.context().route(/\/discussions\/threads\?.*author_id=11/, (route) =>
    route.fulfill({ json: { code: 200, data: [
      { id: 51, title: '我发的招人帖', content: '内容', images: [], category: 'recruit',
        category_text: '招人', project_id: 801, project_title: '智能输液监护', scope_type: 'global',
        scope_id: null, author_id: 11, author_name: '陈嘉树', author_avatar: '', status: 'normal',
        is_pinned: false, pinned_effective: false, is_essence: false, reply_count: 2, like_count: 1,
        view_count: 9, created_at: '2026-09-20 09:00:00' },
      { id: 52, title: '被隐藏的帖子', content: '内容', images: [], category: null, category_text: null,
        project_id: null, project_title: null, scope_type: 'global', scope_id: null, author_id: 11,
        author_name: '陈嘉树', author_avatar: '', status: 'hidden', is_pinned: false,
        pinned_effective: false, is_essence: false, reply_count: 0, like_count: 0, view_count: 1,
        created_at: '2026-09-19 09:00:00' },
    ], total: 2, page: 1, per_page: 50, pages: 1 } }))

  await page.goto(`${BASE}/user-center/my-threads`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.page-title')).toHaveText('我的帖子')
  const row = page.locator('.thread-row').first()
  await expect(row).toContainText('我发的招人帖')
  await expect(row).toContainText('招人')
  await expect(row).toContainText('智能输液监护')
  // 隐藏帖也可见（本人视角）
  await expect(page.locator('.thread-row')).toHaveCount(2)
  await expect(page.locator('.thread-row').nth(1)).toContainText('已隐藏')

  // 查看按钮：新开标签页进详情
  const [tab] = await Promise.all([
    page.waitForEvent('popup'),
    row.getByRole('button', { name: '查看' }).click(),
  ])
  await expect(tab).toHaveURL(/\/community\/thread\/51$/)
  await tab.close()

  // 删除：确认后列表移除
  await page.route('**/discussions/threads/52', (route) => {
    if (route.request().method() === 'DELETE') return route.fulfill({ json: { code: 200 } })
    return route.fallback()
  })
  await page.locator('.thread-row').nth(1).getByRole('button', { name: '删除' }).click()
  // DewMessageBox 确认弹层：面板内第二个按钮为确认
  await page.locator('.dew-dialog-panel').getByRole('button').last().click()
  await expect(page.locator('.thread-row')).toHaveCount(1)

  expect(errors).toEqual([])
})
