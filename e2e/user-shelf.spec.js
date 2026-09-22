import { test, expect } from '@playwright/test'

// 我的书架（2026-09-22）：个人中心「学习」分组入口 + 书架页（courseShelf 收藏课程）。
// 覆盖：侧栏入口导航 / 列表渲染（封面图与文字回退、下架降级）/ 空书架引导 / 移出确认。
// 纯 mock，不依赖后端。

const BASE = 'http://127.0.0.1:18081/AMEII'

async function loginAsUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { username: 'e2e_user', role: 'user', User_Id: '0000021' }, checkinInfo: {},
    }))
  })
}

const MOCK_SHELF = [
  { course_id: 5, course_title: '医学影像原理与技术', course_introduction: '学习CT、MRI等成像原理',
    course_cover: '/media/course-covers/5/a.webp', course_cover_thumb: '/media/course-covers/5/a_thumb.webp',
    course_chapters: 10, learning_mode: 'open', course_status: 'normal', created_at: '2026-09-22 10:00:00' },
  { course_id: 6, course_title: '生物材料学', course_introduction: '各类生物材料的性能与医学应用',
    course_cover: null, course_cover_thumb: null,
    course_chapters: 8, learning_mode: 'camp', course_status: 'off_shelf', created_at: '2026-09-21 09:00:00' },
]

test('侧栏「学习」分组入口进书架页，列表渲染与下架降级', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/courseShelf/list')) {
      return route.fulfill({ json: { code: 200, message: 'ok', data: MOCK_SHELF } })
    }
    return route.fulfill({ json: { code: 200 } })
  })

  // 从个人中心首页走侧栏入口（不是 URL 直达，验入口本身）
  await page.goto(`${BASE}/user-center/user-info`)
  await page.locator('.uc-sidebar .dew-sidebar__item', { hasText: '我的书架' }).click()
  await expect(page).toHaveURL(/\/user-center\/my-shelf$/)

  // 头部计数 + 两张课程卡
  await expect(page.locator('.shelf-title')).toHaveText(/我的书架/)
  await expect(page.locator('.shelf-count')).toHaveText('2 门课程')
  await expect(page.locator('.shelf-item:not(.shelf-item--skeleton)')).toHaveCount(2)

  // 有缩略图出 DewImage；无图文字回退封面
  await expect(page.locator('.shelf-cover__img').first()).toBeVisible()
  await expect(page.locator('.shelf-cover__text')).toHaveText('生物材料学')

  // open 课标自主学、camp 课不标
  await expect(page.locator('.shelf-item', { hasText: '医学影像原理与技术' }).locator('.mode-chip')).toHaveText('自主学')
  await expect(page.locator('.shelf-item', { hasText: '生物材料学' }).locator('.mode-chip')).toHaveCount(0)

  // 下架课：置灰 + 已下架标记
  const offItem = page.locator('.shelf-item', { hasText: '生物材料学' })
  await expect(offItem).toHaveClass(/is-off/)
  await expect(offItem.locator('.shelf-off-tag')).toHaveText('已下架')

  // 点击正常课进课程详情
  await page.locator('.shelf-item', { hasText: '医学影像原理与技术' }).click()
  await expect(page).toHaveURL(/\/study\/details\?id=5$/)
  expect(pageErrors).toEqual([])
})

test('移出书架：确认后局部删除', async ({ page }) => {
  await loginAsUser(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  let removedId = null
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/courseShelf/list')) {
      return route.fulfill({ json: { code: 200, message: 'ok', data: MOCK_SHELF } })
    }
    if (url.includes('/courseShelf/remove')) {
      removedId = route.request().postDataJSON().Course_Id
      return route.fulfill({ json: { code: 200, message: '已移出书架', data: { course_id: 6, in_shelf: false } } })
    }
    return route.fulfill({ json: { code: 200 } })
  })

  await page.goto(`${BASE}/user-center/my-shelf`)
  await page.locator('.shelf-item', { hasText: '生物材料学' }).locator('.shelf-remove').click()

  // DewMessageBox（DewDialog 底座）：确认后卡片局部消失、不发整页刷新请求
  await page.locator('.dew-dialog .dew-btn', { hasText: '移出' }).click()
  await expect(page.locator('.shelf-item:not(.shelf-item--skeleton)')).toHaveCount(1)
  await expect(page.locator('.shelf-count')).toHaveText('1 门课程')
  expect(removedId).toBe(6)
  expect(pageErrors).toEqual([])
})

test('空书架：引导去课程广场', async ({ page }) => {
  await loginAsUser(page)
  await page.route('http://127.0.0.1:5001/**', (route) =>
    route.fulfill({ json: { code: 200 } }))

  await page.goto(`${BASE}/user-center/my-shelf`)
  await expect(page.locator('.shelf-empty__text')).toBeVisible()
  await page.locator('.shelf-empty .dew-btn', { hasText: '去逛课程' }).click()
  await expect(page).toHaveURL(/\/study$/)
})
