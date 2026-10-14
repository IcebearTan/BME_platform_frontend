import { test, expect } from '@playwright/test'

const API = 'http://127.0.0.1:5001'
const USER = 'http://127.0.0.1:18081/AMEII'
const ADMIN = 'http://127.0.0.1:15173/admin'
const rule = { id: 1, camp_id: 1, camp_name: '秋季培训营', kind: 'chapter', title: '章节认证', amount: 20, period_limit: 1, enabled: true, version: 1, effective_at: '2026-10-14T00:00:00', help: '首次完成章节认证后发放，同章不重复。', action_path: '/camp?sid=1&tab=learning' }
const reward = { id: 1, user_id: 21, username: '林同学', camp_id: 1, camp_name: '秋季培训营', kind: 'chapter', title: '章节认证', amount: 20, status: 'completed', reason: '完成基础章节', rule_version: 1, balance_before: 1260, balance_after: 1280, transaction_uuid: 'test-points-001', created_at: '2026-10-14T12:00:00', completed_at: '2026-10-14T12:01:00' }
async function seed(page, side='user', dark=false) {
  await page.addInitScript(({side,dark}) => {
    localStorage.setItem(`bme-${side}-token`, 'e2e-points-token')
    localStorage.setItem(`bme-${side}-state`, JSON.stringify({ token: 'e2e-points-token', isLogin: true, isDarkMode: dark, level: 3, user: { User_Id: '0000021', User_Name: '林同学', role: side === 'admin' ? 'super_admin' : 'user', permissions: [] } }))
    localStorage.setItem('themeInitialized', 'true')
  }, {side,dark})
  await page.route(`${API}/**`, route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/user/user_index') return route.fulfill({json:{code:200,User_Name:'林同学',User_Id:'0000021',role:side==='admin'?'super_admin':'user',permissions:[],level:3}})
    if (path === '/points/me') return route.fulfill({json:{code:200,status:'ready',balance:1280,pending_total:20,can_manage:false,rewards_enabled:true,updated_at:'2026-10-14T12:01:00'}})
    if (path === '/points/tasks') return route.fulfill({json:{code:200,items:[rule]}})
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
    await expect(page.locator('.points-task')).toContainText('章节认证')
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
    await page.getByRole('button',{name:'发放进度',exact:true}).click()
    await expect(page.locator('.points-record')).toContainText('待到账')
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
