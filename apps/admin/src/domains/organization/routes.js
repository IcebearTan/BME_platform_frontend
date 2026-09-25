// 社团组织工作区：一个域一个入口（组织架构），组树/职位/任职/归属为工作区内部子导航，
// 不在全局侧栏展开四个概念（设计方案 §8 / D-03）。
const loadOrganizationWorkspace = () => import('./OrganizationWorkspace.vue')
const loadOrgOverviewPage = () => import('./pages/OrgOverviewPage.vue')
const loadClubGroupManage = () => import('../../components/ClubGroupManage.vue')
const loadClubPositionManage = () => import('../../components/ClubPositionManage.vue')
const loadOfficerManage = () => import('../../components/OfficerManage.vue')
const loadClubMembershipManage = () => import('../../components/ClubMembershipManage.vue')

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
      { path: 'groups', name: 'org.groups', component: loadClubGroupManage, meta: childMeta('组树', 20) },
      { path: 'positions', name: 'org.positions', component: loadClubPositionManage, meta: childMeta('职位定义', 30) },
      { path: 'officers', name: 'org.officers', component: loadOfficerManage, meta: childMeta('任职管理', 40) },
      { path: 'memberships', name: 'org.memberships', component: loadClubMembershipManage, meta: childMeta('成员归属', 50) },
    ],
  },
]
