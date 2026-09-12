import { test, expect } from '@playwright/test'

// 管理端（apps/admin）冒烟安全网：登录页渲染 / 布局壳挂载 / TinyMCE 编辑器挂载
// 布局壳与编辑器页的 created() 会调 /user/user_index，失败即踢回 /login。
// 故在测试上下文预置 token 并 mock 该接口——用例不依赖后端与真实账号。

const BASE = 'http://127.0.0.1:15173/admin'

async function loginAsStaff(page) {
  // store 初始 token 读 localStorage；vuex-persistedstate 从 bme-admin-state 恢复 state，两处都预置
  // 键名与批次 3 键分离后的 apps/admin 保持一致
  await page.addInitScript(() => {
    localStorage.setItem('bme-admin-token', 'e2e-mock-token')
    localStorage.setItem(
      'bme-admin-state',
      JSON.stringify({
        token: 'e2e-mock-token',
        user: { role: 'super_admin', permissions: [], User_Name: 'e2e' },
        isLogin: true,
        isDarkMode: false,
      })
    )
  })
  // 拦截全部后端请求：user_index 提供角色；其余统一 200 空数据，
  // 避免假 token 触发批次 3 新增的 401 拦截把页面踢回登录页
  await page.route('http://127.0.0.1:5001/**', (route) => {
    if (route.request().url().includes('/user/user_index')) {
      return route.fulfill({
        json: { code: 200, role: 'super_admin', permissions: [], data: { username: 'e2e' } },
      })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: {} } })
  })
}

async function mockCampSessionDetail(page) {
  const mentors = Array.from({ length: 8 }, (_, index) => ({
    user_id: 101 + index,
    username: ['林泽宇', '周启航', '陈思涵', '沈知行', '王嘉仪', '唐予安', '许一诺', '程知远'][index],
    role: 'mentor',
    team_mentor_id: null,
    joined_at: '2026-08-20T09:00:00',
  }))
  const students = Array.from({ length: 20 }, (_, index) => ({
    user_id: 201 + index,
    username: `测试学员${String(index + 1).padStart(2, '0')}`,
    role: 'student',
    team_mentor_id: index < 8 ? 101 + index : null,
    joined_at: '2026-08-20T09:00:00',
  }))
  const candidates = [
    { User_Id: 301, User_Name: '方子航', User_Email: 'candidate1@example.test', role: 'student' },
    { User_Id: 302, User_Name: '罗雨薇', User_Email: 'candidate2@example.test', role: 'student' },
    { User_Id: 303, User_Name: '邓嘉诚', User_Email: 'candidate3@example.test', role: 'student' },
  ]
  const overviewMentors = mentors.map((mentor) => ({
    ...mentor,
    has_profile: true,
    capacity: 4,
    chose_r1: 0,
    chose_r2: 0,
    matched: 1,
    remaining: 3,
  }))
  const overviewStudents = students.map((student) => ({
    user_id: student.user_id,
    username: student.username,
    matched: false,
    mentor_name: null,
    submitted_r1: false,
    submitted_r2: false,
  }))

  await page.route('http://127.0.0.1:5001/camp/sessions/1', (route) =>
    route.fulfill({ json: {
      code: 200,
      session: { id: 1, name: '本地导师双选测试营', status: 'running', category: 'learning', mentor_selection_enabled: true },
    } })
  )
  await page.route('http://127.0.0.1:5001/camp/sessions/1/members', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ json: { code: 200, message: '已加入' } })
    }
    return route.fulfill({ json: { code: 200, members: [...mentors, ...students] } })
  })
  // v1.3 阶段3：事务批量加成员（逐项回报）
  await page.route('http://127.0.0.1:5001/camp/sessions/1/members/batch', (route) =>
    route.fulfill({ json: { code: 200, message: '已加入 1/1 人', added: 1,
      results: [{ user_id: 301, status: 'added', member_id: 9001 }] } }))
  await page.route('http://127.0.0.1:5001/user/user_list', (route) =>
    route.fulfill({
      json: [
        ...mentors.map((mentor) => ({ User_Id: mentor.user_id, User_Name: mentor.username, role: 'mentor' })),
        ...students.map((student) => ({ User_Id: student.user_id, User_Name: student.username, role: 'student' })),
        ...candidates,
      ],
    })
  )
  await page.route('http://127.0.0.1:5001/camp/ms/1/overview', (route) =>
    route.fulfill({ json: {
      code: 200,
      phase: 'collecting',
      deadlines: {},
      mentors: overviewMentors,
      students: overviewStudents,
      stats: { students: 20, matched: 0, unmatched: 20, r2_enabled: false },
    } })
  )
  for (const endpoint of ['courses', 'seats', 'leave']) {
    await page.route(`http://127.0.0.1:5001/camp/sessions/1/${endpoint}`, (route) =>
      route.fulfill({ json: { code: 200, [endpoint]: [] } })
    )
  }
  await page.route('http://127.0.0.1:5001/camp/sessions/1/join-requests', (route) =>
    route.fulfill({ json: {
      code: 200,
      requests: [
        { id: 11, user_id: 401, username: '申请学员', email: 'stu@example.test', role: 'student', apply_role: 'student', reason: '想参加', status: 'pending', created_at: '2026-08-28T10:00:00' },
        { id: 12, user_id: 402, username: '报名导生', email: 'mentor@example.test', role: 'student', apply_role: 'mentor', reason: '导生报名（候选人池内）', status: 'pending', created_at: '2026-08-28T11:00:00' },
      ],
      mentors: overviewMentors,
    } })
  )
  await page.route('http://127.0.0.1:5001/camp/sessions/1/mentor-eligibility', (route) =>
    route.fulfill({ json: {
      code: 200,
      eligibility: [
        { user_id: 301, username: '方子航', email: 'candidate1@example.test', registered: false, source: 'manual' },
        { user_id: 302, username: '罗雨薇', email: 'candidate2@example.test', registered: true, source: 'level' },
      ],
    } })
  )
  // 通用拦截的 data:{} 会破坏 availableCourses 的数组契约（pageerror 断言会抓住），按真实形状补齐
  await page.route('http://127.0.0.1:5001/course/list', (route) =>
    route.fulfill({ json: [] })
  )
}

test('登录页正常渲染', async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await expect(page.locator('input[placeholder="输入密码"]')).toBeVisible()
  await expect(page.locator('input[placeholder="输入邮箱"]')).toBeVisible()
})

test('管理布局壳挂载（侧边栏 + 主区域）', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto(`${BASE}/`)
  await expect(page.locator('.admin-layout')).toBeVisible()
  await expect(page.locator('.sidebar-container')).toBeVisible()
})

test('用户管理页：角色/状态列 + 搜索 + 编辑 + 封禁', async ({ page }) => {
  await loginAsStaff(page)
  // mock 用户列表（loginAsStaff 统一拦截返回空 data，这里覆盖；level LV1-4、status active/banned）
  await page.route('http://127.0.0.1:5001/user/user_list', (route) =>
    route.fulfill({
      json: [
        { User_Id: 1, User_Name: 'alice', role: 'super_admin', admin_tag: 'teacher', join_time: '2026-08-01', User_Email: 'a@b.c', level: 1, status: 'active' },
        { User_Id: 2, User_Name: 'bob', role: 'user', join_time: '2026-08-02', User_Email: 'd@e.f', level: 3, status: 'active' },
      ],
    })
  )
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/user-manage/users`)
  await expect(page.getByRole('cell', { name: 'alice' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'bob' })).toBeVisible()

  // 角色/等级/状态列（「管理员」按行定位，避免命中侧栏等处同名文案）
  await expect(page.getByRole('row', { name: 'alice' }).getByText('管理员')).toBeVisible()
  await expect(page.getByText('LV3', { exact: true })).toBeVisible()
  await expect(page.getByText('正常', { exact: true })).toHaveCount(2)

  // super_admin 行不出封禁按钮（后端拒绝，前端预判隐藏）
  await expect(page.getByRole('row', { name: 'alice' }).getByRole('button', { name: '封禁' })).toHaveCount(0)
  await expect(page.getByRole('row', { name: 'bob' }).getByRole('button', { name: '封禁' })).toBeVisible()

  // 前端搜索：过滤后 alice 行消失
  await page.getByPlaceholder('输入用户名/角色/id').fill('bob')
  await page.getByPlaceholder('输入用户名/角色/id').press('Enter')
  await expect(page.getByRole('cell', { name: 'bob' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'alice' })).toHaveCount(0)

  // 编辑弹窗：合并端点 PUT /admin/users/2（改用户名，角色/等级随行数据回显）
  await page.getByRole('row', { name: 'bob' }).getByRole('button', { name: '编辑' }).click()
  const editDialog = page.getByRole('dialog', { name: '编辑用户' })
  await expect(editDialog).toBeVisible()
  await editDialog.getByRole('textbox').fill('bob2')
  const editRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/admin/users/2'
      && request.method() === 'PUT')
  await editDialog.getByRole('button', { name: '确定' }).click()
  const editPayload = (await editRequest).postDataJSON()
  expect(editPayload).toMatchObject({ username: 'bob2', role: 'user', level: 3 })

  // 封禁：确认框 → PUT /admin/users/2/status {status:'banned'}
  await page.getByRole('row', { name: 'bob' }).getByRole('button', { name: '封禁' }).click()
  await expect(page.locator('.el-message-box')).toContainText('营期归属全部保留')
  const banRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/admin/users/2/status'
      && request.method() === 'PUT')
  await page.locator('.el-message-box').getByRole('button', { name: '封禁' }).click()
  expect((await banRequest).postDataJSON()).toEqual({ status: 'banned' })

  expect(pageErrors).toEqual([])
})

test('md-editor-v3 编辑器挂载', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto(`${BASE}/editor`)
  // /editor 路由挂的是 ArticleEditorV2（md-editor-v3）；
  // TinyMCE 系死代码（EditorComponent/EditorCreateComponent 等）已于批次 5 删除
  await expect(page.locator('.md-editor').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: '保存草稿' })).toBeVisible()
})

test('营期详情保留选导生与成员添加能力', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.goto(`${BASE}/camp/sessions/1`)

  await expect(page.getByRole('tab', { name: '选导生' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '林泽宇', exact: true }).first()).toBeVisible()
  await expect(page.getByRole('cell', { name: '测试学员20', exact: true })).toBeVisible()

  // 加入申请：类型列按 apply_role 区分学员申请与导生报名（导生报名走审核制）
  await page.getByRole('tab', { name: '加入申请' }).click()
  await expect(page.getByRole('row', { name: /申请学员/ }).locator('.el-tag', { hasText: '学员' })).toBeVisible()
  await expect(page.getByRole('row', { name: /报名导生/ }).locator('.el-tag', { hasText: '导生' })).toBeVisible()

  // 培训营（learning）+ 超管：导生候选人 tab（候选人池 = 手工导入 + 按等级生成两种策略）
  await page.getByRole('tab', { name: '导生候选人' }).click()
  await expect(page.getByText('候选人列表（2）', { exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: '方子航', exact: true })).toBeVisible()
  await expect(page.getByText('手工导入', { exact: true })).toBeVisible()
  await expect(page.getByText('按等级', { exact: true })).toBeVisible()

  // 按等级生成：默认 LV2，请求体携带 min_level
  const genRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/camp/sessions/1/mentor-candidates/generate-by-level'
      && request.method() === 'POST')
  await page.getByRole('button', { name: '按等级生成' }).click()
  expect((await genRequest).postDataJSON()).toEqual({ min_level: 2 })

  // 移除候选人：确认框后发 DELETE，命中对应 uid
  await page.getByRole('row', { name: '方子航' }).getByRole('button', { name: '移除' }).click()
  const delRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/camp/sessions/1/mentor-candidates/301'
      && request.method() === 'DELETE')
  await page.locator('.el-message-box').getByRole('button', { name: '确定' }).click()
  expect(await delRequest).toBeTruthy()

  await page.getByRole('tab', { name: '选导生' }).click()
  await expect(page.getByText('导生概览', { exact: true })).toBeVisible()
  await expect(page.getByText('学员配对（0 / 20）', { exact: true })).toBeVisible()

  // 单轮制工具栏：志愿 CSV 导出 + 批量指派回填
  await expect(page.getByRole('button', { name: '导出志愿 CSV' })).toBeVisible()
  await page.getByRole('button', { name: '批量指派' }).click()
  const batchDialog = page.getByRole('dialog', { name: '批量指派导生' })
  await expect(batchDialog).toBeVisible()
  await expect(batchDialog.getByRole('cell', { name: '测试学员09', exact: true })).toBeVisible()
  await batchDialog.getByRole('button', { name: '关闭' }).click()

  await page.getByRole('tab', { name: '成员' }).click()
  await page.getByRole('button', { name: '加成员', exact: true }).click()
  const addDialog = page.getByRole('dialog', { name: '加成员' })
  // 身份解耦后口径：候选=非超管全员（gate 修复），营内角色显式指定（默认学员）
  await addDialog.locator('.el-select').first().click()
  const dropdown = page.locator('.el-select__popper:visible')
  await expect(dropdown.getByText('方子航（学员）', { exact: true })).toBeVisible()
  await expect(dropdown.getByText('林泽宇（导生）', { exact: true })).toHaveCount(0)
  await dropdown.getByText('方子航（学员）', { exact: true }).click()
  await expect(addDialog.getByText('营内角色', { exact: true })).toBeVisible()

  // v1.3：事务批量端点逐项回报，营内角色随 items 显式携带
  const addRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/camp/sessions/1/members/batch'
      && request.method() === 'POST')
  await page.getByRole('button', { name: '加入（1）', exact: true }).click()
  expect((await addRequest).postDataJSON()).toEqual(
    { items: [{ user_id: 301, role: 'student', team_mentor_id: null }] })
  expect(pageErrors).toEqual([])
})
