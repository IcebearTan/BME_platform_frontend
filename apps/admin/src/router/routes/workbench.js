// 工作台：待办优先首页（2026-09-21 IA 重构，设计方案 §6）
const loadWorkbenchPage = () => import('../../domains/workbench/WorkbenchPage.vue')
const loadWorkItemsPage = () => import('../../domains/workbench/WorkItemsPage.vue')

export const workbenchRoutes = [
  {
    path: '/workbench/items',
    name: 'workbench.items',
    component: loadWorkItemsPage,
    meta: {
      title: '平台待办', domain: 'workbench', navGroup: 'workbench',
      showInMenu: false, activeMenu: '/', staffOnly: true,
    },
  },
  {
    path: '',
    name: 'home_default',
    component: loadWorkbenchPage,
    meta: { title: '工作台' },
  },
  {
    // 旧入口兼容：仪表盘别名收敛到工作台
    path: '/dashboard',
    name: 'dashboard',
    redirect: () => ({ path: '/' }),
  },
]
