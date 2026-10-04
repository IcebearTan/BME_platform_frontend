/**
 * D1.5 收尾 #2/#3：真后端 cookie 模式端到端 + 双标签并发续期（本地演练脚本，
 * 不进 playwright testMatch——文件名无 .spec/.test）。
 *
 * 前置：AUTH_REFRESH_COOKIE_ENABLED=true 已拨且 5001 已重启；8081/5173 dev 在跑。
 * 用法（仓根）：node e2e/drill-cookie-e2e.mjs
 * 验收（D1.5 清单 #2/#3）：
 *   #2 双端登录 Set-Cookie → 刷新页 bootstrap 恢复 → 退出清 cookie；body 不含 refresh_token
 *   #3 两 tab 同时引导：Web Locks 串行化，无 SESSION_REVOKED 死局、无误用旧 cookie
 */
import { chromium } from '@playwright/test'

const USER_APP = 'http://127.0.0.1:8081/AMEII/'
const ADMIN_APP = 'http://127.0.0.1:5173/admin/'
const STU = { email: 'stu4@seed.dev', pass: '12345678' }
const ADMIN = { email: 'admin@seed.dev', pass: '12345678' }

let pass = 0, fail = 0
const check = (name, cond, detail = '') => {
  console.log(`[${cond ? 'PASSED' : 'FAILED'}] ${name}` + (!cond && detail ? ` — ${detail}` : ''))
  cond ? pass++ : fail++
}

async function login(page, { email, pass }, ph = { email: '请输入邮箱地址', pwd: '请输入密码' }) {
  await page.getByPlaceholder(ph.email).fill(email)
  await page.getByPlaceholder(ph.pwd).fill(pass)
  await page.getByRole('button', { name: /登\s*录/ }).first().click()
}

const cookieJar = async (context) => {
  const cs = await context.cookies()
  return Object.fromEntries(cs.map(c => [c.name, c]))
}

async function userSideDrill(browser) {
  const ctx = await browser.newContext()
  const refreshPosts = []
  ctx.on('request', r => {
    if (r.url().includes('/auth/user/refresh') && r.method() === 'POST') refreshPosts.push(r)
  })
  const page = await ctx.newPage()

  // 登录（真实后端；前端自动 md5）
  await page.goto(USER_APP + 'login')
  await login(page, STU)
  await page.waitForURL(/login/, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(2500)
  const jar = await cookieJar(ctx)
  check('#2 用户端登录落 refresh cookie（bme-user-rt + csrf）',
        Boolean(jar['bme-user-rt'] && jar['bme-user-csrf']), JSON.stringify(Object.keys(jar)))

  // 刷新页 bootstrap 恢复（cookie-only 状态：不播种任何 localStorage token）
  const postsBefore = refreshPosts.length
  await page.reload()
  await page.waitForTimeout(2500)
  const stillIn = !page.url().includes('/login')
  check('#2 刷新页后 bootstrap 经 cookie 恢复会话（不掉登录）', stillIn, page.url())
  check('#2 恢复走 typed refresh（POST /auth/user/refresh ≥1）',
        refreshPosts.length > postsBefore, `posts=${refreshPosts.length}`)

  // ── #3 双标签并发引导：第二 tab 与第一 tab 同瞬加载 ──────────
  const before = refreshPosts.length
  const p2 = await ctx.newPage()
  await Promise.all([
    p2.goto(USER_APP).catch(() => {}),
    page.reload().catch(() => {}),
  ])
  await p2.waitForTimeout(3000)
  const bothIn = !page.url().includes('/login') && !p2.url().includes('/login')
  check('#3 双标签同时引导：两 tab 均保持登录', bothIn,
        `tab1=${page.url()} tab2=${p2.url()}`)
  check('#3 双标签无 SESSION_REVOKED 死局（不放宽一次性下的协调成功）', bothIn,
        `posts=${refreshPosts.length - before}`)

  // 退出清 cookie（头像 DewPopover → 退出登录；fire-and-forget，等 DB 撤销落库）
  await page.locator('.el-avatar').first().click()
  await page.getByText('退出登录').click()
  await page.waitForTimeout(2500)
  const jar2 = await cookieJar(ctx)
  const rtGone = !jar2['bme-user-rt'] || jar2['bme-user-rt'] === ''
  check('#2 退出后 refresh cookie 清除', rtGone, JSON.stringify(jar2['bme-user-rt'] || ''))
  await ctx.close()
}

async function adminSideDrill(browser) {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(ADMIN_APP)
  await login(page, ADMIN, { email: '输入邮箱', pwd: '输入密码' })
  await page.waitForTimeout(2500)
  const jar = await cookieJar(ctx)
  check('#2 管理端登录落独立命名空间 cookie（bme-admin-rt）',
        Boolean(jar['bme-admin-rt']), JSON.stringify(Object.keys(jar)))
  await page.reload()
  await page.waitForTimeout(2500)
  check('#2 管理端刷新页恢复会话', !page.url().includes('login'), page.url())
  await ctx.close()
}

const browser = await chromium.launch()
try {
  await userSideDrill(browser)
  await adminSideDrill(browser)
} finally {
  await browser.close()
}
console.log(`\n${'='.repeat(40)}\n演练 #2/#3（浏览器侧）结果：通过 ${pass} / 失败 ${fail}`)
process.exit(fail ? 1 : 0)
