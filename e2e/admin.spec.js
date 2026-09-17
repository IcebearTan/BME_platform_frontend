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

  // 出勤 tab（09-12 三模式：考勤模式设置卡所在，旧数据无 policy 回退 daily）
  await page.getByRole('tab', { name: '出勤' }).click()
  await expect(page.getByText(/假期营 · 每日承诺出勤/)).toBeVisible()

  // 学员申请：纯学员列表（09-12 重组——导生报名挪「选导生」tab 招募区）
  await page.getByRole('tab', { name: '学员申请' }).click()
  await expect(page.getByRole('row', { name: /申请学员/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /报名导生/ })).toHaveCount(0)

  // 选导生 tab：导生全生命周期一页——招募（待审导生报名 + 导入即导生）→ 方向配置 → 流程运营
  await page.getByRole('tab', { name: '选导生' }).click()
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

  await page.goto(`${BASE}/camp/sessions/1`)

  // 培训营（learning）恒显学习进度 tab；lazy=点击后才拉看板数据
  const boardRequest = page.waitForRequest(
    (request) => request.url() === 'http://127.0.0.1:5001/camp/sessions/1/progress/board')
  await page.getByRole('tab', { name: '学习进度' }).click()
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

  await page.goto(`${BASE}/camp/sessions/1`)

  // 学员申请：勾选「申请学员」→ 通过选中（1）→ items 带 id 与行内 _mentor（null）
  // （EP 选择列的原生 input 视觉隐藏，可见壳是 .el-checkbox label——无 role 可用，按 class 点）
  await page.getByRole('tab', { name: '学员申请' }).click()
  await page.getByRole('row', { name: '申请学员' }).locator('.el-checkbox').click()
  const visBtn = (name) => page.getByRole('button', { name }).filter({ visible: true })
  await visBtn('通过选中（1）').click()
  await expect(page.getByText('已通过 0/1 项', { exact: true })).toBeVisible()
  await expect(page.getByText(/未通过 1 项——申请学员：该用户已在营期中/)).toBeVisible()
  expect(batchBody).toEqual({ items: [{ id: 11, team_mentor_id: null }] })

  // 选导生·导生招募：一键通过（确认弹窗）→ 导生申请 id 入 items
  await page.getByRole('tab', { name: '选导生' }).click()
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

  await page.goto(`${BASE}/officer/manage`)
  await expect(page.locator('.page-title', { hasText: '社团干事' })).toBeVisible()
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

  await page.goto(`${BASE}/officer/manage`)
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

  await page.goto(`${BASE}/banner/manage`)
  await expect(page.locator('.page-title', { hasText: '首页轮播' })).toBeVisible()
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
  await fresh.goto(`${BASE}/user-manage/users`)
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

  await page.goto(`${BASE}/camp/sessions`)
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

  await page.goto(`${BASE}/user-manage/users`)
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

  await page.goto(`${BASE}/user-manage/users`)
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
