import { createRouter, createWebHistory } from 'vue-router';

import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import DashboardComponent from './components/DashboardComponent.vue'
import store from './store';
import { routeProgressStart, routeProgressDone } from './utils/routeProgress';

// ── 路由懒加载：布局壳（HomeView）/ 登录 / 默认仪表盘同步打包，其余页面 () => import 分包。
// 页面首访才拉自己的 chunk；同组件多路由共用 loader 归并单 chunk。
const loadRegisterView = () => import('./views/RegisterView.vue')
const loadArticleEditorV2 = () => import('./components/ArticleEditorV2.vue')
const loadUserManage = () => import('./components/UserManage.vue')
const loadOfficerManage = () => import('./components/OfficerManage.vue')
const loadClubGroupManage = () => import('./components/ClubGroupManage.vue')
const loadClubPositionManage = () => import('./components/ClubPositionManage.vue')
const loadClubMembershipManage = () => import('./components/ClubMembershipManage.vue')
const loadGroupManage = () => import('./components/GroupManage.vue')
const loadLearningProgress = () => import('./components/LearningProgress.vue')
const loadMedalManage = () => import('./components/MedalManage.vue')
const loadMedalGrant = () => import('./components/MedalGrant.vue')
const loadCourseManage = () => import('./components/CourseManage.vue')
const loadBannerManage = () => import('./components/BannerManage.vue')
const loadCourseCreate = () => import('./components/CourseCreate.vue')
const loadArticleManage = () => import('./components/ArticleManage.vue')
const loadLLMProjectManage = () => import('./components/LLMProjectManage.vue')
const loadLLMUserMonitor = () => import('./components/LLMUserMonitor.vue')
const loadLLMQuotaRequests = () => import('./components/LLMQuotaRequests.vue')
const loadAuditLogManage = () => import('./components/AuditLogManage.vue')
const loadNotificationManage = () => import('./components/NotificationManage.vue')
const loadSeatManage = () => import('./components/SeatManage.vue')
const loadAttendanceReportManage = () => import('./components/AttendanceReportManage.vue')
const loadCampAttendanceBoard = () => import('./components/CampAttendanceBoard.vue')
const loadCampSessionList = () => import('./components/CampSessionList.vue')
const loadCampSessionDetail = () => import('./components/CampSessionDetail.vue')
const loadPlatformTemplates = () => import('./components/PlatformTemplates.vue')

const router = createRouter({
    history: createWebHistory("/admin/"),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
            children: [
                {
                    path: '/user-manage/users',
                    name: 'user_manage_users',
                    component: loadUserManage
                },
                {
                    path: '/officer/manage',
                    name: 'officer_manage',
                    component: loadOfficerManage
                },
                {
                    path: '/club/groups',
                    name: 'club_groups',
                    component: loadClubGroupManage
                },
                {
                    path: '/club/positions',
                    name: 'club_positions',
                    component: loadClubPositionManage
                },
                {
                    path: '/club/membership',
                    name: 'club_membership',
                    component: loadClubMembershipManage
                },
                {
                    path: '',
                    name: 'home_default',
                    component: DashboardComponent
                },
                {
                    path: '/dashboard',
                    name: 'dashboard',
                    component: DashboardComponent
                },
                {
                    path: '/article/manage',
                    name: 'article_manage',
                    component: loadArticleManage
                },
                {
                    path: '/group/manage', // 修复路径，确保以 '/' 开头
                    name: 'group_manage',
                    component: loadGroupManage
                },
                {
                    path: '/learningprgress/manage',
                    name: 'learningprgress_manage',
                    component: loadLearningProgress
                },
                {
                    path: '/medal/manage',
                    name: 'medal_manage',
                    component: loadMedalManage
                },
                {
                    path: '/medal/grant',
                    name: 'medal_grant',
                    component: loadMedalGrant
                },
                {
                    path: '/course/manage',
                    name: 'course_manage',
                    component: loadCourseManage
                },
                {
                    path: '/course/create',
                    name: 'course_create',
                    component: loadCourseCreate
                },
                {
                    path: '/banner/manage',
                    name: 'banner_manage',
                    component: loadBannerManage
                },
                {
                    path: '/course/edit/:id',
                    name: 'course_edit',
                    component: loadCourseCreate
                },
                {
                    path: '/llm/projects',
                    name: 'llm_projects',
                    component: loadLLMProjectManage
                },
                {
                    path: '/llm/users',
                    name: 'llm_users',
                    component: loadLLMUserMonitor
                },
                {
                    path: '/llm/quota-requests',
                    name: 'llm_quota_requests',
                    component: loadLLMQuotaRequests
                },
                {
                    path: '/audit/logs',
                    name: 'audit_logs',
                    component: loadAuditLogManage
                },
                {
                    path: '/notification/manage',
                    name: 'notification_manage',
                    component: loadNotificationManage
                },
                {
                    path: '/seat/manage',
                    name: 'seat_manage',
                    component: loadSeatManage
                },
                {
                    path: '/attendance-report/manage',
                    name: 'attendance_report_manage',
                    component: loadAttendanceReportManage
                },
                {
                    path: '/camp/attendance',
                    name: 'camp_attendance',
                    component: loadCampAttendanceBoard,
                    meta: { staffOnly: true }
                },
                {
                    path: '/camp/sessions',
                    name: 'camp_sessions',
                    component: loadCampSessionList,
                    meta: { staffOnly: true }
                },
                {
                    path: '/camp/sessions/:id',
                    name: 'camp_session_detail',
                    component: loadCampSessionDetail,
                    meta: { staffOnly: true }
                },
                {
                    path: '/camp/templates',
                    name: 'camp_platform_templates',
                    component: loadPlatformTemplates,
                    meta: { staffOnly: true }
                }
            ]
        },
        {
            path: '/login',
            name: 'login',
            component: LoginView
        },
        {
            path: '/register',
            name: 'register',
            component: loadRegisterView
        },
        {
            path: '/editor',
            name: 'editor',
            component: loadArticleEditorV2,
        },
        {
            path: '/public',
            name: 'public',
            component: loadArticleEditorV2,
        }
    ]
})

// RBAC 路由守卫：staffOnly 路由仅老师/导生/超管可入（防手输 URL 绕菜单）
router.beforeEach((to) => {
    if (to.meta.staffOnly && !store.getters.isStaff) {
        return { name: 'home_default' };
    }
});

export default router
