import { test, expect } from '@playwright/test'

const API = 'http://127.0.0.1:5001'
const USER = 'http://127.0.0.1:18081/AMEII'
const ADMIN = 'http://127.0.0.1:15173/admin'
const rule = { id: 1, camp_id: 1, camp_name: '秋季培训营', kind: 'chapter', title: '章节认证', amount: 20, period_limit: 1, enabled: true, version: 1, effective_at: '2026-10-14T00:00:00', help: '首次完成章节认证后发放，同章不重复。', action_path: '/camp?sid=1&tab=study' }
const platformTasks = [{ id: 'daily_checkin', scope: 'platform', title: '每日打卡', frequency: '每日任务', help: '积分规则待配置', enabled: false, amount: null }, { id: 'community_post', scope: 'platform', title: '发布帖子', frequency: '社区参与', help: '积分规则待配置', enabled: false, amount: null }]
const reward = { id: 1, user_id: 21, username: '林同学', camp_id: 1, camp_name: '秋季培训营', kind: 'chapter', title: '章节认证', amount: 20, status: 'completed', reason: '完成基础章节', rule_version: 1, balance_before: 1260, balance_after: 1280, transaction_uuid: 'test-points-001', created_at: '2026-10-14T12:00:00', completed_at: '2026-10-14T12:01:00' }
async function seed(page, side='user', dark=false) {
  await page.addInitScript(({side,dark}) => {
    localStorage.setItem(`bme-${side}-token`, 'e2e-points-token')
    localStorage.setItem(`bme-${side}-state`, JSON.stringify({ token: 'e2e-points-token', isLogin: true, isDarkMode: dark, level: 3, user: { User_Id: '0000021', User_Name: '林同学', role: side === 'admin' ? 'super_admin' : 'user', permissions: [], verification_status: 'verified' } }))
    localStorage.setItem('themeInitialized', 'true')
  }, {side,dark})
  await page.route(`${API}/**`, route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/user/user_index') return route.fulfill({json:{code:200,User_Name:'林同学',User_Id:'0000021',role:side==='admin'?'super_admin':'user',permissions:[],level:3,verification_status:'verified'}})
    if (path === '/points/me') return route.fulfill({json:{code:200,status:'ready',balance:1280,rewards_enabled:true,updated_at:'2026-10-14T12:01:00'}})
    if (path === '/points/tasks') return route.fulfill({json:{code:200,items:platformTasks}})
    if (path === '/points/records') return route.fulfill({json:{code:200,items:[reward],total:1,scope:'training'}})
    if (path === '/points/pending') return route.fulfill({json:{code:200,items:[{...reward,id:2,status:'pending',balance_after:null,completed_at:null}]}})
    if (path === '/points/manage/meta') return route.fulfill({json:{code:200,camps:[{id:1,name:'秋季培训营',can_rules:true,can_review:true,readonly:false}],kinds:[{value:'chapter',label:'章节认证'}]}})
    if (path === '/points/manage/rules') return route.fulfill({json:{code:200,items:[rule]}})
    if (path === '/points/manage/rewards') return route.fulfill({json:{code:200,items:[{...reward,status:'review'}],total:1}})
    if (path === '/points/manage/members') return route.fulfill({json:{code:200,items:[{id:21,name:'林同学'}]}})
    return route.fulfill({json:{code:200,data:{},items:[],count:0,total:0}})
  })
}

for (const dark of [false,true]) {
  test(`积分用户关键路径与${dark?'深色':'浅色'}布局`, async ({page},testInfo) => {
    await seed(page,'user',dark)
    await page.setViewportSize(dark ? {width:390,height:844} : {width:1440,height:1000})
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.goto(`${USER}/user-center/points`)
    await expect(page.getByTestId('points-balance')).toHaveText('1,280')
    await expect(page.locator('.points-task')).toHaveCount(2)
    await expect(page.locator('.points-task').first()).toContainText('每日打卡')
    await expect(page.locator('.points-task').last()).toContainText('发布帖子')
    await expect(page.locator('.points-task').first()).toContainText('待开放')
    await expect(page.getByRole('button',{name:'发放进度',exact:true})).toHaveCount(0)
    await expect(page.getByRole('button',{name:'营期管理',exact:true})).toHaveCount(0)
    if (!dark) {
      await page.locator('.user-avatar').click()
      await expect(page.locator('.avatar-pop__balance')).toHaveText('1,280')
      await expect(page.locator('.dew-popover').filter({has:page.locator('.avatar-pop')})).toHaveCSS('opacity','1')
      await page.screenshot({path:testInfo.outputPath('points-avatar-light.png'),fullPage:true})
      await page.locator('.avatar-pop__wallet-head').getByRole('button',{name:'收支明细'}).click()
    } else await page.getByRole('button',{name:'收支明细',exact:true}).click()
    await expect(page.locator('.points-record')).toContainText('+20')
    await page.locator('.points-record').click()
    await expect(page.getByRole('dialog')).toContainText('test-points-001')
    await expect(page.getByRole('dialog')).toContainText('1,260 → 1,280')
    await expect(page.locator('.dew-dialog-panel')).toHaveCSS('opacity','1')
    await page.screenshot({path:testInfo.outputPath(`points-record-${dark?'dark-mobile':'light'}.png`),fullPage:true})
    await page.getByRole('dialog').getByRole('button',{name:'关闭',exact:true}).click()
    await expect(page.getByRole('button',{name:'发放进度',exact:true})).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('余额查询失败保留旧值，未关联不会伪装为零积分',async({page})=>{
  await seed(page)
  await page.goto(`${USER}/user-center/points`)
  await expect(page.getByTestId('points-balance')).toHaveText('1,280')
  await page.route(`${API}/points/me`,route=>route.fulfill({status:504,json:{code:504,message:'暂不可用'}}))
  await page.getByRole('button',{name:'刷新积分',exact:true}).click()
  await expect(page.getByText('积分暂未更新',{exact:true})).toBeVisible()
  await expect(page.getByTestId('points-balance')).toHaveText('1,280')
  await page.route(`${API}/points/me`,route=>route.fulfill({json:{code:200,status:'unlinked',balance:null,pending_total:0}}))
  await page.getByRole('button',{name:'刷新积分',exact:true}).click()
  await expect(page.getByRole('button',{name:'关联账户',exact:true})).toBeVisible()
  await expect(page.getByTestId('points-balance')).toHaveText('—')
})

test('管理端规则版本保存与奖励审核',async({page},testInfo)=>{
  await seed(page,'admin')
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  let saved=null,approved=0
  await page.route(`${API}/points/manage/rules`,route=>{
    if(route.request().method()==='POST'){saved=route.request().postDataJSON();return route.fulfill({json:{code:200,item:{...rule,...saved,version:2}}})}
    return route.fulfill({json:{code:200,items:[rule]}})
  })
  await page.route(`${API}/points/manage/rewards/1/approve`,route=>{approved++;return route.fulfill({json:{code:200,item:{...reward,status:'pending'}}})})
  await page.goto(`${ADMIN}/operations/points`)
  await expect(page.getByRole('cell',{name:'章节认证'})).toBeVisible()
  await page.getByRole('button',{name:'编辑',exact:true}).click()
  await page.getByRole('dialog').locator('input[type="number"]').first().fill('25')
  await page.getByRole('dialog').getByRole('button',{name:'保存规则',exact:true}).click()
  await expect.poll(()=>saved?.amount).toBe(25)
  expect(saved.version).toBe(1)
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('button',{name:'发放审核',exact:true}).click()
  await page.screenshot({path:testInfo.outputPath('points-admin.png'),fullPage:true})
  await page.getByRole('button',{name:'通过',exact:true}).click()
  await expect(page.getByRole('dialog')).toContainText('为 林同学 发放 20 积分')
  await page.getByRole('dialog').getByRole('button',{name:'确认',exact:true}).click()
  await expect.poll(()=>approved).toBe(1)
  await expect(page.getByRole('dialog')).not.toBeVisible()
  expect(errors).toEqual([])
})


async function campFixture(page, role='student', category='learning', sid=1) {
  const session = { id:sid, name:`测试营 ${sid}`, category, status:'running', start_date:'2026-10-01', end_date:'2026-12-01',
    is_member:role!=='teacher', my_role:role, available_perspectives:[role], my_staff_role:role==='teacher'?'teacher':null,
    my_permissions:role==='teacher'?['reward.issue']:[], policy:{capabilities:{attendance:false,leave:false}}, mentor_selection_enabled:false }
  await page.route(`${API}/camp/sessions`,r=>r.fulfill({json:{code:200,sessions:[session]}}))
  await page.route(`${API}/points/camps/${sid}/tasks`,r=>r.fulfill({json:{code:200,items:[{...rule,camp_id:sid}],enabled:true}}))
  await page.route(`${API}/points/camps/${sid}/rewards*`,r=>r.fulfill({json:{code:200,items:[{...reward,camp_id:sid,status:'pending',balance_after:null}],total:1}}))
}

for (const category of ['learning','project']) {
  test(`学员在${category==='learning'?'培训':'项目'}营工作台查看本营发放进度`,async({page},testInfo)=>{
    await seed(page);await campFixture(page,'student',category)
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.goto(`${USER}/camp?sid=1${category==='learning'?'&tab=points':''}`)
    if(category==='project') await page.getByRole('button',{name:'营期积分',exact:true}).click()
    await expect(page.locator('.cp-record')).toContainText('待到账')
    await expect(page.locator('.points-management')).toHaveCount(0)
    await page.getByRole('button',{name:'奖励规则',exact:true}).click()
    await expect(page.locator('.cp-rule')).toContainText('章节认证')
    await page.screenshot({path:testInfo.outputPath(`camp-points-${category}.png`),fullPage:true})
    expect(errors).toEqual([])
  })
}

for(const role of ['mentor','teacher']) {
  test(`${role==='mentor'?'导生':'老师'}在工作台处理积分且锁定当前营期`,async({page})=>{
    await seed(page);await campFixture(page,role,'learning',2)
    const queries=[];const errors=[];page.on('pageerror',e=>errors.push(e.message))
    await page.route(`${API}/points/manage/**`,r=>{
      const url=new URL(r.request().url());queries.push([url.pathname,url.searchParams.get('camp_id')])
      if(url.pathname.endsWith('/meta')) return r.fulfill({json:{code:200,camps:[{id:2,name:'测试营 2',can_review:role==='teacher',can_rules:false,readonly:false}],kinds:[]}})
      if(url.pathname.endsWith('/rewards'))return r.fulfill({json:{code:200,items:[{...reward,camp_id:2,status:'review'}],total:1}})
      return r.fulfill({json:{code:200,items:[]}})
    })
    await page.goto(`${USER}/camp?sid=2${role==='mentor'?'&tab=points':''}`)
    if(role==='teacher')await page.getByRole('button',{name:'积分奖励',exact:true}).click()
    await expect(page.locator('.points-management')).toContainText('林同学')
    await expect(page).toHaveURL(/tab=points/)
    await expect(page.getByText('选择营期',{exact:true})).toHaveCount(0)
    await expect(page.getByRole('button',{name:'通过',exact:true})).toHaveCount(role==='teacher'?1:0)
    expect(queries.length).toBeGreaterThanOrEqual(4)
    expect(queries.every(([,sid])=>sid==='2')).toBeTruthy()
    expect(errors).toEqual([])
  })
}

test('旧个人管理链接回落常驻途径且不请求营期待办',async({page})=>{
  await seed(page)
  const forbidden=[]
  page.on('request',r=>{if(/\/points\/(manage|pending|camps)/.test(r.url()))forbidden.push(r.url())})
  await page.goto(`${USER}/user-center/points?tab=manage`)
  await expect(page.locator('.points-task').first()).toContainText('每日打卡')
  await expect(page.locator('.points-management')).toHaveCount(0)
  expect(forbidden).toEqual([])
})


test('老师与项目营积分深链刷新后仍停留在工作台积分页',async({page})=>{
  await seed(page);await campFixture(page,'teacher')
  await page.goto(`${USER}/camp?sid=1&tab=points`)
  await expect(page.locator('.points-management')).toContainText('林同学')
  await page.reload()
  await expect(page.locator('.points-management')).toContainText('林同学')
  await campFixture(page,'student','project')
  await page.goto(`${USER}/camp?sid=1&tab=points`)
  await expect(page.locator('.cp-record')).toContainText('待到账')
})


for (const dark of [false,true]) {
  test(`首页与积分中心的暖金任务状态图标${dark?'深色窄屏':'浅色桌面'}`,async({page},testInfo)=>{
    await seed(page,'user',dark)
    await page.setViewportSize(dark?{width:390,height:844}:{width:1440,height:1000})
    const errors=[];page.on('pageerror',e=>errors.push(e.message))
    const tasks=[
      {...platformTasks[0],kind:'daily_checkin',enabled:true,completed:true,amount:5,action_path:'/home'},
      {...platformTasks[1],kind:'community_post',enabled:true,completed:false,amount:10,action_path:'/community'},
    ]
    await page.route(`${API}/points/tasks`,r=>r.fulfill({json:{code:200,items:tasks}}))
    await page.route(`${API}/banner/list`,r=>r.fulfill({json:{code:200,data:[]}}))
    await page.route(`${API}/community/feed*`,r=>r.fulfill({json:{code:200,data:[]}}))
    await page.goto(`${USER}/home`)
    const home=page.locator('.home-points')
    await expect(home.getByTestId('home-points-balance')).toHaveText('1,280')
    await expect(home.getByRole('img',{name:'已完成',exact:true})).toBeVisible()
    await expect(home.getByRole('img',{name:'未完成',exact:true})).toBeVisible()
    await expect(home.locator('.points-task-state--completed svg')).toBeVisible()
    await home.screenshot({path:testInfo.outputPath(`home-points-${dark?'dark':'light'}.png`)})
    await home.getByRole('button',{name:'积分中心',exact:true}).click()
    await expect(page.getByTestId('points-balance')).toHaveText('1,280')
    const daily=page.locator('.points-task').filter({hasText:'每日打卡'})
    const post=page.locator('.points-task').filter({hasText:'发布帖子'})
    await expect(daily.getByRole('img',{name:'已完成',exact:true})).toBeVisible()
    await expect(daily.getByRole('button',{name:/去完成/})).toHaveCount(0)
    await expect(post.getByRole('img',{name:'未完成',exact:true})).toBeVisible()
    await expect(post.getByRole('button',{name:/去完成/})).toBeVisible()
    await expect(page.locator('.my-points')).toHaveJSProperty('scrollWidth',await page.locator('.my-points').evaluate(el=>el.clientWidth))
    await page.locator('.my-points').screenshot({path:testInfo.outputPath(`points-task-states-${dark?'dark':'light'}.png`)})
    await post.getByRole('button',{name:/去完成/}).click()
    await expect(page).toHaveURL(/\/community$/)
    expect(errors).toEqual([])
  })
}

test('未开放任务显示锁形，缺少完成信息显示待更新',async({page})=>{
  await seed(page)
  await page.route(`${API}/points/tasks`,r=>r.fulfill({json:{code:200,items:[platformTasks[0],{...platformTasks[1],enabled:true}]}}))
  await page.goto(`${USER}/user-center/points`)
  await expect(page.locator('.points-task').first().getByRole('img',{name:'待开放',exact:true})).toBeVisible()
  await expect(page.locator('.points-task').first().locator('.points-task-state svg')).toBeVisible()
  await expect(page.locator('.points-task').last().getByRole('img',{name:'待更新',exact:true})).toBeVisible()
  await expect(page.getByRole('img',{name:'未完成',exact:true})).toHaveCount(0)
})
