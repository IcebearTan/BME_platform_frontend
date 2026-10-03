// D4 身份中心与审核台 e2e（全 mock，不依赖后端）。
// 覆盖：用户端身份中心（状态卡/核验向导/开关关闭态/申请历史）、管理端三页
// （核验队列+审核弹窗、关联案例、学校配置就绪度）。
const { test, expect } = require('@playwright/test')

const API = 'http://127.0.0.1:5001'

function loginAsUser(page) {
  return page.addInitScript(() => {
    localStorage.setItem('bme-user-token', 'e2e-mock-token')
    localStorage.setItem('bme-user-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { username: 'e2e_user', role: 'user', User_Id: '0000021' }, checkinInfo: {},
    }))
  })
}

function loginAsAdmin(page) {
  return page.addInitScript(() => {
    localStorage.setItem('bme-admin-token', 'e2e-mock-token')
    localStorage.setItem('bme-admin-state', JSON.stringify({
      token: 'e2e-mock-token', isLogin: true, isDarkMode: false,
      user: { username: 'e2e_admin', role: 'super_admin' },
    }))
  })
}

const MOCK_STATUS = {
  code: 200,
  person: { public_id: 'pa1b2c3d4e5f60718', verification_status: 'verified',
            verified_name: '张核验', record_status: 'active' },
  applications: [
    { id: 7, school_id: 'sysu', claimed_name: '张核验', claimed_identifier: 'zhang01',
      contact_email: 'zhang01@mail2.sysu.edu.cn', status: 'approved',
      challenge_verified: true, reject_reason: null, submitted: true,
      created_at: '2026-10-01 10:00' },
  ],
  schools: [{ school_id: 'sysu', name: '中山大学' }],
  verification_enabled: true, ui_enabled: true,
}

const MOCK_CASES = {
  code: 200,
  cases: [
    { id: 'case0001', state: 'preview_ready', version: 3, has_target: true,
      target_email_masked: 'zh***@mail2.sysu.edu.cn', surviving_person_id: null,
      preview_ready: true, collection_expires_at: '2026-10-02 10:00',
      approval_expires_at: null },
    { id: 'case0002', state: 'applied', version: 8, has_target: true,
      target_email_masked: 'li***@qq.com', surviving_person_id: 12,
      preview_ready: true, collection_expires_at: null, approval_expires_at: null },
  ],
}

test.describe('用户端身份中心', () => {
  test('人员档案状态卡与核验向导渲染；申请历史含驳回原因', async ({ page }) => {
    await loginAsUser(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url()
      if (url.includes('/identity/status')) return route.fulfill({ json: MOCK_STATUS })
      if (url.includes('/identity/link-cases')) return route.fulfill({ json: MOCK_CASES })
      if (url.includes('/user/user_index')) {
        return route.fulfill({ json: { code: 200, User_Name: 'e2e_user' } })
      }
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto('http://127.0.0.1:18081/AMEII/user-center/identity')
    await expect(page.getByText('人员档案', { exact: true })).toBeVisible()
    await expect(page.locator('.person-card').getByText('已核验')).toBeVisible()
    await expect(page.getByText('pa1b2c3d4e5f60718')).toBeVisible()
    await expect(page.getByText('张核验', { exact: true })).toBeVisible()
    // 核验区：已核验走固定展示块（无需再次发起），不再渲染草稿表单
    await expect(page.locator('.section-header', { hasText: '身份核验' })).toBeVisible()
    await expect(page.getByText('本账号身份已核验通过，无需再次发起；如信息有误请联系管理员。')).toBeVisible()
    // 认领区：进行中案例与历史
    await expect(page.getByText('待确认执行')).toBeVisible()
    await expect(page.locator('.history .case-row', { hasText: '已完成' })).toBeVisible()
    // 历史申请（approved 状态行）
    await expect(page.locator('.history-title', { hasText: '我的申请' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('未核验且通道开放：核验向导表单渲染', async ({ page }) => {
    await loginAsUser(page)
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url()
      if (url.includes('/identity/status')) {
        return route.fulfill({ json: { ...MOCK_STATUS,
          person: { ...MOCK_STATUS.person, verification_status: 'unverified',
                    verified_name: null },
          applications: [] } })
      }
      if (url.includes('/identity/link-cases')) return route.fulfill({ json: { code: 200, cases: [] } })
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto('http://127.0.0.1:18081/AMEII/user-center/identity')
    await expect(page.locator('.person-card').getByText('未核验')).toBeVisible()
    await expect(page.getByPlaceholder('与名册一致的姓名')).toBeVisible()
  })

  test('开关关闭：核验与认领显示暂未开放占位（状态卡仍可见）', async ({ page }) => {
    await loginAsUser(page)
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url()
      if (url.includes('/identity/status')) {
        // person 须为 unverified：verified 时向导固定展示已核验态（组件正确行为），
        // 只有未核验且通道关闭才落 closed-block 占位
        return route.fulfill({ json: { ...MOCK_STATUS,
                                       person: { ...MOCK_STATUS.person,
                                                 verification_status: 'unverified',
                                                 verified_name: null },
                                       applications: [],
                                       verification_enabled: false, ui_enabled: false } })
      }
      if (url.includes('/identity/link-cases')) return route.fulfill({ json: { code: 200, cases: [] } })
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto('http://127.0.0.1:18081/AMEII/user-center/identity')
    await expect(page.getByText('人员档案', { exact: true })).toBeVisible()
    await expect(page.getByText('身份核验暂未开放，请留意公告。')).toBeVisible()
    await expect(page.getByText('账号认领暂未开放，请留意公告。')).toBeVisible()
  })
})

test.describe('管理端身份审核台', () => {
  test('核验审核队列渲染 + 审核弹窗（批准/驳回动作）', async ({ page }) => {
    await loginAsAdmin(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const decisions = []
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (url.includes('/admin/identity/applications/7/approve') && method === 'POST') {
        decisions.push('approve')
        return route.fulfill({ json: { code: 200, message: '已核验通过' } })
      }
      if (url.includes('/admin/identity/queue')) {
        return route.fulfill({ json: { code: 200, applications: [
          { id: 7, school_id: 'sysu', claimed_name: '李待审', claimed_identifier: 'li01',
            contact_email: 'li01@mail2.sysu.edu.cn', status: 'submitted',
            challenge_verified: true, challenge_verified_at: '2026-10-01 09:00',
            reviewed_by: null, reviewed_at: null, reject_reason: null,
            created_at: '2026-10-01 08:30',
            applicant: { user_id: 21, username: '李待审', email: 'li@seed.dev',
                         account_kind: 'standard', person_id: 30 },
            identifier_registered_to: null },
        ] } })
      }
      if (url.includes('/admin/identity/schools')) {
        return route.fulfill({ json: { code: 200, schools: [
          { school_id: 'sysu', name: '中山大学' }] } })
      }
      // admin 壳层 HomeView 校验 /user/user_index 的 role（历史坑：缺 role 被踢回登录）
      if (url.includes('/user/user_index')) {
        return route.fulfill({ json: { code: 200, User_Name: 'e2e_admin', role: 'super_admin' } })
      }
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto('http://127.0.0.1:15173/admin/system/identity/applications')
    await expect(page.locator('.page-title', { hasText: '身份核验审核' })).toBeVisible()
    await expect(page.locator('.el-table__row', { hasText: '李待审' })).toBeVisible()
    await expect(page.locator('.el-table__row', { hasText: 'li01@mail2.sysu.edu.cn' })).toBeVisible()
    await page.getByRole('button', { name: '审核' }).click()
    await expect(page.getByText('批准备注')).toBeHidden()
    await expect(page.locator('.el-dialog').getByText('声明姓名')).toBeVisible()
    await page.getByRole('button', { name: '批准' }).click()
    await expect.poll(() => decisions).toEqual(['approve'])
    expect(errors).toEqual([])
  })

  test('关联案例队列：阻断项标签与文案', async ({ page }) => {
    await loginAsAdmin(page)
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url()
      if (url.includes('/admin/identity/link-cases')) {
        return route.fulfill({ json: { code: 200, cases: [
          { id: 'case01', state: 'awaiting_review', version: 4,
            account_a: 21, account_b: 33, surviving_person_id: null,
            created_at: '2026-10-01 09:00',
            scan: { is_shell: false, blockers: ['target_has_business_data'] } },
          { id: 'case02', state: 'awaiting_review', version: 2,
            account_a: 40, account_b: 41, surviving_person_id: null,
            created_at: '2026-10-01 10:00', scan: { is_shell: true, blockers: [] } },
        ] } })
      }
      if (url.includes('/user/user_index')) {
        return route.fulfill({ json: { code: 200, User_Name: 'e2e_admin', role: 'super_admin' } })
      }
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto('http://127.0.0.1:15173/admin/system/identity/link-cases')
    await expect(page.locator('.page-title', { hasText: '关联案例审核' })).toBeVisible()
    await expect(page.locator('.el-table__row', { hasText: '有阻断项' }).first()).toBeVisible()
    await expect(page.locator('.el-table__row', { hasText: '目标有业务数据' })).toBeVisible()
    await expect(page.locator('.el-table__row', { hasText: '空壳（可自助）' })).toBeVisible()
  })

  test('学校配置：审核人就绪度与编辑入口', async ({ page }) => {
    await loginAsAdmin(page)
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url()
      if (url.includes('/admin/identity/schools')) {
        return route.fulfill({ json: { code: 200, schools: [
          { school_id: 'sysu', name: '中山大学',
            personal_email_domains: ['mail2.sysu.edu.cn'],
            excluded_email_domains: ['sysu.edu.cn'],
            email_local_matches_identifier: true, config_version: 2,
            reviewers: [{ user_id: 74, username: '本地超管' }],
            reviewers_ready: false },
        ] } })
      }
      if (url.includes('/user/user_index')) {
        return route.fulfill({ json: { code: 200, User_Name: 'e2e_admin', role: 'super_admin' } })
      }
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto('http://127.0.0.1:15173/admin/system/identity/schools')
    await expect(page.locator('.page-title', { hasText: '学校核验配置' })).toBeVisible()
    await expect(page.getByText('1 名（未就绪）')).toBeVisible()
    await expect(page.getByText('mail2.sysu.edu.cn')).toBeVisible()
    await page.getByRole('button', { name: '编辑' }).click()
    await expect(page.getByText('个人邮箱域（每行一个，精确匹配；勿用通配符）')).toBeVisible()
    await expect(page.getByText('核验负责人 user id（逗号分隔；须管理员账号；至少 2 名才算运营就绪）')).toBeVisible()
  })
})

test.describe('R0 核验门槛（2026-10-02 收紧批）', () => {
  test('未核验账号回首页：强弹核验提醒（不可关），按钮直达身份中心', async ({ page }) => {
    await loginAsUser(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url()
      if (url.includes('/identity/status')) {
        return route.fulfill({ json: { code: 200,
          person: { public_id: 'pub1', verification_status: 'unverified' },
          applications: [], schools: [],
          verification_enabled: true, ui_enabled: true } })
      }
      if (url.includes('/user/user_index')) {
        return route.fulfill({ json: { code: 200, User_Name: 'e2e_user',
          verification_status: 'unverified' } })
      }
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto('http://127.0.0.1:18081/AMEII/home')
    const dialog = page.locator('.el-dialog').filter({ hasText: '完成身份核验' })
    await expect(dialog).toBeVisible()
    await expect(page.locator('.el-dialog__headerbtn')).toHaveCount(0)   // 不可关：无 X
    await dialog.getByRole('button', { name: '去核验' }).click()
    await expect(page).toHaveURL(/\/AMEII\/user-center\/identity$/)
    expect(errors).toEqual([])
  })

  test('已核验但本地态未拉平：回首页探测后强弹自动收起（信封平铺回归）', async ({ page }) => {
    await loginAsUser(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    const statusProbed = page.waitForRequest((r) => r.url().includes('/identity/status'))
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url()
      if (url.includes('/identity/status')) {
        // 与后端一致的平铺信封：真实态已核验
        return route.fulfill({ json: { code: 200,
          person: { public_id: 'pub1', verification_status: 'verified',
                    verified_name: '张核验', record_status: 'active' },
          applications: [], schools: [],
          verification_enabled: true, ui_enabled: true } })
      }
      if (url.includes('/user/user_index')) {
        // 登录会话仍是核验前的旧值（未重登未续期）
        return route.fulfill({ json: { code: 200, User_Name: 'e2e_user',
          verification_status: 'unverified' } })
      }
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto('http://127.0.0.1:18081/AMEII/home')
    await statusProbed   // 强弹已挂载并发出探测请求
    const dialog = page.locator('.el-dialog').filter({ hasText: '完成身份核验' })
    await expect(dialog).toBeHidden({ timeout: 5000 })
    // 探测结果已回写 store：进身份中心（覆盖其回写路径）再回首页，不再弹
    const probedAgain = page.waitForRequest((r) => r.url().includes('/identity/status'))
    await page.goto('http://127.0.0.1:18081/AMEII/user-center/identity')
    await probedAgain
    await page.goto('http://127.0.0.1:18081/AMEII/home')
    await expect(dialog).toHaveCount(0)
    expect(errors).toEqual([])
  })

  test('社团职务任命：未核验目标被 403 拦截，成员下拉带未核验标识', async ({ page }) => {
    await loginAsAdmin(page)
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url()
      const method = route.request().method()
      if (url.includes('/admin/officers') && method === 'POST') {
        return route.fulfill({ status: 403, json: { code: 403,
          machine: 'IDENTITY_VERIFICATION_REQUIRED', gate: 'appoint',
          verification_status: 'unverified',
          message: '苏晚晴：该账号尚未完成身份核验，不能被任命为 副社长——请先引导其在用户端「身份与账号」页完成实名核验' } })
      }
      if (url.includes('/admin/officers') && method === 'GET') {
        return route.fulfill({ json: { code: 200, data: { officers: [], total: 0, page: 1, per_page: 20 } } })
      }
      if (url.includes('/admin/club/positions')) {
        return route.fulfill({ json: { code: 200, data: { positions: [
          { id: 2, name: '副社长', org_slot: 'club', sort_rank: 2, badge_tier: 1,
            badge_with_group: true, group_rule: 'optional', per_group_limit: 1,
            global_limit: 3, status: 'active', active_count: 0 },
        ] } } })
      }
      if (url.includes('/admin/club/groups')) {
        return route.fulfill({ json: { code: 200, data: { groups: [] } } })
      }
      if (url.includes('/user/user_list')) {
        return route.fulfill({ json: [
          { User_Id: 21, User_Name: '苏晚晴', verification_status: 'unverified' },
          { User_Id: 22, User_Name: '顾亦深', verification_status: 'verified' },
        ] })
      }
      if (url.includes('/user/user_index')) {
        return route.fulfill({ json: { code: 200, User_Name: 'e2e_admin', role: 'super_admin' } })
      }
      return route.fulfill({ json: { code: 200 } })
    })
    await page.goto('http://127.0.0.1:15173/admin/organization/officers')
    await page.getByRole('button', { name: '任命' }).click()
    const dialog = page.locator('.el-dialog').filter({ hasText: '任命干事' })
    await dialog.locator('.el-select').first().click()
    const memberDropdown = page.locator('.el-select__popper:visible')
    await expect(memberDropdown.locator('.option-warn', { hasText: '未核验' })).toHaveCount(1)
    await memberDropdown.getByText('苏晚晴', { exact: true }).click()
    await dialog.locator('.el-select').nth(1).click()
    await page.locator('.el-select__popper:visible').getByText('副社长', { exact: true }).click()
    await dialog.getByRole('button', { name: '确认' }).click()
    await expect(page.locator('.el-message').filter({ hasText: '尚未完成身份核验' })).toBeVisible()
    expect(errors).toEqual([])
  })
})
