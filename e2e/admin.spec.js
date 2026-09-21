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
  await page.route('**/camp/sessions/1/members?*', (route) => {
    const url = new URL(route.request().url())
    const role = url.searchParams.get('role')
    const keyword = url.searchParams.get('keyword') || ''
    let rows = [...mentors, ...students]
    if (role) {
      const roles = new Set(role.split(','))
      rows = rows.filter((member) => roles.has(member.role))
    }
    if (keyword) rows = rows.filter((member) => member.username.includes(keyword))
    const pageSize = Number(url.searchParams.get('page_size') || 20)
    const pageNo = Number(url.searchParams.get('page') || 1)
    const start = (pageNo - 1) * pageSize
    return route.fulfill({ json: {
      code: 200, members: rows.slice(start, start + pageSize), total: rows.length,
      page: pageNo, page_size: pageSize,
      counts: { mentor: mentors.length, student: students.length, member: 0 },
    } })
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
  await page.route('**/camp/sessions/1/member-candidates*', (route) => {
    const keyword = new URL(route.request().url()).searchParams.get('keyword') || ''
    const rows = candidates.filter((user) => !keyword
      || user.User_Name.includes(keyword) || user.User_Email.includes(keyword))
    return route.fulfill({ json: { code: 200, users: rows, total: rows.length, page: 1, page_size: 20 } })
  })
  await page.route('**/camp/ms/1/overview*', (route) => {
    const url = new URL(route.request().url())
    const keyword = url.searchParams.get('student_keyword') || ''
    const pageSize = Number(url.searchParams.get('student_page_size') || 20)
    const pageNo = Number(url.searchParams.get('student_page') || 1)
    const filtered = keyword
      ? overviewStudents.filter((student) => student.username.includes(keyword))
      : overviewStudents
    const start = (pageNo - 1) * pageSize
    return route.fulfill({ json: {
      code: 200,
      phase: 'collecting',
      deadlines: {},
      mentors: overviewMentors,
      students: filtered.slice(start, start + pageSize),
      student_total: filtered.length,
      student_page: pageNo,
      student_page_size: pageSize,
      stats: { students: 20, matched: 0, unmatched: 20, r2_enabled: false },
    } })
  })
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
        { id: 12, user_id: 402, username: '报名导生', email: 'mentor@example.test', role: 'student', apply_role: 'mentor', reason: '导生报名', status: 'pending', created_at: '2026-08-28T11:00:00' },
      ],
      mentors: overviewMentors,
    } })
  )
  // 2026-09-12 资格名单退役：导入导生=邮箱选人器（按等级填充只读端点）+ members/batch role=mentor 直入营
  await page.route('http://127.0.0.1:5001/camp/sessions/1/mentor-import/candidates-by-level', (route) =>
    route.fulfill({ json: { code: 200, data: { min_level: 2, count: 2,
      emails: ['candidate1@example.test', 'candidate2@example.test'] } } })
  )
  await page.route('http://127.0.0.1:5001/camp/sessions/1/mentor-import/preview', (route) =>
    route.fulfill({ json: { code: 200, data: {
      matched: [
        { user_id: 301, email: 'candidate1@example.test', username: '方子航', already_member: false },
        { user_id: 302, email: 'candidate2@example.test', username: '罗雨薇', already_member: true },
      ],
      unmatched_emails: [] } } })
  )
  // 按姓名搜人（手头只有名字没有邮箱）：username 模糊匹配，回邮箱/等级，已在营供置灰
  await page.route('**/camp/sessions/1/mentor-import/search*', (route) =>
    route.fulfill({ json: { code: 200, data: { keyword: '沈', users: [
      { user_id: 303, username: '沈若彤', email: 'ruotong@example.test', level: 2, institute: '物理学院', major: null, already_member: false },
      { user_id: 304, username: '沈亦航', email: 'yihang@example.test', level: 3, institute: null, major: null, already_member: true },
    ] } } })
  )
  // 通用拦截的 data:{} 会破坏 availableCourses 的数组契约（pageerror 断言会抓住），按真实形状补齐
  // （09-20 课程下架改造后 CampSessionDetail 改调 admin_list）
  await page.route('http://127.0.0.1:5001/course/admin_list', (route) =>
    route.fulfill({ json: [] })
  )
}

test('登录页正常渲染', async ({ page }) => {
  await page.goto(`${BASE}/login`)
  await expect(page.locator('input[placeholder="输入密码"]')).toBeVisible()
  await expect(page.locator('input[placeholder="输入邮箱"]')).toBeVisible()
})

test('管理员提交登录后进入仪表盘且首屏无组件异常', async ({ page }) => {
  const pageErrors = []
  const componentWarnings = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'warning' && /Failed to resolve component|accessed during render|made a reactive object/.test(message.text())) {
      componentWarnings.push(message.text())
    }
  })

  await page.route('http://127.0.0.1:5001/**', (route) => {
    const url = route.request().url()
    if (url.includes('/auth/admin_login')) {
      return route.fulfill({ json: {
        code: 200,
        token: 'e2e-login-token',
        role: 'super_admin',
        permissions: [],
        User_Name: 'e2e 管理员',
      } })
    }
    if (url.includes('/user/user_index')) {
      return route.fulfill({ json: {
        code: 200,
        role: 'super_admin',
        permissions: [],
        User_Name: 'e2e 管理员',
      } })
    }
    return route.fulfill({ json: { code: 200, data: {} } })
  })

  await page.goto(`${BASE}/login`)
  await page.getByPlaceholder('输入邮箱').fill('admin@example.com')
  await page.getByPlaceholder('输入密码').fill('Experience2026!')
  await page.getByRole('button', { name: '登录' }).click()

  await expect(page).toHaveURL(`${BASE}/`)
  await expect(page.getByRole('heading', { name: /欢迎回来/ })).toBeVisible()
  expect(pageErrors).toEqual([])
  expect(componentWarnings).toEqual([])
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

  await page.goto(`${BASE}/system/accounts`)
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

test('营期工作区保留选导生与成员添加能力', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.goto(`${BASE}/camps/1/people/members`)

  // 工作区左侧局部导航（稳定分组）+ 聚合根头部
  await expect(page.locator('.ws-name')).toHaveText('本地导师双选测试营')
  await expect(page.getByRole('menuitem', { name: '导生招募与匹配' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '林泽宇', exact: true }).first()).toBeVisible()
  // 成员表服务端分页：首屏只挂 20 行，第二页再取余下成员
  await expect(page.locator('.pagination-wrapper').first()).toContainText('28')
  await expect(page.getByRole('cell', { name: '测试学员20', exact: true })).toHaveCount(0)
  await page.locator('.pagination-wrapper .btn-next').first().click()
  await expect(page.getByRole('cell', { name: '测试学员20', exact: true })).toBeVisible()

  // 营期设置叶（09-17 集中管理：考勤模式/门槛开关/选导生配置收拢于此；旧数据无 policy 回退默认。
  // 09-18 并自 jiayuanpush：考勤模式选项卡式布局 + 帮助弹窗）
  await page.getByRole('menuitem', { name: '营期设置' }).click()
  await expect(page.getByText('假期营', { exact: true })).toBeVisible()
  await expect(page.locator('.att-daily-panel')).toBeVisible()
  await expect(page.getByRole('button', { name: '查看出勤说明' })).toBeVisible()
  await expect(page.getByRole('button', { name: '查看选导生配置说明' })).toBeVisible()
  // 09-17 门槛可配置：门槛开关（mock 无新位 → 回退类型默认=开，旧营期口径）
  await expect(page.getByText('报名等级门槛')).toBeVisible()
  await expect(page.getByText('LV2 及以上才能自助报名导生（默认）')).toBeVisible()
  // 切换即保存：PUT /camp/sessions/1 携带 policy.mentor_level_gate=false
  //（el-switch 的原生 input 视觉隐藏，Playwright 点外层 .el-switch 容器）
  const gateRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/camp/sessions/1' && request.method() === 'PUT')
  await page.locator('.gate-row .el-switch').click()
  expect((await gateRequest).postDataJSON()).toEqual({ policy: { mentor_level_gate: false } })

  // 考勤叶：设置迁走后只留数据运营（daily 回退 → 重生成按钮锁定剩余内容）
  await page.getByRole('menuitem', { name: '考勤', exact: true }).click()
  await expect(page.getByRole('button', { name: '重生成承诺出勤日' })).toBeVisible()

  // 加入申请：纯学员列表（09-12 重组——导生报名挪「导生招募与匹配」招募区）
  await page.getByRole('menuitem', { name: '加入申请' }).click()
  await expect(page.getByRole('row', { name: /申请学员/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /报名导生/ })).toHaveCount(0)

  // 导生招募与匹配：纯运营一页——招募（待审导生报名 + 导入即导生）→ 流程运营（配置已迁「营期设置」）
  await page.getByRole('menuitem', { name: '导生招募与匹配' }).click()
  await expect(page.getByText('导生招募', { exact: true })).toBeVisible()
  await expect(page.getByRole('row', { name: /mentor@example.test/ })).toBeVisible()

  // 按姓名搜人：只有名字没有邮箱时，远程搜索挑人 → 邮箱自动回填导入框；已在营选项置灰
  // （EP 新版 select 的 placeholder 是 span 非 input 属性：点击展开后键盘输入）
  const searchRequest = page.waitForRequest((request) =>
    request.url().includes('/camp/sessions/1/mentor-import/search')
      && request.method() === 'GET')
  await page.locator('.elig-search').click()
  await page.keyboard.type('沈')
  expect((await searchRequest).url()).toContain('keyword=')
  await expect(page.getByRole('option', { name: /沈亦航/ })).toBeDisabled()
  await page.getByRole('option', { name: /沈若彤/ }).click()
  await expect(page.locator('textarea[placeholder*="导生邮箱"]')).toHaveValue(/ruotong@example.test/)
  await expect(page.getByText('已添加 沈若彤')).toBeVisible()

  // 按等级填充：默认 LV2，请求体携带 min_level，候选邮箱回填导入框
  const genRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/camp/sessions/1/mentor-import/candidates-by-level'
      && request.method() === 'POST')
  await page.getByRole('button', { name: '按等级填充' }).click()
  expect((await genRequest).postDataJSON()).toEqual({ min_level: 2 })
  await expect(page.locator('textarea[placeholder*="导生邮箱"]')).toHaveValue(/candidate1@example.test/)

  // 预览：邮箱→账号匹配，已在营者标注跳过
  await page.getByRole('button', { name: '预览' }).click()
  await expect(page.getByText('预览结果（2 个邮箱）', { exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: '方子航', exact: true })).toBeVisible()
  await expect(page.getByText('将导入', { exact: true })).toBeVisible()
  // 「已在营」锚定预览表格行（搜索下拉置灰选项的同名标签会残留在关闭的 popper 里）
  await expect(page.getByRole('row', { name: /罗雨薇/ }).getByText('已在营', { exact: true })).toBeVisible()

  // 确认导入：members/batch 以导生身份直接入营（已在营的罗雨薇被剔除）
  const importRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/camp/sessions/1/members/batch'
      && request.method() === 'POST')
  await page.getByRole('button', { name: '确认导入' }).click()
  expect((await importRequest).postDataJSON()).toEqual(
    { items: [{ user_id: 301, role: 'mentor' }] })
  await expect(page.getByText('已加入 1/1 人')).toBeVisible()

  await expect(page.getByText('导生概览', { exact: true })).toBeVisible()
  await expect(page.getByText('学员配对（0 / 20）', { exact: true })).toBeVisible()

  // 单轮制工具栏：志愿 CSV 导出 + 批量指派回填
  await expect(page.getByRole('button', { name: '导出志愿 CSV' })).toBeVisible()
  await page.getByRole('button', { name: '批量指派' }).click()
  const batchDialog = page.getByRole('dialog', { name: '批量指派导生' })
  await expect(batchDialog).toBeVisible()
  await expect(batchDialog.getByRole('cell', { name: '测试学员09', exact: true })).toBeVisible()
  await batchDialog.getByRole('button', { name: '关闭' }).click()

  await page.getByRole('menuitem', { name: '成员名单' }).click()
  await page.getByRole('button', { name: '加成员', exact: true }).click()
  const addDialog = page.getByRole('dialog', { name: '加成员' })
  // 候选改为后端分页远程搜索：首批只返回未入营普通用户，营内角色仍显式指定（默认学员）
  await addDialog.locator('.el-select').first().click()
  const dropdown = page.locator('.el-select__popper:visible')
  await expect(dropdown.getByText('方子航（candidate1@example.test）', { exact: true })).toBeVisible()
  await expect(dropdown.getByText(/林泽宇/)).toHaveCount(0)
  await dropdown.getByText('方子航（candidate1@example.test）', { exact: true }).click()
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

// 营期设置（09-17 集中管理）：三区块分区渲染 + 叶子路由直达/切换跟随
test('营期设置：三区块分区渲染 + 叶子路由直达', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  // 叶子路由直达（mock 营 running/learning → 三区块齐备）
  await page.goto(`${BASE}/camps/1/settings`)

  await expect(page.locator('.page-title', { hasText: '营期设置' })).toBeVisible()
  // 三区块标题齐备（learning 营：准入门槛/考勤模式/选导生流程）
  for (const title of ['准入门槛', '考勤模式', '选导生流程']) {
    await expect(page.locator('.set-card__title', { hasText: title })).toBeVisible()
  }
  // 准入门槛：导生报名门槛开关（回退默认开）
  await expect(page.locator('.gate-row').getByText('报名等级门槛')).toBeVisible()
  // 考勤模式：三模式选项卡回退 daily（09-18 并自 jiayuanpush 布局改版，参数内联 daily 卡）
  await expect(page.getByText('假期营', { exact: true })).toBeVisible()
  await expect(page.locator('.att-daily-panel')).toBeVisible()
  // 选导生流程：mock status=running → 时间窗锁定（方向课程绑定仍可改，1750de5 起语义放宽）
  await expect(page.getByText(/时间窗锁定/)).toBeVisible()

  // 路由切换跟随：切到成员名单叶子 URL 同步
  await page.getByRole('menuitem', { name: '成员名单' }).click()
  await expect(page).toHaveURL(/people\/members/)
  expect(pageErrors).toEqual([])
})

test('营期详情学习进度看板：分组子矩阵 + 汇总条 + 未分组', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  // 看板数据：1 个有方向组（已完结/认证中/未开始三种格子态）+ 未分组桶
  await page.route('http://127.0.0.1:5001/camp/sessions/1/progress/board', (route) =>
    route.fulfill({ json: { code: 200,
      summary: { group_count: 1, student_count: 3, certified_chapters: 4,
        total_chapters: 9, completed_courses: 1, certified_rate: 44 },
      groups: [
        { mentor_user_id: 101, mentor_name: '林泽宇', direction: '硬件组', hint: null,
          certified_rate: 56,
          courses: [
            { course_id: 11, course_title: '生物医学工程导论' },
            { course_id: 12, course_title: '电路基础' },
          ],
          students: [
            { student_user_id: 201, username: '测试学员20', certified_rate: 78, courses: [
              { course_id: 11, course_title: '生物医学工程导论', certified_chapters: 3,
                total_chapters: 3, score_avg: 88, course_status: 'completed',
                chapters: [{ chapter_id: 1, name: '1.1 概述', order: 1, lessons: 2,
                  lessons_completed: 2, certified: true, certified_at: '2026-09-10 10:00',
                  certified_by: 101, score: 88, material_count: 1 }] },
              { course_id: 12, course_title: '电路基础', certified_chapters: 1,
                total_chapters: 4, score_avg: null, course_status: 'active',
                chapters: [{ chapter_id: 2, name: '2.1 元件', order: 1, lessons: 3,
                  lessons_completed: 1, certified: true, certified_at: '2026-09-12 15:00',
                  certified_by: 101, score: null, material_count: 0 }] },
            ] },
            { student_user_id: 202, username: '测试学员21', certified_rate: 0, courses: [
              { course_id: 11, course_title: '生物医学工程导论', certified_chapters: 0,
                total_chapters: 3, score_avg: null, course_status: null,
                chapters: [{ chapter_id: 1, name: '1.1 概述', order: 1, lessons: 2,
                  lessons_completed: 1, certified: false, certified_at: null,
                  certified_by: null, score: null, material_count: 0 }] },
              { course_id: 12, course_title: '电路基础', certified_chapters: 0,
                total_chapters: 4, score_avg: null, course_status: null, chapters: [] },
            ] },
          ] },
        { mentor_user_id: null, mentor_name: null, direction: null,
          hint: '尚未归属导生（开放报名后随导生继承方向）', certified_rate: null, courses: [],
          students: [{ student_user_id: 203, username: '测试学员22', certified_rate: null, courses: [] }] },
      ] } }))

  await page.goto(`${BASE}/camps/1/learning/progress`)

  // 培训营（learning）专属叶子：上山即拉看板数据
  const boardRequest = page.waitForRequest(
    (request) => request.url() === 'http://127.0.0.1:5001/camp/sessions/1/progress/board')
  await boardRequest

  // 汇总条 + 组头（导生/方向/人数/组认证率）+ 未分组桶
  // 注：不单独断言导生名「林泽宇」——成员 tab（默认已渲染）同名单元格会撞 strict mode
  await expect(page.getByText('认证章节 4/9', { exact: true })).toBeVisible()
  await expect(page.getByText('已完结课程 1', { exact: true })).toBeVisible()
  await expect(page.getByText('3 名学员 · 1 个导生组', { exact: true })).toBeVisible()
  await expect(page.getByText('硬件组', { exact: true })).toBeVisible()
  await expect(page.getByText('组认证率 56%', { exact: true })).toBeVisible()
  await expect(page.getByText('未分组', { exact: true })).toBeVisible()
  await expect(page.getByText(/尚未归属导生/)).toBeVisible()

  // 三种格子态：已完结（绿）=课程汇总态齐；认证中 n/m；未认证仅自学
  await expect(page.getByText('已完结 3/3', { exact: true })).toBeVisible()
  await expect(page.getByText('1/4', { exact: true })).toBeVisible()
  await expect(page.getByText('0/3', { exact: true })).toBeVisible()
  // 逐章明细在 title tooltip（悬停可见），不占格子版面
  await expect(page.locator('div[title*="生物医学工程导论 · 均分 88"]')).toHaveCount(1)

  expect(pageErrors).toEqual([])
})

test('营期申请批量通过：学员多选 + 导生一键通过（逐项回报契约）', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  // 批量端点 mock：id=11 那项失败（已在营），其余成功——契约红线=部分成功逐项列明
  let batchBody = null
  await page.route('http://127.0.0.1:5001/camp/sessions/1/join-requests/batch-approve', (route) => {
    batchBody = route.request().postDataJSON()
    const results = batchBody.items.map((it) =>
      (it.id === 11 ? { id: it.id, status: 'failed', message: '该用户已在营期中' }
                    : { id: it.id, status: 'approved', member_id: 9000 + it.id }))
    const ok = results.filter((r) => r.status === 'approved').length
    return route.fulfill({ json: { code: 200, message: `已通过 ${ok}/${batchBody.items.length} 项`,
      approved: ok, results } })
  })

  await page.goto(`${BASE}/camps/1/people/applications`)

  // 学员申请：勾选「申请学员」→ 通过选中（1）→ items 带 id 与行内 _mentor（null）
  // （EP 选择列的原生 input 视觉隐藏，可见壳是 .el-checkbox label——无 role 可用，按 class 点）
  await page.getByRole('row', { name: '申请学员' }).locator('.el-checkbox').click()
  const visBtn = (name) => page.getByRole('button', { name }).filter({ visible: true })
  await visBtn('通过选中（1）').click()
  await expect(page.getByText('已通过 0/1 项', { exact: true })).toBeVisible()
  await expect(page.getByText(/未通过 1 项——申请学员：该用户已在营期中/)).toBeVisible()
  expect(batchBody).toEqual({ items: [{ id: 11, team_mentor_id: null }] })

  // 导生招募与匹配：一键通过（确认弹窗）→ 导生申请 id 入 items
  await page.goto(`${BASE}/camps/1/learning/mentor-matching`)
  await visBtn('一键通过').click()
  await page.getByRole('button', { name: '全部通过' }).click()
  await expect(page.getByText('已通过 1/1 项', { exact: true })).toBeVisible()
  expect(batchBody).toEqual({ items: [{ id: 12, team_mentor_id: null }] })

  expect(pageErrors).toEqual([])
})

// 社团配置 mock（Phase C 起任命弹窗读 /admin/club/*，提交走 id 轨道）
async function mockClubMeta(page) {
  await page.route('http://127.0.0.1:5001/admin/club/positions', (route) => route.fulfill({
    json: { code: 200, message: 'ok', data: { positions: [
      { id: 1, name: '社长', sort_rank: 1, badge_tier: 1, badge_with_group: false, group_rule: 'forbidden', per_group_limit: 0, global_limit: 1, status: 'active', active_count: 0 },
      { id: 2, name: '副社长', sort_rank: 2, badge_tier: 1, badge_with_group: true, group_rule: 'optional', per_group_limit: 1, global_limit: 3, status: 'active', active_count: 0 },
      { id: 3, name: '组长', sort_rank: 5, badge_tier: 2, badge_with_group: true, group_rule: 'required', per_group_limit: 1, global_limit: 0, status: 'active', active_count: 0 },
    ] } },
  }))
  await page.route('http://127.0.0.1:5001/admin/club/groups', (route) => route.fulfill({
    json: { code: 200, message: 'ok', data: { groups: [
      { id: 10, name: '项目运营组', parent_id: null, sort_order: 1, status: 'active', refs: { children: 1, officers: 0, members: 0 } },
      { id: 11, name: '培训组', parent_id: 10, sort_order: 1, status: 'active', refs: { children: 1, officers: 0, members: 0 } },
      { id: 12, name: '硬件组', parent_id: 11, sort_order: 1, status: 'active', refs: { children: 0, officers: 0, members: 0 } },
    ] } },
  }))
}

test('社团干事管理页：列表渲染 + 任命提交 + 卸任弹窗', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  // 任职列表（默认在任视图）+ 用户名单；任命/卸任捕获请求体
  await page.route('http://127.0.0.1:5001/admin/officers**', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { code: 200, message: 'ok', data: {
        officers: [
          { id: 1, user_id: 11, username: '陈嘉树', avatar: '', title: '社长', department: null,
            term_start: '2026-09-01', term_end: null, status: 'active', end_reason: null,
            created_at: '2026-09-12T10:00:00' },
        ], total: 1, page: 1, per_page: 20 } } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: { id: 9 } } })
  })
  await page.route('http://127.0.0.1:5001/user/user_list', (route) =>
    route.fulfill({ json: [{ User_Id: 21, User_Name: '苏晚晴' }, { User_Id: 22, User_Name: '顾亦深' }] }))
  await mockClubMeta(page)

  await page.goto(`${BASE}/organization/officers`)
  await expect(page.locator('.page-title', { hasText: '任职管理' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '陈嘉树' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '在任', exact: true })).toBeVisible()

  // 任命：选成员 + 选职位（下拉读 /admin/club/positions）→ 提交体走 id 轨道 user_id/title_id
  await page.getByRole('button', { name: '任命' }).click()
  const dialog = page.locator('.el-dialog').filter({ hasText: '任命干事' })
  await expect(dialog).toBeVisible()
  await dialog.locator('.el-select').first().click()
  const memberDropdown = page.locator('.el-select__popper:visible')
  await memberDropdown.getByText('苏晚晴', { exact: true }).click()
  await dialog.locator('.el-select').nth(1).click()
  const titleDropdown = page.locator('.el-select__popper:visible')
  await titleDropdown.getByText('副社长', { exact: true }).click()
  const appointRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/admin/officers' && request.method() === 'POST')
  await dialog.getByRole('button', { name: '确认' }).click()
  const appointBody = (await appointRequest).postDataJSON()
  expect(appointBody.user_id).toBe(21)
  expect(appointBody.title_id).toBe(2)
  expect(appointBody.term_start).toBeTruthy()

  // 卸任：行内按钮开弹窗，默认今天 + 原因选填
  await page.getByRole('button', { name: '卸任' }).first().click()
  const endDialog = page.locator('.el-dialog').filter({ hasText: '卸任（记录保留）' })
  await expect(endDialog).toBeVisible()
  const endRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/admin/officers/1/end' && request.method() === 'POST')
  await endDialog.getByRole('button', { name: '确认卸任' }).click()
  expect((await endRequest).postDataJSON().term_end).toBeTruthy()

  expect(pageErrors).toEqual([])
})

test('社团干事管理页：挂组职位任命走三级级联选组（id 轨道）', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/admin/officers**', (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { code: 200, message: 'ok', data: { officers: [], total: 0, page: 1, per_page: 20 } } })
    }
    return route.fulfill({ json: { code: 200, message: 'ok', data: { id: 9 } } })
  })
  await page.route('http://127.0.0.1:5001/user/user_list', (route) =>
    route.fulfill({ json: [{ User_Id: 22, User_Name: '顾亦深' }] }))
  await mockClubMeta(page)

  await page.goto(`${BASE}/organization/officers`)
  await page.getByRole('button', { name: '任命' }).click()
  const dialog = page.locator('.el-dialog').filter({ hasText: '任命干事' })
  await dialog.locator('.el-select').first().click()
  await page.locator('.el-select__popper:visible').getByText('顾亦深', { exact: true }).click()
  await dialog.locator('.el-select').nth(1).click()
  await page.locator('.el-select__popper:visible').getByText('组长', { exact: true }).click()
  // 组树三级路径：项目运营组 → 培训组 → 硬件组（级联选项读 /admin/club/groups，checkStrictly 任一节点可选，group_id 只存所选节点）
  await dialog.locator('.el-cascader').click()
  await page.locator('.el-cascader-menu:visible').first().getByText('项目运营组', { exact: true }).click()
  await page.locator('.el-cascader-menu:visible').nth(1).getByText('培训组', { exact: true }).click()
  await page.locator('.el-cascader-menu:visible').nth(2).getByText('硬件组', { exact: true }).click()
  await page.keyboard.press('Escape')   // checkStrictly 面板不自动收起，Escape 关闭保留所选
  const appointRequest = page.waitForRequest((request) =>
    request.url() === 'http://127.0.0.1:5001/admin/officers' && request.method() === 'POST')
  await dialog.getByRole('button', { name: '确认' }).click()
  const body = (await appointRequest).postDataJSON()
  expect(body.user_id).toBe(22)
  expect(body.title_id).toBe(3)
  expect(body.group_id).toBe(12)

  expect(pageErrors).toEqual([])
})

// ── 首页轮播管理页（09-15 新增页面）：列表渲染 + 新建弹窗交互 ──

test('首页轮播管理：列表渲染 + 新建帧弹窗校验', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/banner/admin/list', (route) => route.fulfill({
    json: {
      code: 200,
      data: [
        { Banner_Id: 1, title: '营期中心', description: '查看营期与报名', image: '/media/banners/1/a.webp', link_type: 'route', link_value: '/camp', is_camp_frame: false, visible: true, sort_order: 1 },
        { Banner_Id: 2, title: '3D打印农场', description: '', image: '/media/banners/2/b.webp', link_type: 'external', link_value: '/3dfarm/', is_camp_frame: false, visible: false, sort_order: 2 },
      ],
    },
  }))

  await page.goto(`${BASE}/operations/home-content`)
  await expect(page.locator('.page-title', { hasText: '首页内容' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '营期中心' }).first()).toBeVisible()
  // 隐藏帧的底图有置灰样式（is-hidden）
  await expect(page.locator('.banner-thumb.is-hidden')).toHaveCount(1)

  // 新建弹窗：缺底图时提交被前端拦截并提示
  await page.getByRole('button', { name: /新建轮播帧/ }).click()
  const dialog = page.locator('.el-dialog').filter({ hasText: '新建轮播帧' })
  await dialog.locator('input').first().fill('测试帧')
  await dialog.getByRole('button', { name: /创建/ }).click()
  await expect(page.locator('.el-message').filter({ hasText: '必须选择底图' })).toBeVisible()

  expect(pageErrors).toEqual([])
})

// 回归：退出登录全链路（2fde712 按需引入曾漏注册 $confirm/$message，点退出无反应；
// 且 logout action 只清 user 不清 token，退出后免密直进）。两层都要守住。
test('退出登录：确认弹窗 → 清 token → 跳登录页', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/`)
  await expect(page.locator('.admin-layout')).toBeVisible()

  // 头像下拉 → 退出登录 → $confirm 确认框必须能弹出（函数式 API 注册回归）
  await page.locator('.user-profile').click()
  await page.locator('.el-dropdown-menu__item').filter({ hasText: '退出登录' }).click()
  const confirmBox = page.locator('.el-message-box').filter({ hasText: '确定要退出登录吗' })
  await expect(confirmBox).toBeVisible()
  await confirmBox.getByRole('button', { name: /确定/ }).click()

  // 跳登录页 + token 双清（localStorage 键与 vuex-persistedstate 状态）
  await expect(page).toHaveURL(new RegExp(`${BASE.replace('/', '\\/')}/login$`))
  await expect(page.locator('input[placeholder="输入密码"]')).toBeVisible()
  const token = await page.evaluate(() => localStorage.getItem('bme-admin-token'))
  const stateToken = await page.evaluate(
    () => JSON.parse(localStorage.getItem('bme-admin-state') || '{}').token
  )
  expect(token).toBeNull()
  expect(stateToken).toBeNull()

  // 退出后访问受保护页：应被 401 踢回登录。
  // 不能复用当前 page：loginAsStaff 的 addInitScript 每次 goto 都会重新播种 token，
  // 故同 context 新开页面（共享 localStorage，已是退出态），mock 还原真实鉴权语义
  const fresh = await page.context().newPage()
  await fresh.route('http://127.0.0.1:5001/user/user_index', (route) => {
    const auth = route.request().headers()['authorization']
    if (!auth) return route.fulfill({ status: 401, json: { code: 401, message: 'token缺失' } })
    return route.fulfill({
      json: { code: 200, role: 'super_admin', permissions: [], data: { username: 'e2e' } },
    })
  })
  await fresh.goto(`${BASE}/system/accounts`)
  // 401 处理器有 1s 延迟跳转（等 toast 显示完），等 URL 而非固定 sleep
  await expect(fresh).toHaveURL(/\/admin\/login$/, { timeout: 6000 })
  await fresh.close()

  expect(pageErrors).toEqual([])
})

// 营期列表·逻辑删除（09-16）：确认弹窗 → DELETE → 刷新；进行中营不显示删除按钮
test('营期列表：逻辑删除（running 营无删除入口）', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/camp/sessions', (route) =>
    route.fulfill({ json: { code: 200, sessions: [
      { id: 61, name: '草稿测试营', category: 'learning', status: 'draft',
        start_date: '2026-10-01', end_date: '2026-10-30', member_count: 0, is_featured: false },
      { id: 63, name: '进行中的营', category: 'learning', status: 'running',
        start_date: '2026-09-01', end_date: '2026-09-30', member_count: 2, is_featured: false },
      { id: 64, name: '已归档营', category: 'project', status: 'archived',
        start_date: '2026-07-01', end_date: '2026-08-31', member_count: 5, is_featured: false },
    ] } }))
  await page.route('http://127.0.0.1:5001/camp/cycles', (route) =>
    route.fulfill({ json: { code: 200, cycles: [] } }))
  let deleteHit = null
  await page.route('http://127.0.0.1:5001/camp/sessions/61', (route) => {
    deleteHit = route.request().method()
    return route.fulfill({ json: { code: 200, message: '已删除（逻辑删除，数据保留，可由管理员恢复）' } })
  })

  await page.goto(`${BASE}/camps`)
  // 进行中营无删除按钮（先结营再删）；草稿/归档营有
  await expect(page.getByRole('row', { name: /进行中的营/ }).getByRole('button', { name: '删除' })).toHaveCount(0)
  await page.getByRole('row', { name: /草稿测试营/ }).getByRole('button', { name: '删除' }).click()

  const confirmBox = page.getByRole('dialog').filter({ hasText: '删除营期' })
  await expect(confirmBox.getByText(/逻辑删除/)).toBeVisible()
  await confirmBox.getByRole('button', { name: '删除', exact: true }).click()
  await expect(page.getByText('已删除（逻辑删除，数据保留，可由管理员恢复）')).toBeVisible()
  expect(deleteHit).toBe('DELETE')

  expect(pageErrors).toEqual([])
})

// 用户管理·批量升级（09-16）：多选+确认+逐项回报（LV4 满级回报失败）+ LV 徽标色阶
test('用户管理：批量升级 + 等级徽标色阶', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.route('http://127.0.0.1:5001/user/user_list', (route) =>
    route.fulfill({ json: [
      { User_Id: 1, User_Name: 'alice', role: 'super_admin', admin_tag: 'teacher', join_time: '2026-08-01', User_Email: 'a@b.c', level: 1, status: 'active' },
      { User_Id: 2, User_Name: 'bob', role: 'user', join_time: '2026-08-02', User_Email: 'd@e.f', level: 3, status: 'active' },
      { User_Id: 3, User_Name: 'carol', role: 'user', join_time: '2026-08-03', User_Email: 'g@h.i', level: 4, status: 'active' },
    ] }))
  let batchBody = null
  await page.route('http://127.0.0.1:5001/admin/users/level/batch', (route) => {
    batchBody = route.request().postDataJSON()
    return route.fulfill({ json: { code: 200, message: '已升级 1/2 人', upgraded: 1, results: [
      { user_id: 2, username: 'bob', status: 'upgraded', old_level: 3, level: 4 },
      { user_id: 3, username: 'carol', status: 'failed', message: '已是最高等级 LV4' },
    ] } })
  })

  await page.goto(`${BASE}/system/accounts`)
  // LV 徽标色阶（.lv-badge.lv-N 全局体系）
  await expect(page.locator('.lv-badge.lv-1').filter({ hasText: 'LV1' })).toBeVisible()
  await expect(page.locator('.lv-badge.lv-4').filter({ hasText: 'LV4' })).toBeVisible()

  // 勾选 bob + carol → 批量升级（确认弹窗）→ 逐项回报
  await page.getByRole('row', { name: 'bob' }).locator('.el-checkbox').click()
  await page.getByRole('row', { name: 'carol' }).locator('.el-checkbox').click()
  await page.getByRole('button', { name: '批量升级（2）' }).click()
  await page.getByRole('button', { name: '升级', exact: true }).click()
  await expect(page.getByText('已升级 1/2 人')).toBeVisible()
  await expect(page.getByText(/未升级 1 人——carol：已是最高等级 LV4/)).toBeVisible()
  expect(batchBody).toEqual({ user_ids: [2, 3] })

  expect(pageErrors).toEqual([])
})

// 用户管理·批量调级（09-17）：多选 + 弹窗选目标等级 + skipped 汇总在 message 回报
test('用户管理：批量调级为指定等级', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.route('http://127.0.0.1:5001/user/user_list', (route) =>
    route.fulfill({ json: [
      { User_Id: 2, User_Name: 'bob', role: 'user', join_time: '2026-08-02', User_Email: 'd@e.f', level: 3, status: 'active' },
      { User_Id: 3, User_Name: 'carol', role: 'user', join_time: '2026-08-03', User_Email: 'g@h.i', level: 4, status: 'active' },
    ] }))
  let setBody = null
  await page.route('http://127.0.0.1:5001/admin/users/level/batch_set', (route) => {
    setBody = route.request().postDataJSON()
    return route.fulfill({ json: { code: 200, message: '已调整 1/2 人（1 人已是 LV4）', updated: 1, results: [
      { user_id: 2, username: 'bob', status: 'set', old_level: 3, level: 4 },
      { user_id: 3, username: 'carol', status: 'skipped', old_level: 4, level: 4 },
    ] } })
  })

  await page.goto(`${BASE}/system/accounts`)
  // 勾选 bob(LV3) + carol(LV4) → 批量调级 → 弹窗选 LV4 → 确认
  await page.getByRole('row', { name: 'bob' }).locator('.el-checkbox').click()
  await page.getByRole('row', { name: 'carol' }).locator('.el-checkbox').click()
  await page.getByRole('button', { name: '批量调级（2）' }).click()
  const setDialog = page.getByRole('dialog', { name: '批量调整等级' })
  await expect(setDialog.getByText('将把选中的 2 名用户统一调整为：')).toBeVisible()
  await setDialog.locator('.el-select').click()
  const levelDropdown = page.locator('.el-select__popper:visible')
  await levelDropdown.getByText('LV4', { exact: true }).click()
  await setDialog.getByRole('button', { name: '确认调整' }).click()
  // skipped 不算失败：汇总进 success message，不弹逐项 warning
  await expect(page.getByText('已调整 1/2 人（1 人已是 LV4）')).toBeVisible()
  expect(setBody).toEqual({ user_ids: [2, 3], level: 4 })

  expect(pageErrors).toEqual([])
})

// 社区治理（Phase 2 09-20）：global 帖列表 + 置顶/隐藏操作（mock /discussions/threads）
test('社区治理：帖子列表 + 置顶/隐藏操作', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/discussions/threads**', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ json: { code: 200, data: { is_pinned: true, pinned_until: '2026-09-27 00:00:00' } } })
    }
    return route.fulfill({ json: { code: 200, data: [
      { id: 61, title: '招人联调帖', content: '内容', images: [], category: 'recruit', category_text: '招人',
        project_id: 801, project_title: '智能输液监护', scope_type: 'global', scope_id: null,
        author_id: 6, author_name: '张三', author_avatar: '', status: 'normal', is_pinned: false,
        pinned_effective: false, reply_count: 2, like_count: 1, view_count: 9, created_at: '2026-09-20 09:00:00' },
    ], total: 1, page: 1, per_page: 50, pages: 1 } })
  })
  await page.route('http://127.0.0.1:5001/discussions/threads/61/hide', (route) =>
    route.fulfill({ json: { code: 200, data: { status: 'hidden' } } }))

  await page.goto(`${BASE}/operations/community`)
  await expect(page.locator('.page-title')).toContainText('社区治理')
  const row = page.getByRole('row', { name: '招人联调帖' })
  await expect(row).toBeVisible()
  await expect(row).toContainText('招人')
  await expect(row).toContainText('智能输液监护')

  // 隐藏：POST hide → 刷新后状态标签变化（mock 数据不重放变化，断言请求即可）
  const hideReq = page.waitForRequest((req) => req.url().includes('/threads/61/hide') && req.method() === 'POST')
  await row.getByRole('button', { name: '隐藏' }).click()
  expect((await hideReq).method()).toBe('POST')
  await expect(page.locator('.el-message__content').filter({ hasText: '已隐藏' })).toBeVisible()

  expect(pageErrors).toEqual([])
})

// XLAB 项目治理（Phase 2 09-20）：广场条目集中上下架
test('XLAB 项目治理：列表 + 下架确认', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/showcase/projects', (route) =>
    route.fulfill({ json: { code: 200, total: 1, all_tags: [], projects: [
      { id: 801, source: 'community', source_text: '自由分享', title: '智能输液监护', summary: '病房样机',
        cover: null, cover_thumb: null, images: [], tags: [], project_status: 'ongoing',
        project_status_text: '进行中', status: 'visible', view_count: 9, favorite_count: 0,
        members: [], links: [], owner_name: 'proj_s1', created_at: '2026-09-01T10:00:00' },
    ] } }))
  await page.route('http://127.0.0.1:5001/showcase/projects/801/status', (route) =>
    route.fulfill({ json: { code: 200, message: '已下架' } }))

  await page.goto(`${BASE}/operations/showcase`)
  await expect(page.locator('.page-title')).toContainText('项目广场治理')
  const row = page.getByRole('row', { name: '智能输液监护' })
  await expect(row).toBeVisible()

  // 下架走确认框
  await row.getByRole('button', { name: '下架' }).click()
  const putStatus = page.waitForRequest((req) =>
    req.url().includes('/showcase/projects/801/status') && req.method() === 'PUT')
  await page.getByRole('button', { name: '下架', exact: true }).last().click()
  expect((await putStatus).postDataJSON()).toEqual({ status: 'hidden' })

  expect(pageErrors).toEqual([])
})

// 课程治理（09-20）：下架状态标签 + 手动排序 + 下架确认
test('课程管理：状态标签 + 上移排序 + 下架确认', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.route('http://127.0.0.1:5001/course/admin_list', (route) =>
    route.fulfill({ json: [
      { Course_Id: '801', Course_title: 'C语言程序设计（旧版）', Course_Introduction: '2025 版课程',
        Course_Chapters: 8, Course_Class_Hour: 32, Course_Difficulty: 2, Course_Tags: '软件组',
        Course_Other_Tags: [], Course_Time: '2026-07-01 10:00:00', Course_Cover_Thumb: null,
        Course_Status: 'normal', Course_Learning_Mode: 'open' },
      { Course_Id: '802', Course_title: 'C语言程序设计（新版）', Course_Introduction: '2026 版课程',
        Course_Chapters: 10, Course_Class_Hour: 40, Course_Difficulty: 2, Course_Tags: '软件组',
        Course_Other_Tags: [], Course_Time: '2026-09-18 10:00:00', Course_Cover_Thumb: null,
        Course_Status: 'off_shelf', Course_Learning_Mode: 'camp' },
    ] }))
  await page.route('http://127.0.0.1:5001/course/sort', (route) =>
    route.fulfill({ json: { code: 200, message: '排序成功' } }))
  await page.route('http://127.0.0.1:5001/course/shelf', (route) =>
    route.fulfill({ json: { code: 200, message: '已下架' } }))

  await page.goto(`${BASE}/content/courses`)
  await expect(page.locator('.page-title')).toContainText('课程管理')
  const oldRow = page.getByRole('row', { name: 'C语言程序设计（旧版）' })
  const newRow = page.getByRole('row', { name: 'C语言程序设计（新版）' })
  await expect(oldRow).toBeVisible()
  await expect(newRow).toBeVisible()
  // 下架课程带「已下架」状态标签；学习方式列各自渲染（migrate_52）
  await expect(newRow.locator('.el-tag').first()).toHaveText('已下架')
  await expect(oldRow.locator('.el-tag').first()).toHaveText('上架')
  await expect(oldRow.locator('.el-tag').nth(1)).toHaveText('自主学')
  await expect(newRow.locator('.el-tag').nth(1)).toHaveText('营期学')

  // 上移：乐观换位后提交全量顺序（Course_Ids 为数字数组）
  const sortReq = page.waitForRequest((req) =>
    req.url().includes('/course/sort') && req.method() === 'POST')
  await newRow.getByRole('button', { name: '上移' }).click()
  expect((await sortReq).postDataJSON()).toEqual({ Course_Ids: [802, 801] })

  // 下架走确认框，Course_Id 保持字符串
  await oldRow.getByRole('button', { name: '下架', exact: true }).click()
  const shelfReq = page.waitForRequest((req) =>
    req.url().includes('/course/shelf') && req.method() === 'POST')
  await page.getByRole('button', { name: '确定下架' }).click()
  expect((await shelfReq).postDataJSON()).toEqual({ Course_Id: '801', Status: 'off_shelf' })
  await expect(page.locator('.el-message__content').filter({ hasText: '已下架' })).toBeVisible()

  expect(pageErrors).toEqual([])
})

test('课程编辑页：资源页签管理（09-21 自列表行迁入）', async ({ page }) => {
  await loginAsStaff(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  // 编辑页加载链：search / chapter_list（裸数组）/ lesson_list
  await page.route('http://127.0.0.1:5001/course/search**', (route) =>
    route.fulfill({ json: { code: 200, Course_Id: '801', Course_Title: 'C语言程序设计',
      Introduction: '2025 版课程', Chapters: 8, Course_Class_Hour: 32, Course_Difficulty: 2,
      Course_Tags: '软件组', Course_Other_Tags: [], Cover: null, Cover_Thumb: null,
      Learning_Mode: 'camp' } }))
  await page.route('http://127.0.0.1:5001/course/chapter_list**', (route) =>
    route.fulfill({ json: [] }))
  await page.route('http://127.0.0.1:5001/course/lesson/list**', (route) =>
    route.fulfill({ json: { code: 200, data: [] } }))
  await page.route('http://127.0.0.1:5001/course/resources**', (route) =>
    route.fulfill({ json: { code: 200, data: [
      { id: 1, name: '课程讲义.pdf', size: 20480, created_at: '2026-09-21 10:00' },
      { id: 2, name: '示例代码.zip', size: 40960, created_at: '2026-09-21 10:01' }] } }))
  await page.route('http://127.0.0.1:5001/course/resource_sort', (route) =>
    route.fulfill({ json: { code: 200, message: '排序成功' } }))
  await page.route('http://127.0.0.1:5001/course/resource_del', (route) =>
    route.fulfill({ json: { code: 200, message: '删除成功' } }))

  await page.goto(`${BASE}/content/courses/801/edit`)
  // 资源页签在编辑页内，不在列表行（入口迁移验收）
  await page.getByRole('tab', { name: '课程资源' }).click()
  await expect(page.locator('.el-table').first()).toContainText('课程讲义.pdf')

  // 上移第二行 → 提交全量顺序（乐观换位）
  const sortReq = page.waitForRequest((req) =>
    req.url().includes('/course/resource_sort') && req.method() === 'POST')
  await page.getByRole('button', { name: '上移 示例代码.zip' }).click()
  expect((await sortReq).postDataJSON()).toEqual({ Course_Id: '801', Resource_Ids: [2, 1] })
  expect(pageErrors).toEqual([])
})

test('旧路由重定向到新信息架构路径（兼容层）', async ({ page }) => {
  await loginAsStaff(page)

  // [旧路径, 期望落地 URL]——重定向须保留语义：路径换轨、query 透传（工单 view 等）
  const cases = [
    ['/dashboard', '/'],
    ['/user-manage/users', '/system/accounts'],
    ['/officer/manage', '/organization/officers'],
    ['/club/groups', '/organization/groups'],
    ['/club/positions', '/organization/positions'],
    ['/club/membership', '/organization/memberships'],
    ['/article/manage', '/content/articles'],
    ['/course/manage', '/content/courses'],
    ['/course/create', '/content/courses/new'],
    ['/course/edit/12', '/content/courses/12/edit'],
    ['/resource/manage', '/content/resources'],
    ['/discussion/manage', '/operations/community'],
    ['/showcase/manage', '/operations/showcase'],
    ['/banner/manage', '/operations/home-content'],
    ['/medal/manage', '/operations/medals'],
    ['/medal/grant', '/operations/medals?view=grants'],
    ['/notification/manage', '/operations/notifications'],
    ['/llm/projects', '/api-platform/projects'],
    ['/llm/users', '/api-platform/users'],
    ['/llm/quota-requests', '/api-platform/quota-requests'],
    ['/seat/manage', '/system/facilities/seats'],
    ['/attendance-report/manage', '/system/attendance-report'],
    ['/audit/logs', '/system/audit-logs'],
    ['/camp/sessions', '/camps'],
    ['/camp/attendance', '/camps/attendance-overview'],
    ['/camp/templates', '/camps/templates'],
  ]
  for (const [from, to] of cases) {
    await page.goto(`${BASE}${from}`)
    await expect(page).toHaveURL(`${BASE}${to}`)
  }
  // 本用例只验 URL 映射：blanket mock 的空 data 形状会让部分列表页 mount 报错，
  // 目标页各自的挂载健康由其专属用例（带正确形状 mock + pageerror 断言）负责
})

// ── 营期工作区（IA 重构）：?tab= 兼容映射 / 类型与能力门禁 / 面包屑 / 概览 / focus 深链 ──

test('旧营期详情 ?tab= 深链映射到工作区叶子（兼容层）', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  const cases = [
    ['?tab=settings', '/camps/1/settings'],
    ['?tab=pdeli', '/camps/1/project/deliveries'],
    ['?tab=ms&focus=12', '/camps/1/learning/mentor-matching?focus=12'],
    ['', '/camps/1/people/members'],
    ['?tab=bogus', '/camps/1/people/members'],
  ]
  for (const [from, to] of cases) {
    await page.goto(`${BASE}/camp/sessions/1${from}`)
    await expect(page).toHaveURL(`${BASE}${to}`)
  }
  expect(pageErrors).toEqual([])
})

test('工作区导航按营期类型分组：培训营见选导生、无项目营工作区', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/camps/1/overview`)
  await expect(page.getByRole('menuitem', { name: '导生招募与匹配' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: '学习进度' })).toBeVisible()
  // learning 营没有项目营工作区（类型分组导航，P-05）
  await expect(page.getByRole('menuitem', { name: '项目申报' })).toHaveCount(0)
  await expect(page.getByRole('menuitem', { name: '项目组队' })).toHaveCount(0)
  expect(pageErrors).toEqual([])
})

// 项目营 mock：category=project，业务端点走通用空数据拦截即可
async function mockProjectCamp(page, id = 2) {
  await page.route(`http://127.0.0.1:5001/camp/sessions/${id}`, (route) =>
    route.fulfill({ json: { code: 200, session: {
      id, name: '项目营测试营', status: 'running', category: 'project',
    } } }))
}

test('项目营工作区：类型门禁重定向 + blocked 原因告警', async ({ page }) => {
  await loginAsStaff(page)
  await mockProjectCamp(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/camps/2/learning/progress`)
  // 冷路径权威门禁：session 加载后复核 → 带原因跳概览（刷新仍可读）
  await expect(page).toHaveURL(/\/camps\/2\/overview\?blocked=camp\.learning\.progress/)
  await expect(page.getByText('该页面仅适用于培训营')).toBeVisible()

  // 暖路径：同会话再次直进错型叶子，beforeEnter 直接拦（不经叶子渲染）
  await page.goto(`${BASE}/camps/2/learning/mentor-matching`)
  await expect(page).toHaveURL(/\/camps\/2\/overview\?blocked=camp\.learning\.mentorMatching/)

  // 反向：项目营工作区齐备、培训营工作区消失
  await expect(page.getByRole('menuitem', { name: '项目申报' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: '导生招募与匹配' })).toHaveCount(0)
  expect(pageErrors).toEqual([])
})

test('能力开关门禁：seat 关闭 → 座位分配叶重定向 + 导航项消失', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  // 覆盖 session：policy 显式关座位（后一个 route 覆盖 mockCampSessionDetail 的同 URL mock）
  await page.route('http://127.0.0.1:5001/camp/sessions/1', (route) =>
    route.fulfill({ json: { code: 200, session: {
      id: 1, name: '本地导师双选测试营', status: 'running', category: 'learning',
      mentor_selection_enabled: true,
      policy: { capabilities: { seat: false } },
    } } }))
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/camps/1/operations/seats`)
  await expect(page).toHaveURL(/\/camps\/1\/overview\?blocked=camp\.ops\.seats/)
  await expect(page.getByText('本营未启用座位能力，可在「营期设置」开启')).toBeVisible()
  await expect(page.getByRole('menuitem', { name: '座位分配' })).toHaveCount(0)
  expect(pageErrors).toEqual([])
})

test('面包屑携带营期对象名 + 父菜单激活', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/camps/1/people/members`)
  // 对象详情面包屑：工作台 / 营期运营 / {营期名} / 人员与组织（分组） / 成员名单
  const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' })
  await expect(breadcrumb.getByText('本地导师双选测试营')).toBeVisible()
  await expect(breadcrumb.getByText('成员名单')).toBeVisible()
  // 所有 /camps/:id/* 激活全局父菜单「教学周期与营期」
  await expect(page.getByRole('menuitem', { name: '教学周期与营期' })).toHaveClass(/is-active/)
  expect(pageErrors).toEqual([])
})

test('负责人页：委任入口 + 名单与职责事件表', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const staffMock = {
    code: 200,
    staff: [
      { user_id: 71, username: '李老师', role: 'owner', status: 'active', assigned_by_name: '管理员', assigned_at: '2026-08-01T09:00:00' },
      { user_id: 72, username: '王老师', role: 'teacher', status: 'active', assigned_by_name: '李老师', assigned_at: '2026-08-02T09:00:00' },
    ],
    events: [
      { id: 1, username: '李老师', action: 'assign', before_role: null, after_role: 'owner', operator_name: '管理员', reason: '', occurred_at: '2026-08-01T09:00:00' },
    ],
  }
  await page.route('http://127.0.0.1:5001/camp/sessions/1/staff', (route) =>
    route.fulfill({ json: staffMock }))
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/camps/1/people/staff`)
  await expect(page.getByRole('button', { name: '委任主负责人' })).toBeVisible()
  await expect(page.getByRole('button', { name: '委任协同老师' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '李老师', exact: true }).first()).toBeVisible()
  await expect(page.getByText('职责变更记录')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('概览页：聚合摘要渲染 + blocked 说明与设置入口', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const overviewMock = {
    code: 200,
    overview: {
      stage: 'running', stage_label: '进行中',
      start_date: '2026-09-01', end_date: '2026-10-24',
      counts: { student: 20, mentor: 8, member: 0, unmatched: 12 },
      pending: { join: 1, leave: 2, delivery: 0, oldest_join_at: '2026-09-18T10:00:00' },
      capabilities: { attendance: true, leave: true, seat: false },
      available_transitions: ['close'],
      learning_summary: { ms_stats: { mentors_without_profile: 1, students_without_preference: 5, preference_deadline: null } },
      recent_events: [],
    },
  }
  await page.route('http://127.0.0.1:5001/camp/sessions/1/admin-overview', (route) =>
    route.fulfill({ json: overviewMock }))
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/camps/1/overview`)
  await expect(page.getByText('当前阶段', { exact: true })).toBeVisible()
  await expect(page.getByText(/可执行动作：结营归档/)).toBeVisible()
  await expect(page.getByText('成员构成', { exact: true })).toBeVisible()
  await expect(page.getByText('待审加入申请')).toBeVisible()
  await expect(page.getByText('待审批请假')).toBeVisible()
  await expect(page.getByText('座位（关）', { exact: true })).toBeVisible()

  // blocked 说明可刷新存活，且带设置入口（canManage 时）
  await page.goto(`${BASE}/camps/1/overview?blocked=camp.ops.seats`)
  await expect(page.getByText('已离开「座位分配」')).toBeVisible()
  await expect(page.getByRole('button', { name: '前往营期设置调整能力开关' })).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('focus 深链：加入申请行定位高亮', async ({ page }) => {
  await loginAsStaff(page)
  await mockCampSessionDetail(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/camps/1/people/applications?focus=11`)
  const row = page.getByRole('row', { name: /申请学员/ })
  await expect(row).toBeVisible()
  await expect(row).toHaveClass(/current-row/, { timeout: 5000 })
  expect(pageErrors).toEqual([])
})

// ── 用户反馈工单（阶段 6A）：列表/详情/受理回复/状态迁移 ──

async function mockFeedbackTickets(page) {
  const tickets = [
    { id: 501, title: '登录后头像不显示', reporter_user_id: 52, reporter_name: '学员小一',
      category: 'bug', severity: 'high', priority: 'medium', status: 'new',
      assignee_user_id: null, assignee_name: null, resolution_code: null, resolution_summary: null,
      attachment_count: 1, message_count: 0,
      created_at: '2026-09-20T10:00:00', updated_at: '2026-09-20T10:00:00' },
    { id: 502, title: '希望增加深色模式', reporter_user_id: 53, reporter_name: '学员小二',
      category: 'feature_request', severity: 'normal', priority: 'low', status: 'triaged',
      assignee_user_id: 74, assignee_name: '本地超管(测试)', resolution_code: null, resolution_summary: null,
      attachment_count: 0, message_count: 2,
      created_at: '2026-09-19T09:00:00', updated_at: '2026-09-19T12:00:00' },
    { id: 503, title: '课程封面显示异常', reporter_user_id: 54, reporter_name: '学员小三',
      category: 'content_issue', severity: 'low', priority: 'medium', status: 'closed',
      assignee_user_id: 74, assignee_name: '本地超管(测试)', resolution_code: 'fixed',
      resolution_summary: '已更换资源', attachment_count: 0, message_count: 1,
      created_at: '2026-09-10T09:00:00', updated_at: '2026-09-12T09:00:00' },
  ]
  await page.route('http://127.0.0.1:5001/admin/feedback-tickets?*', (route) =>
    route.fulfill({ json: { code: 200, tickets, total: tickets.length, page: 1, page_size: 15 } }))
  await page.route('http://127.0.0.1:5001/admin/feedback-tickets/501', (route) =>
    route.fulfill({ json: { code: 200, ticket: {
      ...tickets[0], description: '点击头像区域后页面空白',
      attachments: [{ id: 9, original_name: 'repro.png', mime_type: 'image/png', size: 4096,
        url: '/feedback-tickets/attachments/9?u=74&e=1999999999&st=abc' }],
      messages: [
        { id: 1, author_user_id: 74, author_name: '本地超管(测试)', visibility: 'internal',
          body: '内部判断：疑似缓存问题', created_at: '2026-09-20T11:00:00' },
      ],
      events: [{ id: 1, event_type: 'created', from_status: null, to_status: 'new',
        actor_user_id: 52, actor_name: '学员小一', created_at: '2026-09-20T10:00:00' }],
    } } }))
  await page.route('http://127.0.0.1:5001/admin/feedback-tickets/501/messages', (route) =>
    route.fulfill({ json: { code: 200, message: '已回复（用户可见）' } }))
  await page.route('http://127.0.0.1:5001/admin/feedback-tickets/501/triage', (route) =>
    route.fulfill({ json: { code: 200, message: '已受理' } }))
  await page.route('http://127.0.0.1:5001/user/user_list', (route) =>
    route.fulfill({ json: [{ User_Id: 74, User_Name: '本地超管(测试)', role: 'super_admin' }] }))
}

test('工单列表：待处理优先 + 筛选 + 详情深链', async ({ page }) => {
  await loginAsStaff(page)
  await mockFeedbackTickets(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/operations/feedback-tickets`)
  await expect(page.locator('.page-title')).toContainText('用户反馈工单')
  // 默认排序：新提交在前、已关闭在后
  const rows = page.getByRole('row')
  await expect(page.getByRole('row', { name: /登录后头像不显示/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /课程封面显示异常/ })).toBeVisible()

  // 行点击 → 详情
  await page.getByRole('row', { name: /登录后头像不显示/ }).click()
  await expect(page).toHaveURL(/feedback-tickets\/501$/)
  await expect(page.getByText('工单 #501')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('工单详情：内部备注标记 + 受理 + 公开回复 + 状态迁移动作', async ({ page }) => {
  await loginAsStaff(page)
  await mockFeedbackTickets(page)
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/operations/feedback-tickets/501`)
  // 内部备注在管理端带「内部」标记（用户接口侧由后端查询层排除——smoke 覆盖）
  await expect(page.getByText('内部判断：疑似缓存问题')).toBeVisible()
  await expect(page.getByText('内部', { exact: true })).toBeVisible()

  // 公开回复（默认 public）→ POST messages
  const replyReq = page.waitForRequest((req) =>
    req.url().includes('/admin/feedback-tickets/501/messages') && req.method() === 'POST')
  await page.locator('textarea[placeholder*="公开回复"]').fill('已复现，正在排查')
  await page.getByRole('button', { name: '发送', exact: true }).click()
  expect((await replyReq).postDataJSON()).toEqual({ body: '已复现，正在排查', visibility: 'public' })

  // 受理（new 状态 → triage 走 PATCH triage）
  const triageReq = page.waitForRequest((req) =>
    req.url().includes('/admin/feedback-tickets/501/triage') && req.method() === 'PATCH')
  await page.getByRole('button', { name: '受理', exact: true }).click()
  await triageReq

  // 状态迁移动作随状态机渲染（mock 仍 new → 只显示「不予受理」）
  await expect(page.getByRole('button', { name: '不予受理' })).toBeVisible()
  await expect(page.getByRole('button', { name: '开始处理' })).toHaveCount(0)
  expect(pageErrors).toEqual([])
})

test('工作台：待办摘要 + 进行中营期 + 风险提示', async ({ page }) => {
  await loginAsStaff(page)
  await page.route('http://127.0.0.1:5001/admin/workbench/summary', (route) =>
    route.fulfill({ json: { code: 200, data: {
      pending: { camp_join: 3, camp_leave: 7, project_application: 0, project_delivery: 2,
        quota_request: 1, feedback_ticket: 4 },
      oldest_pending_at: { camp_join: null, camp_leave: '2026-09-20T12:40:10' },
      running_camps: [{ id: 63, name: '2026秋季培训营', category: 'learning', cycle_name: '2026 秋季',
        start_date: '2026-09-01', end_date: '2027-01-18', member_count: 28,
        pending_join: 3, pending_leave: 7, unmatched: 0 }],
      risks: [{ camp_id: 63, camp_name: '2026秋季培训营', rule: 'attendance_not_configured',
        detail: '已启用考勤但营内没有考勤计划（承诺出勤日未生成）' }],
    } } }))
  await page.route('http://127.0.0.1:5001/admin/overview', (route) =>
    route.fulfill({ json: { code: 200, data: { user_new_today: 2, checkin_today: 15 } } }))
  await page.route('http://127.0.0.1:5001/auth/audit_records*', (route) =>
    route.fulfill({ json: { code: 200, data: { logs: [], total: 0 } } }))
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))

  await page.goto(`${BASE}/`)
  await expect(page.getByText('欢迎回来', { exact: false })).toBeVisible()
  await expect(page.getByText('待我处理')).toBeVisible()
  await expect(page.getByRole('row')).toHaveCount(0)
  // 待办分组按处理语义渲染，数量来自摘要
  await expect(page.locator('.todo-card', { hasText: '人员准入' }).locator('.todo-count')).toHaveText('3')
  await expect(page.locator('.todo-card', { hasText: '项目流程' }).locator('.todo-count')).toHaveText('2')
  await expect(page.locator('.todo-card', { hasText: '用户支持' }).locator('.todo-count')).toHaveText('4')
  // 进行中营期卡 + 风险
  await expect(page.getByText('2026秋季培训营')).toBeVisible()
  await expect(page.getByText('已启用考勤但营内没有考勤计划')).toBeVisible()
  expect(pageErrors).toEqual([])
})
