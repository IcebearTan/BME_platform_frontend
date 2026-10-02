// 社团组织工作区：一个域一个入口（组织架构），小组/社团职务/职位定义为工作区内部子导航，
// 不在全局侧栏展开概念（设计方案 §8 / D-03）。成员归属并入小组管理页（2026-10-02 改版）。
const loadOrganizationWorkspace = () => import('./OrganizationWorkspace.vue')
const loadOrgOverviewPage = () => import('./pages/OrgOverviewPage.vue')
const loadClubGroupManage = () => import('../../components/ClubGroupManage.vue')
const loadClubPositionManage = () => import('../../components/ClubPositionManage.vue')
const loadOfficerManage = () => import('../../components/OfficerManage.vue')
const loadWorkGrantManage = () => import('../../components/WorkGrantManage.vue')

const childMeta = (title, order) => ({
  title, domain: 'organization', navOrder: order,
  showInMenu: false, activeMenu: '/organization',
})

export const organizationRoutes = [
  {
    path: '/organization',
    name: 'org',
    component: loadOrganizationWorkspace,
    redirect: { name: 'org.overview' },
    meta: { title: '组织架构', domain: 'organization', showInMenu: false, activeMenu: '/organization' },
    children: [
      { path: 'overview', name: 'org.overview', component: loadOrgOverviewPage, meta: childMeta('组织总览', 10) },
      { path: 'groups', name: 'org.groups', component: loadClubGroupManage, meta: childMeta('小组管理', 20) },
      { path: 'positions', name: 'org.positions', component: loadClubPositionManage, meta: childMeta('职位定义', 30) },
      { path: 'officers', name: 'org.officers', component: loadOfficerManage, meta: childMeta('社团职务', 40) },
      // 旧「成员归属」子页并入小组管理（2026-10-02）：旧路径与深链落到小组管理
      { path: 'memberships', name: 'org.memberships', redirect: { name: 'org.groups' } },
      // 协作授权（内部工作台治理）：后端 /work/governance/*（避开 /admin 路径门禁，超管∨治理授权可操作）
      { path: 'work-grants', name: 'org.workGrants', component: loadWorkGrantManage, meta: childMeta('协作授权', 60) },
    ],
  },
]
