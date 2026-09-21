// 非营期域页面：组件文件留在 components/，只换路由路径 + meta（单一真相源）。
// 旧路径以 redirect 记录兼容（函数式保留 query/params，focus 等深链参数透传）。
const loadUserManage = () => import('../../components/UserManage.vue')
const loadSeatManage = () => import('../../components/SeatManage.vue')
const loadAttendanceReportManage = () => import('../../components/AttendanceReportManage.vue')
const loadAuditLogManage = () => import('../../components/AuditLogManage.vue')
const loadLLMProjectManage = () => import('../../components/LLMProjectManage.vue')
const loadLLMUserMonitor = () => import('../../components/LLMUserMonitor.vue')
const loadLLMQuotaRequests = () => import('../../components/LLMQuotaRequests.vue')
const loadCourseManage = () => import('../../components/CourseManage.vue')
const loadCourseCreate = () => import('../../components/CourseCreate.vue')
const loadArticleManage = () => import('../../components/ArticleManage.vue')
const loadResourceManage = () => import('../../components/ResourceManage.vue')
const loadBannerManage = () => import('../../components/BannerManage.vue')
const loadNotificationManage = () => import('../../components/NotificationManage.vue')
const loadMedalCenterPage = () => import('../../domains/operations/MedalCenterPage.vue')
const loadDiscussionManage = () => import('../../components/DiscussionManage.vue')
const loadShowcaseManage = () => import('../../components/ShowcaseManage.vue')
const loadGroupManage = () => import('../../components/GroupManage.vue')
const loadLearningProgress = () => import('../../components/LearningProgress.vue')

const keep = (to, target) => ({ ...target, query: { ...to.query } })

export const miscRoutes = [
  // ── 系统与基础设施 ─────────────────────────────────────────────
  {
    path: '/system/accounts',
    name: 'system_accounts',
    component: loadUserManage,
    meta: { title: '账号与权限', domain: 'system', navGroup: 'system', navOrder: 10, showInMenu: true, icon: 'User' },
  },
  {
    path: '/system/facilities/seats',
    name: 'system_seats',
    component: loadSeatManage,
    meta: { title: '物理座位', domain: 'system', navGroup: 'system', navOrder: 20, showInMenu: true, icon: 'Grid' },
  },
  {
    path: '/system/attendance-report',
    name: 'system_attendance_report',
    component: loadAttendanceReportManage,
    meta: { title: '出勤日报订阅', domain: 'system', navGroup: 'system', navOrder: 30, showInMenu: true, icon: 'Tickets' },
  },
  {
    path: '/system/audit-logs',
    name: 'system_audit_logs',
    component: loadAuditLogManage,
    meta: { title: '审计日志', domain: 'system', navGroup: 'system', navOrder: 40, showInMenu: true, icon: 'DataLine' },
  },

  // ── API 平台（原「大模型服务」：菜单/标题先改口径，/llm/* 接口更名属任务 B）──
  {
    path: '/api-platform/projects',
    name: 'api_projects',
    component: loadLLMProjectManage,
    meta: { title: 'API 项目', domain: 'apiPlatform', navGroup: 'apiPlatform', navOrder: 10, showInMenu: true, icon: 'Folder' },
  },
  {
    path: '/api-platform/users',
    name: 'api_users',
    component: loadLLMUserMonitor,
    meta: { title: 'API 用户用量', domain: 'apiPlatform', navGroup: 'apiPlatform', navOrder: 20, showInMenu: true, icon: 'DataLine' },
  },
  {
    path: '/api-platform/quota-requests',
    name: 'api_quota_requests',
    component: loadLLMQuotaRequests,
    meta: { title: 'API 配额审批', domain: 'apiPlatform', navGroup: 'apiPlatform', navOrder: 30, showInMenu: true, icon: 'Key' },
  },

  // ── 教学与内容 ─────────────────────────────────────────────────
  {
    path: '/content/courses',
    name: 'content_courses',
    component: loadCourseManage,
    meta: { title: '课程管理', domain: 'content', navGroup: 'content', navOrder: 10, showInMenu: true, icon: 'Collection' },
  },
  {
    path: '/content/courses/new',
    name: 'content_course_new',
    component: loadCourseCreate,
    meta: { title: '新建课程', domain: 'content', navGroup: 'content', navOrder: 20, showInMenu: false, icon: 'Plus', activeMenu: '/content/courses' },
  },
  {
    path: '/content/courses/:id/edit',
    name: 'content_course_edit',
    component: loadCourseCreate,
    meta: { title: '编辑课程', domain: 'content', navGroup: 'content', navOrder: 30, showInMenu: false, icon: 'Plus', activeMenu: '/content/courses' },
  },
  {
    path: '/content/articles',
    name: 'content_articles',
    component: loadArticleManage,
    meta: { title: '文章管理', domain: 'content', navGroup: 'content', navOrder: 40, showInMenu: true, icon: 'Document' },
  },
  {
    path: '/content/resources',
    name: 'content_resources',
    component: loadResourceManage,
    meta: { title: '平台资料', domain: 'content', navGroup: 'content', navOrder: 50, showInMenu: true, icon: 'FolderOpened' },
  },

  // ── 平台运营 ───────────────────────────────────────────────────
  {
    path: '/operations/home-content',
    name: 'operations_home_content',
    component: loadBannerManage,
    meta: { title: '首页内容', domain: 'operations', navGroup: 'operations', navOrder: 10, showInMenu: true, icon: 'Picture' },
  },
  {
    path: '/operations/notifications',
    name: 'operations_notifications',
    component: loadNotificationManage,
    meta: { title: '通知中心', domain: 'operations', navGroup: 'operations', navOrder: 20, showInMenu: true, icon: 'Bell' },
  },
  {
    path: '/operations/medals',
    name: 'operations_medals',
    component: loadMedalCenterPage,
    meta: { title: '勋章中心', domain: 'operations', navGroup: 'operations', navOrder: 30, showInMenu: true, icon: 'Trophy' },
  },
  {
    path: '/operations/community',
    name: 'operations_community',
    component: loadDiscussionManage,
    meta: { title: '社区治理', domain: 'operations', navGroup: 'operations', navOrder: 40, showInMenu: true, icon: 'ChatDotRound' },
  },
  {
    path: '/operations/showcase',
    name: 'operations_showcase',
    component: loadShowcaseManage,
    meta: { title: '项目广场治理', domain: 'operations', navGroup: 'operations', navOrder: 50, showInMenu: true, icon: 'Grid' },
  },

  // ── 旧小组体系：入口退役（D-02），路由保留兼容直达，不进菜单 ────
  {
    path: '/group/manage',
    name: 'group_manage',
    component: loadGroupManage,
    meta: { title: '小组管理（旧）', domain: 'legacy', showInMenu: false },
  },
  {
    path: '/learningprgress/manage',
    name: 'learning_progress_legacy',
    component: loadLearningProgress,
    meta: { title: '学习进度（旧小组）', domain: 'legacy', showInMenu: false },
  },
]

// 旧路径 → 新路径重定向（兼容期至少一个发布周期，命中量观测后再移除）
export const miscRedirects = [
  { path: '/user-manage/users', name: 'legacy_user_manage', redirect: (to) => keep(to, { path: '/system/accounts' }) },
  { path: '/officer/manage', name: 'legacy_officer_manage', redirect: (to) => keep(to, { name: 'org.officers' }) },
  { path: '/club/groups', name: 'legacy_club_groups', redirect: (to) => keep(to, { name: 'org.groups' }) },
  { path: '/club/positions', name: 'legacy_club_positions', redirect: (to) => keep(to, { name: 'org.positions' }) },
  { path: '/club/membership', name: 'legacy_club_membership', redirect: (to) => keep(to, { name: 'org.memberships' }) },
  { path: '/article/manage', name: 'legacy_article_manage', redirect: (to) => keep(to, { path: '/content/articles' }) },
  { path: '/course/manage', name: 'legacy_course_manage', redirect: (to) => keep(to, { path: '/content/courses' }) },
  { path: '/course/create', name: 'legacy_course_create', redirect: (to) => keep(to, { path: '/content/courses/new' }) },
  {
    path: '/course/edit/:id',
    name: 'legacy_course_edit',
    redirect: (to) => ({ path: `/content/courses/${to.params.id}/edit`, query: { ...to.query } }),
  },
  { path: '/resource/manage', name: 'legacy_resource_manage', redirect: (to) => keep(to, { path: '/content/resources' }) },
  { path: '/discussion/manage', name: 'legacy_discussion_manage', redirect: (to) => keep(to, { path: '/operations/community' }) },
  { path: '/showcase/manage', name: 'legacy_showcase_manage', redirect: (to) => keep(to, { path: '/operations/showcase' }) },
  { path: '/banner/manage', name: 'legacy_banner_manage', redirect: (to) => keep(to, { path: '/operations/home-content' }) },
  { path: '/medal/manage', name: 'legacy_medal_manage', redirect: (to) => keep(to, { path: '/operations/medals' }) },
  {
    path: '/medal/grant',
    name: 'legacy_medal_grant',
    redirect: (to) => ({ path: '/operations/medals', query: { ...to.query, view: 'grants' } }),
  },
  { path: '/notification/manage', name: 'legacy_notification_manage', redirect: (to) => keep(to, { path: '/operations/notifications' }) },
  { path: '/llm/projects', name: 'legacy_llm_projects', redirect: (to) => keep(to, { path: '/api-platform/projects' }) },
  { path: '/llm/users', name: 'legacy_llm_users', redirect: (to) => keep(to, { path: '/api-platform/users' }) },
  { path: '/llm/quota-requests', name: 'legacy_llm_quota', redirect: (to) => keep(to, { path: '/api-platform/quota-requests' }) },
  { path: '/seat/manage', name: 'legacy_seat_manage', redirect: (to) => keep(to, { path: '/system/facilities/seats' }) },
  { path: '/attendance-report/manage', name: 'legacy_attendance_report', redirect: (to) => keep(to, { path: '/system/attendance-report' }) },
  { path: '/audit/logs', name: 'legacy_audit_logs', redirect: (to) => keep(to, { path: '/system/audit-logs' }) },
]
