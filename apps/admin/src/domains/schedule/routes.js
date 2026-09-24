// 日程服务域路由（管理端面板批次 A，2026-09-25）：只读观测，平台运营分组。
const loadScheduleService = () => import('./pages/ScheduleServicePage.vue')

export const scheduleRoutes = [
  {
    path: '/operations/schedule',
    name: 'operations.schedule',
    component: loadScheduleService,
    meta: {
      title: '日程服务', domain: 'schedule', navGroup: 'operations',
      navOrder: 70, showInMenu: true, icon: 'Calendar',
    },
  },
]
