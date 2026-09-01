---
name: bme-e2e
description: 为 BME 前端编写或运行 Playwright e2e 用例时使用。给出不依赖后端的 mock 策略、pageerror 断言模式与运行命令的坑。触发词:e2e、playwright、冒烟测试、给页面写测试、测试挂了。
---

# BME e2e 测试规程

> 权威源:`docs/ARCHITECTURE.md` §10;现有 16 条用例在 `e2e/*.spec.js`,先读它们再写新的。

## 运行(必须带 -c,裸跑不会起 webServer)

```bash
pnpm test:e2e                      # 根 script,已封装 -c e2e/playwright.config.ts
npx playwright test -c e2e/playwright.config.ts   # 等价手动形式
# ❌ 裸 `npx playwright test`:找不到 config → 不启动 dev server → 全部 connection refused
```

配置:三 webServer——user **18081**(`dev:test`,不复用)/ admin **15173**(`dev:test`,不复用)/ 5002 预览 API(`dev:preview:api`,可复用)。**测试端口与开发端口(8081/5173)分离**:用例 BASE 一律写 `http://127.0.0.1:18081/AMEII` 或 `http://127.0.0.1:15173/admin`,不要写 localhost:8081/5173(会碰到你正开着的 dev server,产生不稳定结果);5002 的契约由 `preview-api.spec.js` 校验。

## mock 策略(用例零后端依赖)

```js
const BASE = 'http://127.0.0.1:15173/admin'

async function loginAsStaff(page) {
  // 1) 预置登录态:token 键 + vuex 持久化键(两处都要,键名见 §8 键名规范)
  await page.addInitScript(() => {
    localStorage.setItem('bme-admin-token', 'e2e-mock-token')
    localStorage.setItem('bme-admin-state',
      JSON.stringify({ token: 'e2e-mock-token', isLogin: true, isDarkMode: false }))
  })
  // 2) 拦截全部后端请求:user_index 给角色,其余统一 200 空数据(防 401 拦截踢回登录)
  await page.route('http://127.0.0.1:5001/**', (route) => {
    if (route.request().url().includes('/user/user_index')) {
      return route.fulfill({ json: { code: 200, role: 'super_admin', permissions: [], data: {} } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test('页面用例', async ({ page }) => {
  await loginAsStaff(page)
  // 3) 需要数据的页面:再覆盖具体接口的 mock
  await page.route('http://127.0.0.1:5001/user/user_list', (route) =>
    route.fulfill({ json: [{ User_Id: 1, User_Name: 'alice', … }] }))

  await page.goto(`${BASE}/user-manage/users`)
  await expect(page.getByRole('cell', { name: 'alice' })).toBeVisible()
})
```

## pageerror 断言(抓坏引用的利器)

```js
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(e.message))
// …交互…
expect(pageErrors).toEqual([])   // 模板引用不存在的绑定/点击即炸的按钮,这里现形
```

来历:UserManage 曾有按钮引用 7 个不存在的方法,页面挂载型用例全绿仍漏网(批次 6 教训)——**交互型用例必配此断言**。

## 用例分层约定

- 冒烟(现有 16 条):两端登录页、路由跳转、布局壳、编辑器挂载、展示页、导生市集状态机、营期详情选导生/成员、通知中心/感谢信、预览 API 契约——**不可删**;
- 页面用例:每新增页面配一条(渲染 + 一次真实交互 + pageerror);mock 数据放 route 里,不造 fixture 文件;
- 选择器优先 `getByRole`/`getByPlaceholder`,避免绑样式类名(样式重构不应打破测试)。

## 提交前

`pnpm check:no-emoji` + `pnpm build`(两端)+ `pnpm test:e2e` 全绿(AGENTS.md 强制);用例挂了先自查 mock 是否漏接口(url 打到 127.0.0.1:5001 且无拦截 = 环境/后端问题,不是页面问题)。
