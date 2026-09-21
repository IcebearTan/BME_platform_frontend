// 营期域路由：顶层集合页 + 工作区嵌套叶子 + 旧路径重定向（含 ?tab= 深链映射）。
// 后端接口零改动——叶子复用原营期全部业务端点。
const loadCampSessionList = () => import('../../components/CampSessionList.vue')
const loadCampAttendanceBoard = () => import('../../components/CampAttendanceBoard.vue')
const loadPlatformTemplates = () => import('../../components/PlatformTemplates.vue')
const loadCampWorkspaceShell = () => import('./workspace/CampWorkspaceShell.vue')
const loadOverview = () => import('./pages/CampOverviewPage.vue')
const loadMembers = () => import('./pages/CampMembersPage.vue')
const loadApplications = () => import('./pages/CampApplicationsPage.vue')
const loadStaff = () => import('./pages/CampStaffPage.vue')
const loadCourses = () => import('./pages/CampCoursesPage.vue')
const loadAttendance = () => import('./pages/CampAttendancePage.vue')
const loadLeaves = () => import('./pages/CampLeavesPage.vue')
const loadSeats = () => import('./pages/CampSeatsPage.vue')
const loadRewards = () => import('./pages/CampRewardsPage.vue')
const loadMentorMatching = () => import('./pages/CampMentorMatchingPage.vue')
const loadProgress = () => import('./pages/CampProgressPage.vue')
const loadProjectApplications = () => import('./pages/CampProjectApplicationsPage.vue')
const loadProjectFormation = () => import('./pages/CampProjectFormationPage.vue')
const loadProjectDeliveries = () => import('./pages/CampProjectDeliveriesPage.vue')
const loadProjectArchive = () => import('./pages/CampProjectArchivePage.vue')
const loadSettings = () => import('./pages/CampSettingsPage.vue')

import { peekCamp } from './context/campCategoryCache'
import { isRouteApplicable } from './workspace/workspaceNav'

// 暖门禁：营期类别已在缓存（此前加载过/同会话深链过）时，进叶前就拦下不适用路由。
// 权威校验在壳加载 session 后的复核（CampWorkspaceShell watch）——冷路径直进错型叶子
// 会短暂渲染再带原因跳概览，行为可接受且可 e2e 断言。
function warmGate(to) {
  const snap = peekCamp(to.params.campId)
  if (!snap) return true
  const shimCtx = {
    isProject: snap.category === 'project',
    isLearning: snap.category === 'learning',
    capOn: (k) => snap.capabilities?.[k] ?? true,
  }
  return isRouteApplicable(to.name, shimCtx)
    ? true
    : { name: 'camp.overview', params: to.params, query: { blocked: to.name } }
}

// 叶子 meta 简写：campCrumb 让 HomeView 面包屑插入营期对象名（§10.3 动态对象详情）
const leaf = (title) => ({ title, campCrumb: true })

export const campsRoutes = [
  {
    path: '/camps',
    name: 'camps.list',
    component: loadCampSessionList,
    meta: {
      title: '教学周期与营期', domain: 'camps', navGroup: 'camps', navOrder: 10,
      showInMenu: true, icon: 'List', staffOnly: true,
    },
  },
  {
    path: '/camps/attendance-overview',
    name: 'camps.attendance-overview',
    component: loadCampAttendanceBoard,
    meta: {
      title: '跨营考勤总览', domain: 'camps', navGroup: 'camps', navOrder: 20,
      showInMenu: true, icon: 'DataLine', staffOnly: true,
    },
  },
  {
    path: '/camps/templates',
    name: 'camps.templates',
    component: loadPlatformTemplates,
    meta: {
      title: '项目模板', domain: 'camps', navGroup: 'camps', navOrder: 30,
      showInMenu: true, icon: 'SetUp', staffOnly: true,
    },
  },

  // ── 营期工作区（聚合根详情）：父 meta（staffOnly/activeMenu/navGroup）随 to.meta 合并下传 ──
  {
    path: '/camps/:campId',
    component: loadCampWorkspaceShell,
    beforeEnter: warmGate,
    redirect: { name: 'camp.overview' },
    meta: {
      domain: 'camps', navGroup: 'camps', staffOnly: true,
      activeMenu: '/camps', showInMenu: false,
    },
    children: [
      { path: 'overview', name: 'camp.overview', component: loadOverview, meta: leaf('概览') },

      { path: 'people/members', name: 'camp.people.members', component: loadMembers, meta: leaf('成员名单') },
      { path: 'people/applications', name: 'camp.people.applications', component: loadApplications, meta: leaf('加入申请') },
      { path: 'people/staff', name: 'camp.people.staff', component: loadStaff, meta: leaf('负责人与老师') },

      { path: 'operations/courses', name: 'camp.ops.courses', component: loadCourses, meta: leaf('课程') },
      { path: 'operations/attendance', name: 'camp.ops.attendance', component: loadAttendance, meta: leaf('考勤') },
      { path: 'operations/leaves', name: 'camp.ops.leaves', component: loadLeaves, meta: leaf('请假') },
      { path: 'operations/seats', name: 'camp.ops.seats', component: loadSeats, meta: leaf('座位分配') },
      { path: 'operations/rewards', name: 'camp.ops.rewards', component: loadRewards, meta: leaf('奖励') },

      { path: 'learning/mentor-matching', name: 'camp.learning.mentorMatching', component: loadMentorMatching, meta: leaf('导生招募与匹配') },
      { path: 'learning/progress', name: 'camp.learning.progress', component: loadProgress, meta: leaf('学习进度') },

      { path: 'project/applications', name: 'camp.project.applications', component: loadProjectApplications, meta: leaf('项目申报') },
      { path: 'project/formation', name: 'camp.project.formation', component: loadProjectFormation, meta: leaf('项目组队') },
      { path: 'project/deliveries', name: 'camp.project.deliveries', component: loadProjectDeliveries, meta: leaf('交付审核') },
      { path: 'project/archive', name: 'camp.project.archive', component: loadProjectArchive, meta: leaf('成果与归档') },

      { path: 'settings', name: 'camp.settings', component: loadSettings, meta: leaf('营期设置') },
    ],
  },
]

// 旧路径重定向：query/focus 透传；?tab= 深链映射到叶子（兼容期至少一个发布周期）
const TAB_TO_NAME = {
  staff: 'camp.people.staff',
  members: 'camp.people.members',
  courses: 'camp.ops.courses',
  plan: 'camp.ops.attendance',
  seats: 'camp.ops.seats',
  leave: 'camp.ops.leaves',
  reward: 'camp.ops.rewards',
  join: 'camp.people.applications',
  ms: 'camp.learning.mentorMatching',
  progress: 'camp.learning.progress',
  papp: 'camp.project.applications',
  pdeli: 'camp.project.deliveries',
  pform: 'camp.project.formation',
  settings: 'camp.settings',
}

export const campsRedirects = [
  { path: '/camp/sessions', name: 'legacy_camp_sessions', redirect: (to) => ({ path: '/camps', query: { ...to.query } }) },
  { path: '/camp/attendance', name: 'legacy_camp_attendance', redirect: (to) => ({ path: '/camps/attendance-overview', query: { ...to.query } }) },
  { path: '/camp/templates', name: 'legacy_camp_templates', redirect: (to) => ({ path: '/camps/templates', query: { ...to.query } }) },
  {
    // 旧聚合详情页：?tab= 映射到新叶子；未知/缺省 tab → 成员名单（镜像旧行为默认值）
    path: '/camp/sessions/:id',
    name: 'legacy_camp_session_detail',
    redirect: (to) => {
      const { tab, ...rest } = to.query
      return {
        name: TAB_TO_NAME[tab] || 'camp.people.members',
        params: { campId: to.params.id },
        query: rest,
      }
    },
    meta: { staffOnly: true },
  },
]
