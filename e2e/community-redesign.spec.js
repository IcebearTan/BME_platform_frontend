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
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: 'user', User_Id: '0000011' }, checkinInfo: {},
    }))
  })
  await page.route('http://127.0.0.1:5001/**', (route) => {
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
      return route.fulfill({ json: PROJECTS })
    }
    if (url.includes('/community/feed')) {
      return route.fulfill({ json: FEED })
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
  await card1.click()
  await expect(page).toHaveURL(new RegExp(`/article-v2.*id=71`))

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

  // 回复默认折叠为摘要行（count=2），点击展开
  const toggle = dc.locator('.dc-replies-toggle')
  await expect(toggle).toContainText('查看 2 条回复')
  await expect(dc.locator('.dc-reply')).toHaveCount(0)
  await toggle.click()
  await expect(dc.locator('.dc-reply').first()).toContainText('第一条回复内容')

  expect(errors).toEqual([])
})

test('社区重设计：XLAB 引流卡 + 发帖弹层', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockCommunity(page)

  await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' })
  // 项目现场：两个进行中项目，点击进 XLAB 详情
  const xlab = page.locator('.xlab-card')
  await expect(xlab).toBeVisible()
  await expect(xlab.locator('.xlab-item')).toHaveCount(2)
  await xlab.locator('.xlab-item').first().click()
  await expect(page).toHaveURL(/\/projects\/801$/)
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


// Phase 2（09-20）：话题标签 + 关联 XLAB 项目（招人帖导流）
test('社区 Phase 2：帖子话题/项目 chip + 发帖选话题关联项目', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await mockCommunity(page)

  await page.goto(`${BASE}/community`, { waitUntil: 'domcontentloaded' })
  // 帖子卡：话题 tag + 关联项目 chip，点 chip 进 XLAB 详情
  const dc = page.locator('.discussion-card').first()
  await expect(dc.locator('.dc-tags')).toContainText('招人')
  await expect(dc.locator('.dc-project')).toContainText('智能输液监护')
  await dc.locator('.dc-project').click()
  await expect(page).toHaveURL(/\/projects\/801$/)

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
