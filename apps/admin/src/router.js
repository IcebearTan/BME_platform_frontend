import { createRouter, createWebHistory } from 'vue-router';

import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'

import DashboardComponent from './components/DashboardComponent.vue'
import UserManage from './components/UserManage.vue'
import ArticleManage from './components/ArticleManage.vue'
import ArticleCreate from './components/ArticleCreate.vue'
import ArticleEditorV2 from './components/ArticleEditorV2.vue';

import EditorComponent from './components/EditorComponent.vue';
import EditorCreateComponent from './components/EditorCreateComponent.vue';
import GroupManage from './components/GroupManage.vue';
import LearningProgress from './components/LearningProgress.vue';
import MedalManage from './components/MedalManage.vue';
import MedalGrant from './components/MedalGrant.vue';
import CourseManage from './components/CourseManage.vue';
import CourseCreate from './components/CourseCreate.vue';
import LLMProjectManage from './components/LLMProjectManage.vue';
import LLMUserMonitor from './components/LLMUserMonitor.vue';
import LLMQuotaRequests from './components/LLMQuotaRequests.vue';
import AuditLogManage from './components/AuditLogManage.vue';
import NotificationManage from './components/NotificationManage.vue';
import SeatManage from './components/SeatManage.vue';
import AttendanceReportManage from './components/AttendanceReportManage.vue';
import CampAttendanceBoard from './components/CampAttendanceBoard.vue';
import CampSessionList from './components/CampSessionList.vue';
import CampSessionDetail from './components/CampSessionDetail.vue';
import store from './store';

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
                    component: UserManage
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
                    component: ArticleManage
                },
                {
                    path: '/article/create',
                    name: 'article_create',
                    component: ArticleCreate
                },
                {
                    path: '/group/manage', // 修复路径，确保以 '/' 开头
                    name: 'group_manage',
                    component: GroupManage
                },
                {
                    path: '/learningprgress/manage',
                    name: 'learningprgress_manage',
                    component: LearningProgress
                },
                {
                    path: '/medal/manage',
                    name: 'medal_manage',
                    component: MedalManage
                },
                {
                    path: '/medal/grant',
                    name: 'medal_grant',
                    component: MedalGrant
                },
                {
                    path: '/course/manage',
                    name: 'course_manage',
                    component: CourseManage
                },
                {
                    path: '/course/create',
                    name: 'course_create',
                    component: CourseCreate
                },
                {
                    path: '/course/edit/:id',
                    name: 'course_edit',
                    component: CourseCreate
                },
                {
                    path: '/llm/projects',
                    name: 'llm_projects',
                    component: LLMProjectManage
                },
                {
                    path: '/llm/users',
                    name: 'llm_users',
                    component: LLMUserMonitor
                },
                {
                    path: '/llm/quota-requests',
                    name: 'llm_quota_requests',
                    component: LLMQuotaRequests
                },
                {
                    path: '/audit/logs',
                    name: 'audit_logs',
                    component: AuditLogManage
                },
                {
                    path: '/notification/manage',
                    name: 'notification_manage',
                    component: NotificationManage
                },
                {
                    path: '/seat/manage',
                    name: 'seat_manage',
                    component: SeatManage
                },
                {
                    path: '/attendance-report/manage',
                    name: 'attendance_report_manage',
                    component: AttendanceReportManage
                },
                {
                    path: '/camp/attendance',
                    name: 'camp_attendance',
                    component: CampAttendanceBoard,
                    meta: { staffOnly: true }
                },
                {
                    path: '/camp/sessions',
                    name: 'camp_sessions',
                    component: CampSessionList,
                    meta: { staffOnly: true }
                },
                {
                    path: '/camp/sessions/:id',
                    name: 'camp_session_detail',
                    component: CampSessionDetail,
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
            component: RegisterView
        },
        {
            path: '/editor',
            name: 'editor',
            component: ArticleEditorV2,
        },
        {
            path: '/public',
            name: 'public',
            component: ArticleEditorV2,
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
