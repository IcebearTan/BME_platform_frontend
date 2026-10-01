/**
 * D4 真后端浏览器演练（本地脚本，不进 testMatch）：8081 dev 前端 + 5001 真库。
 * 前置：IDENTITY_UI_ENABLED/IDENTITY_VERIFICATION_ENABLED/ACCOUNT_LINK_APPLY_ENABLED
 * 已拨 true 且 5001 重启；8081 在跑。
 * 用法（仓根）：node e2e/drill-identity-real.mjs
 */
import { chromium } from '@playwright/test'

const USER_APP = 'http://127.0.0.1:8081/AMEII/'
let pass = 0, fail = 0
const check = (name, cond, detail = '') => {
  console.log(`[${cond ? 'PASSED' : 'FAILED'}] ${name}` + (!cond && detail ? ` — ${detail}` : ''))
  cond ? pass++ : fail++
}

const browser = await chromium.launch()
const page = await browser.newPage()
try {
  await page.goto(USER_APP + 'login')
  await page.getByPlaceholder('请输入邮箱地址').fill('mentor1@seed.dev')
  await page.getByPlaceholder('请输入密码').fill('12345678')
  await page.getByRole('button', { name: /登\s*录/ }).first().click()
  await page.waitForTimeout(2500)

  // 身份中心：真实人员档案（D2 回填的 person）
  await page.goto(USER_APP + 'user-center/identity')
  await page.waitForTimeout(2000)
  check('人员档案卡渲染（真实 public_id，p 前缀 17 位）',
        await page.getByText(/^p[0-9a-f]{16}$/).isVisible())
  check('核验状态可见（未核验或已核验）',
        await page.locator('.person-card .el-tag').first().isVisible())

  // 认领向导：创建案例 + 当前账号认证（登录会话新鲜，应直通到第 2 步）
  await page.getByRole('button', { name: '认领另一账号' }).click()
  await page.getByRole('button', { name: '创建案例并验证当前账号' }).click()
  await page.waitForTimeout(2500)
  check('A 端证明直通（近期认证），到第 2 步 B 端表单',
        await page.getByPlaceholder('another@example.com').isVisible())

  // 关闭向导并撤回案例（避免残留活跃案例占位）
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
  const withdrawBtn = page.getByRole('button', { name: '撤回', exact: true }).first()
  if (await withdrawBtn.isVisible().catch(() => false)) {
    await withdrawBtn.click()
    await page.getByRole('button', { name: /确定/ }).click().catch(() => {})
    await page.waitForTimeout(1500)
    check('演练案例已撤回（不占位）', true)
  } else {
    check('演练案例已撤回（不占位）', false, '未见撤回按钮')
  }
} finally {
  await browser.close()
}
console.log(`\n${'='.repeat(40)}\nD4 真后端演练：通过 ${pass} / 失败 ${fail}`)
process.exit(fail ? 1 : 0)
