import { test, expect } from '@playwright/test'

// 内部工作台 M1 骨架：用户端 /work 三态（无资格空态 / 有权限概览）+
// 管理端「组织架构 → 协作授权」治理页（工作区表 + 授权记录 + 开通表单）。
// mock 后端，契约对齐 blueprints/work.py（feature/work-collab M1）。

const USER_BASE = 'http://127.0.0.1:18081/AMEII'
const ADMIN_BASE = 'http://127.0.0.1:15173/admin'

const ME_EMPTY = {
  code: 200, message: 'ok',
  data: { eligibility: null, is_governance: false, workspaces: [],
          todo: { pending_responses: 0, pending_transfers: 0, to_review: 0, due_soon: 0, overdue: 0 } },
}

const ME_GRANTED = {
  code: 200, message: 'ok',
  data: {
    eligibility: { kind: 'officer', officer_id: 8, group_id: 3 },
    is_governance: false,
    workspaces: [{ id: 1, club_group_id: 3, group_name: '软件组', status: 'active', role: 'coordinator' }],
    todo: { pending_responses: 2, pending_transfers: 0, to_review: 1, due_soon: 3, overdue: 0 },
  },
}

async function loginAsUser(page) {
  await page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { role: 'user', verification_status: 'verified' }, checkinInfo: {},
    }))
  })
}

async function mockUserApi(page, meData) {
  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/work/me')) {
      return route.fulfill({ json: meData })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

test.describe('用户端 /work 工作台骨架', () => {
  test('无资格：空态说明与组织架构引导，不渲染工作区', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page, ME_EMPTY)
    await page.goto(`${USER_BASE}/work`)

    await expect(page.getByRole('heading', { name: '内部工作台' })).toBeVisible()
    await expect(page.getByText('社团工作人员的内部协作区')).toBeVisible()
    await expect(page.getByRole('button', { name: '查看社团组织架构' })).toBeVisible()
    await expect(page.getByText('我的工作区')).toHaveCount(0)
  })

  test('有权限：待办数字块与侧栏导航（工作台 III 概览）', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page, ME_GRANTED)
    await page.goto(`${USER_BASE}/work`)

    // 外壳顶栏与侧栏
    await expect(page.locator('.ws-crumb-root', { hasText: '内部工作台' })).toBeVisible()
    await expect(page.locator('.ws-nav-item', { hasText: '概览' })).toBeVisible()
    await expect(page.locator('.ws-nav-item', { hasText: '小组事项' })).toBeVisible()
    // 待办数字块：待回复 2 / 待验收 1 / 即将到期 3（五桶计数）
    const blocks = page.locator('.stat-block')
    await expect(blocks).toHaveCount(5)
    await expect(blocks.filter({ hasText: '待回复' })).toContainText('2')
    await expect(blocks.filter({ hasText: '待验收' })).toContainText('1')
    // 概览徽标 = 五桶之和（2+0+1+3+0=6）
    await expect(page.locator('.ws-nav-badge', { hasText: '6' })).toBeVisible()
    // 无治理身份不出现治理提示
    await expect(page.getByText('协作治理身份')).toHaveCount(0)
  })

  test('页面无脚本错误（模板绑定安全网）', async ({ page }) => {
    await loginAsUser(page)
    await mockUserApi(page, ME_GRANTED)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.goto(`${USER_BASE}/work`)
    await expect(page.locator('.ws-crumb-root', { hasText: '内部工作台' })).toBeVisible()
    await expect(errors).toEqual([])
  })
})

test.describe('管理端 协作授权治理页', () => {
  const WORKSPACES = {
    code: 200, message: 'ok',
    data: { workspaces: [
      { id: 1, club_group_id: 3, group_name: '软件组', status: 'active', group_status: 'active',
        auto_grant: true, active_grants: 2 },
      { id: 2, club_group_id: 4, group_name: '硬件组', status: 'disabled', group_status: 'active',
        auto_grant: false, active_grants: 0 },
    ] },
  }

  const GRANTS = {
    code: 200, message: 'ok',
    data: {
      grants: [
        { id: 11, user_id: 21, username: '陈干事', role: 'coordinator', workspace_id: 1,
          workspace_group_name: '软件组', source_type: 'officer', source_id: 8,
          group_id_snapshot: null, valid_from: null, valid_until: null, status: 'active',
          origin: 'manual', revoke_reason: null, granted_by: 1, grant_reason: '运行保障值班',
          effective: true, ineffective_reason: null, created_at: '2026-09-28 10:00' },
        { id: 12, user_id: 22, username: '王组员', role: 'member', workspace_id: 1,
          workspace_group_name: '软件组', source_type: 'membership', source_id: 31,
          group_id_snapshot: 3, valid_from: null, valid_until: null, status: 'active',
          origin: 'auto', revoke_reason: null, granted_by: 1, grant_reason: '自动派生：归属变更（软件组）',
          effective: false, ineffective_reason: '组归属已调整（授权绑定原组）',
          created_at: '2026-09-28 10:05' },
        { id: 13, user_id: 23, username: '李前干事', role: 'member', workspace_id: 1,
          workspace_group_name: '软件组', source_type: 'membership', source_id: 33,
          group_id_snapshot: 3, valid_from: null, valid_until: null, status: 'vetoed',
          origin: 'auto', revoke_reason: '泄露风波', granted_by: 1, grant_reason: '自动派生：归属变更（软件组）',
          effective: false, ineffective_reason: null, created_at: '2026-09-20 09:00' },
      ],
      total: 3, page: 1, page_size: 20,
    },
  }

  async function loginAsStaff(page) {
    await page.addInitScript(() => {
      localStorage.setItem('bme-admin-token', 'e2e-mock-token')
      localStorage.setItem('bme-admin-state', JSON.stringify({
        token: 'e2e-mock-token',
        user: { role: 'super_admin', permissions: [], User_Name: 'e2e' },
        isLogin: true, isDarkMode: false,
      }))
    })
    await page.route('http://127.0.0.1:5001/**', (route) => {
      const url = route.request().url()
      if (url.includes('/user/user_index')) {
        return route.fulfill({
          json: { code: 200, role: 'super_admin', permissions: [], User_Name: 'e2e', data: { username: 'e2e' } },
        })
      }
      if (url.includes('/work/governance/workspaces')) {
        return route.fulfill({ json: WORKSPACES })
      }
      if (url.includes('/work/governance/grants')) {
        return route.fulfill({ json: GRANTS })
      }
      if (url.includes('/user/user_list')) {
        return route.fulfill({ json: [
          { User_Id: 21, User_Name: '陈干事' }, { User_Id: 22, User_Name: '王组员' },
        ] })
      }
      if (url.includes('/admin/officers')) {
        return route.fulfill({ json: { code: 200, message: 'ok', data: {
          officers: [{ id: 8, user_id: 21, title: '组长', department: '软件组', status: 'active' }],
          total: 1, page: 1, per_page: 100 } } })
      }
      if (url.includes('/admin/club/groups')) {
        return route.fulfill({ json: { code: 200, message: 'ok', data: { groups: [] } } })
      }
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
  }

  test('工作区表与授权记录渲染，失效原因可见', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto(`${ADMIN_BASE}/organization/work-grants`)

    // 管理端页面标题为 div.page-title（仓内范式），非 heading 元素
    await expect(page.locator('.page-title', { hasText: '协作授权' })).toBeVisible()
    // 工作区表：软件组启用 / 硬件组停用；入职自动授开关列渲染（软件组开/硬件组关且停用禁用）
    await expect(page.getByText('软件组').first()).toBeVisible()
    await expect(page.locator('.el-switch').first()).toBeVisible()
    // 授权记录：失效原因 / 来源列（自动/手动）/ 否决状态与解除入口
    await expect(page.getByText('已失效：组归属已调整（授权绑定原组）')).toBeVisible()
    await expect(page.getByText('生效中').first()).toBeVisible()
    await expect(page.locator('.el-table').getByText('自动').first()).toBeVisible()
    await expect(page.getByText('已否决（不再自动授）')).toBeVisible()
    await expect(page.getByRole('button', { name: '解除否决' })).toBeVisible()
    // 开通表单三档岗位
    await expect(page.getByRole('radio', { name: '组员' })).toBeVisible()
    await expect(page.getByRole('radio', { name: '协调员' })).toBeVisible()
    await expect(page.getByRole('radio', { name: '治理' })).toBeVisible()
  })

  test('开通授权：payload 按 source_type/source_id 组装（依据=任职行 id）', async ({ page }) => {
    await loginAsStaff(page)
    // 捕获 POST；GET 列表走 loginAsStaff 的兜底 mock（route.fallback）
    const posted = []
    await page.route('**/work/governance/grants', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      posted.push(route.request().postDataJSON())
      return route.fulfill({ json: { code: 200, message: '授权已开通', data: { id: 13 } } })
    })
    await page.goto(`${ADMIN_BASE}/organization/work-grants`)

    // 成员=陈干事（/admin/officers mock：其任职行 id=8）
    await page.locator('.grant-form .el-select').first().click()
    await page.getByRole('option', { name: '陈干事' }).click()
    // 工作区=软件组（ws id=1）
    await page.locator('.grant-form .el-select').nth(1).click()
    await page.getByRole('option', { name: '软件组' }).click()
    // 授权依据=任职（source_type=officer / source_id=任职行 id）
    // el-radio 原生 input 被 el-radio__inner 拦截（EP2 坑⑧），点 .el-radio 容器
    await page.locator('.el-radio', { hasText: '任职：组长 · 软件组' }).click()
    await page.getByPlaceholder(/运行保障组值班开通/).fill('治理页值班开通')
    await page.getByRole('button', { name: '开通授权' }).click()

    await expect.poll(() => posted.length).toBe(1)
    expect(posted[0]).toEqual({
      user_id: 21, role: 'member', grant_reason: '治理页值班开通', valid_until: null,
      workspace_id: 1, source_type: 'officer', source_id: 8, subtree: false,
    })
  })

  // 根因修（2026-10-02，L4-2）：confirmRevoke 里 revokeReason.trim() 漏了 .value
  //（ref 上 .trim 为 undefined → TypeError）。async 同步段 reject 被 catch 吞掉，弹
  // 「撤销失败」toast（e.response 空走 fallback 文案）、revoking 同帧 true→false 复位
  // ——DOM 零痕迹、console 零报错、零网络活动，伪装成「点击零反应」（09-30 排查 30+
  // 轮被 catch 吞错/同帧复位/toast 不进 console 三层假象误导；事件链 invoker→
  // handleClick→emit→confirmRevoke 逐层验证其实全通）。教训：async 处理器「看似没执行」
  // 先查页面 .el-message 错误 toast，再查同帧状态复位。
  test('撤销授权：弹窗含对象摘要且原因为必填', async ({ page }) => {
    await loginAsStaff(page)
    const revoked = []
    await page.goto(`${ADMIN_BASE}/organization/work-grants`)
    await expect(page.getByText('已失效：组归属已调整（授权绑定原组）')).toBeVisible()

    // 第一行生效中授权（陈干事 · 协调员 · 软件组）
    await page.getByRole('button', { name: '撤销' }).first().click()
    const dialog = page.locator('.el-dialog').filter({ hasText: '撤销授权' })
    await expect(dialog).toBeVisible()
    // 撤销对象摘要：成员/岗位/工作区/依据
    await expect(dialog.getByText('陈干事')).toBeVisible()
    await expect(dialog.getByText(/协调员 · 软件组 · 依据：在任任职/)).toBeVisible()

    // 原因必填：未填时确认按钮禁用
    const submit = dialog.getByRole('button', { name: '确认撤销' })
    await expect(submit).toBeDisabled()
    await dialog.locator('textarea').fill('岗位调整')
    await expect(submit).toBeEnabled()

    // 撤销 POST 专用拦截用 includes 判据（`**/grants/*/revoke` 这类 glob 在本环境不匹配，
    // 请求会落进 loginAsStaff 兜底被 200 应答、断言数组永不计数——2026-09-30 排查记录）
    await page.route('http://127.0.0.1:5001/**', async (route) => {
      const url = route.request().url()
      if (url.includes('/grants/') && url.includes('/revoke')) {
        revoked.push({ url, body: route.request().postDataJSON() })
        return route.fulfill({ json: { code: 200, message: '已撤销', data: {} } })
      }
      return route.fallback()
    })
    await submit.click()
    await expect.poll(() => revoked.length).toBe(1)
    expect(revoked[0].url).toContain('/work/governance/grants/11/revoke')
    expect(revoked[0].body).toEqual({ reason: '岗位调整', veto: false })
  })

  test('工作区启停：确认框文案且取消不发请求', async ({ page }) => {
    await loginAsStaff(page)
    const posted = []
    await page.route('**/work/governance/workspaces/*/status', async (route) => {
      posted.push({ url: route.request().url(), body: route.request().postDataJSON() })
      return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
    })
    await page.goto(`${ADMIN_BASE}/organization/work-grants`)

    // 硬件组（停用）→ 启用：确认框出现，取消不发请求
    await page.getByRole('button', { name: '启用' }).click()
    await expect(page.getByText('重新启用「硬件组」工作区？')).toBeVisible()
    await page.locator('.el-message-box').getByRole('button', { name: '取消' }).click()
    await expect(page.locator('.el-message-box')).toHaveCount(0)
    expect(posted).toEqual([])

    // 软件组（启用）→ 停用：确认后提交 disabled
    await page.getByRole('button', { name: '停用' }).click()
    await expect(page.getByText(/停用「软件组」工作区后，成员将无法进入/)).toBeVisible()
    await page.locator('.el-message-box').getByRole('button', { name: '停用', exact: true }).click()
    await expect.poll(() => posted.length).toBe(1)
    expect(posted[0].url).toContain('/work/governance/workspaces/1/status')
    expect(posted[0].body).toEqual({ status: 'disabled' })
  })
})
