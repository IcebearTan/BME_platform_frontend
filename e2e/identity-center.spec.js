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
    await expect(page.getByText('已核验')).toBeVisible()
    await expect(page.getByText('pa1b2c3d4e5f60718')).toBeVisible()
    await expect(page.getByText('张核验', { exact: true })).toBeVisible()
    // 核验向导表单
    await expect(page.locator('.section-header', { hasText: '身份核验' })).toBeVisible()
    await expect(page.getByPlaceholder('与名册一致的姓名')).toBeVisible()
    // 认领区：进行中案例与历史
    await expect(page.getByText('待确认执行')).toBeVisible()
    await expect(page.locator('.history .case-row', { hasText: '已完成' })).toBeVisible()
    // 历史申请（approved 状态行）
    await expect(page.locator('.history-title', { hasText: '我的申请' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('开关关闭：核验与认领显示暂未开放占位（状态卡仍可见）', async ({ page }) => {
    await loginAsUser(page)
    await page.route(`${API}/**`, (route) => {
      const url = route.request().url()
      if (url.includes('/identity/status')) {
        return route.fulfill({ json: { ...MOCK_STATUS, applications: [],
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
    await expect(page.getByText('核验负责人 user id（逗号分隔；至少 2 名才算运营就绪）')).toBeVisible()
  })
})
