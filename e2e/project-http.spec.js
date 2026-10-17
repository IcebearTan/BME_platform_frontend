import {test,expect} from '@playwright/test'

const BASE='http://project-workspace.test:18098/AMEII'
test.beforeEach(async({page})=>{
  // 仅转发真实HTTP响应，避免系统代理接管测试域名；不模拟API或浏览器能力。
  await page.route('http://project-workspace.test:18098/**',async route=>{
    const url=new URL(route.request().url());url.hostname='127.0.0.1'
    const response=await route.fetch({url:url.href,headers:{...route.request().headers(),host:'127.0.0.1:18098'}})
    await route.fulfill({response})
  })
  page.on('pageerror',error=>console.error('HTTP page error:',error.message))
  page.on('requestfailed',request=>console.error('HTTP request failed:',request.url(),request.failure()?.errorText))
})
async function login(page,name='负责人演示'){
  await page.goto(`${BASE}/dev/project-workspace`)
  expect(await page.evaluate(()=>isSecureContext)).toBe(false)
  expect(await page.evaluate(()=>typeof crypto.randomUUID)).toBe('undefined')
  await expect(page.locator('.preview-roles')).toBeVisible({timeout:10000})
  await page.locator('.preview-roles .dew-card').filter({has:page.getByRole('heading',{name,exact:true})}).getByRole('button',{name:'进入工作台'}).click()
  await expect(page.locator('.project-workspace')).toBeVisible()
}

test('普通HTTP下从营期进入独立项目，栏目切换及刷新保持工作区',async({page,request})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  const health=await(await request.get('http://127.0.0.1:5016/preview/health')).json()
  await login(page,'成员演示')
  await page.goto(`${BASE}/camp?sid=${health.camps.independent}`)
  await expect(page).toHaveURL(/project-workspace/)
  await expect(page.locator('.pd-head h1')).toHaveText('独立项目 · 日历试用')
  const nav=label=>page.getByRole('navigation',{name:'项目功能'}).getByRole('button',{name:label,exact:true})
  await nav('项目日历').click();await expect(page.locator('.pc-grid')).toBeVisible()
  await nav('记录与成果').click();await expect(page.locator('.project-records')).toBeVisible()
  await nav('本期考核').click();await expect(page.locator('.pm-content')).toContainText('本期阶段汇报')
  await page.reload();await expect(page.locator('.pd-layout')).toBeVisible()
  await expect(page.locator('.pm-content')).toContainText('本期阶段汇报')
  expect(errors).toEqual([])
})

test('普通HTTP下可创建项目、确认D0、保存节点与研发记录',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await login(page);await page.goto(`${BASE}/my-projects`)
  await page.getByRole('button',{name:'创建项目',exact:true}).click()
  const title=`HTTP项目检查 ${Date.now()}`
  await page.getByPlaceholder('项目名称',{exact:true}).fill(title)
  await page.locator('.dew-dialog').getByRole('button',{name:'创建',exact:true}).click()
  await expect(page.locator('.pd-head h1')).toHaveText(title)
  const nav=label=>page.getByRole('navigation',{name:'项目功能'}).getByRole('button',{name:label,exact:true})
  await nav('项目日历').click();await page.getByRole('button',{name:'设置D0',exact:true}).click()
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date())
  await page.getByLabel('正式启动日期').fill(today)
  await page.getByPlaceholder('请说明启动日期的依据').fill('普通HTTP兼容检查')
  await page.getByRole('button',{name:'预览日期变化',exact:true}).click()
  await page.getByRole('button',{name:'确认D0',exact:true}).click()
  await expect(page.locator('.pc-head')).toContainText(today)
  await page.getByRole('button',{name:'添加关键节点',exact:true}).click()
  await page.getByPlaceholder('例如：首版样机验证').fill('HTTP关键节点')
  await page.getByPlaceholder('说明本次新增或调整').fill('请求键兼容检查')
  await page.getByRole('button',{name:'保存节点',exact:true}).click()
  await expect(page.locator('.pc-event').filter({hasText:'HTTP关键节点'})).toBeVisible()
  await nav('记录与成果').click();await page.getByRole('button',{name:'新增记录',exact:true}).click()
  await page.getByPlaceholder('记录标题',{exact:true}).fill('HTTP研发记录')
  await page.getByPlaceholder('说明本次新增或调整').fill('请求键兼容检查')
  await page.getByRole('button',{name:'保存记录',exact:true}).click()
  await expect(page.locator('.pr-record')).toContainText('HTTP研发记录')
  expect(errors).toEqual([])
})
