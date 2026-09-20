import { test, expect } from '@playwright/test'

// 官方富文本推文（方案 §16.3/§16.4 关键路径，mock 后端，无依赖）：
// - HTML 文章按 content_type 分流到 Shadow DOM 渲染（OfficialHtmlContent）
// - 正文内 /media 相对地址改写为带 API 前缀的绝对地址
// - HTML 文章不显示目录侧卡（首版无目录），作者卡保留
// - Markdown 文章阅读无回归（MdPreview 分支）
// - 全程无 pageerror（安全网口径）

const BASE = 'http://127.0.0.1:18081/AMEII'
const API = 'http://127.0.0.1:5001'

const HTML_ARTICLE = {
  code: 200,
  data: {
    id: 901,
    title: '官方富文本推文（e2e）',
    introduction: 'Shadow DOM 渲染验证',
    content_type: 'html',
    content_version: 1,
    content_md: null,
    content_html: [
      '<section style="padding: 12px; background-color: #f5f7fa; border-radius: 10px;">',
      '<h2 style="text-align: center; color: #2c5f9e;">排版标题</h2>',
      '<p style="font-size: 14px; color: #444;">带内联样式的正文段落。</p>',
      '<img src="/media/articles/html/901/synthetic.webp" alt="样本图" style="width: 100%">',
      '<table style="width: 100%; border-collapse: collapse;">',
      '<tbody><tr><td style="border: 1px solid #d8e2f0; padding: 6px;">单元格</td></tr></tbody>',
      '</table></section>',
    ].join(''),
    status: 'published',
    cover: null, cover_thumb: null,
    is_official: true, is_essence: false,
    publish_time: '2026-09-20 10:00:00',
    author_id: 1, author_name: '平台运营', author_avatar: '',
    reply_count: 0, like_count: 0, view_count: 3,
  },
}

const MD_ARTICLE = {
  ...HTML_ARTICLE,
  data: {
    ...HTML_ARTICLE.data,
    id: 902,
    title: 'Markdown 文章（e2e 回归）',
    content_type: 'markdown',
    content_md: '# 标题一\n\n正文段落，**加粗**。',
    content_html: null,
  },
}

async function loginAsUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { username: 'test_user', role: 'user' }, checkinInfo: {},
    }))
  })
}

async function mockArticleApi(page, article) {
  await page.route(`${API}/**`, (route) => {
    const url = route.request().url()
    if (url.endsWith(`/v2/article/${article.data.id}`)) {
      return route.fulfill({ json: article })
    }
    return route.fulfill({ json: { code: 200 } })
  })
}

test('HTML 官方推文：Shadow DOM 渲染 + 媒体地址改写 + 无目录卡', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await loginAsUser(page)
  await mockArticleApi(page, HTML_ARTICLE)

  await page.goto(`${BASE}/article-v2?id=901`)
  await expect(page.getByRole('heading', { name: '官方富文本推文（e2e）' })).toBeVisible()

  // Shadow DOM（open）内容可被 css 选择器穿透命中
  const body = page.locator('.official-html-content .official-html-body')
  await expect(body.locator('h2')).toHaveText('排版标题')
  await expect(body.locator('p')).toContainText('内联样式')
  await expect(body.locator('td')).toHaveText('单元格')

  // /media 相对地址改写为带 API 前缀的绝对地址
  await expect(body.locator('img')).toHaveAttribute('src', `${API}/media/articles/html/901/synthetic.webp`)

  // 目录侧卡隐藏（HTML 首版无目录），作者卡保留
  await expect(page.locator('.article-sidebar .side-card')).toHaveCount(1)
  await expect(page.locator('.side-card', { hasText: '关于作者' })).toBeVisible()

  expect(errors, errors.join('\n')).toEqual([])
})

test('Markdown 文章阅读无回归：MdPreview 分支 + 目录卡保留', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await loginAsUser(page)
  await mockArticleApi(page, MD_ARTICLE)

  await page.goto(`${BASE}/article-v2?id=902`)
  await expect(page.getByRole('heading', { name: 'Markdown 文章（e2e 回归）' })).toBeVisible()
  await expect(page.locator('.article-content .md-editor-preview h1')).toHaveText('标题一')
  // 不出现官方富文本容器
  await expect(page.locator('.official-html-content')).toHaveCount(0)
  // 目录卡 + 作者卡都在
  await expect(page.locator('.article-sidebar .side-card')).toHaveCount(2)

  expect(errors, errors.join('\n')).toEqual([])
})
