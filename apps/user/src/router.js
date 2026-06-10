import { createRouter, createWebHistory } from 'vue-router';

import CourseDetailsComponent from './components/Course/CourseDetailsComponent.vue'
import CoursesComponent from './components/Course/CoursesComponent.vue'
import ExamListComponent from './components/ExamListComponent.vue'

import HomeView from './views/HomeView.vue'
import ProfileView from './views/ProfileView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import ArticleView from './views/ArticleView.vue';
import StudyView from './views/StudyView.vue'
import ExamView from './views/ExamView.vue'
import UserIndex from './views/UserIndex.vue';
import UserCenter from './views/UserCenter.vue';
import UserInfoComponent from './components/User/UserInfoComponent.vue';

import AboutUsView from './views/AboutUsView.vue'
import FindPasswordView from './views/FindPasswordView.vue'
import MedalWallComponent from './components/User/MedalWallComponent.vue';

import MedalView from './views/MedalView.vue';
import NotificationView from './views/NotificationView.vue';
import GroupView from './views/GroupView.vue';
import ExerciseSolveView from './views/ExerciseSolveView.vue';
import CourseChapterView from './views/CourseChapterView.vue';
import QuestionBankView from './views/QuestionBankView.vue';
import ServiceHallView from './views/ServiceHallView.vue';
import ThreeDPrintView from './views/ThreeDPrintView.vue';
import CommunityView from './views/CommunityView.vue';
import MyFeedbacksComponent from './components/User/MyFeedbacksComponent.vue';

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior() {
        return { top: 0 }
    },
    routes: [
        // ── 公开路由（无需登录）──
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
            path: '/find_password',
            name: 'find_password',
            component: FindPasswordView,
        },
        {
            path: '/about',
            name: 'about',
            component: AboutUsView,
        },

        // ── 需要登录的路由 ──
        {
            path: '/',
            name: 'profile',
            component: ProfileView,
            meta: { requiresAuth: true }
        },
        {
            path: '/home',
            name: 'home',
            component: HomeView,
            meta: { requiresAuth: true }
        },
        {
            path: '/user',
            name: 'user',
            component: UserIndex,
            meta: { requiresAuth: true }
        },
        {
            path: '/user-center',
            name: 'user-center',
            component: UserCenter,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '/user-center/user-info',
                    name: 'user-info',
                    component: UserInfoComponent,
                },
                {
                    path: '/user-center/my-feedbacks',
                    name: 'my-feedbacks',
                    component: MyFeedbacksComponent,
                }
            ]
        },
        {
            path: '/article',
            name: 'article',
            component: ArticleView,
            meta: { requiresAuth: true }
        },
        {
            path: '/study',
            name: 'study',
            component: StudyView,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '/study/details',
                    name: 'study_details',
                    component: CourseDetailsComponent,
                },
                {
                    path: '',
                    name: 'study_default',
                    component: CoursesComponent,
                }
            ]
        },
        {
            path: '/exam',
            name: 'exam',
            component: ExamView,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '/exam/details',
                    name: 'exam/details',
                    component: ExamListComponent,
                },
                {
                    path: '',
                    name: 'exma_list',
                    component: ExamListComponent,
                }
            ]
        },
        {
            path: '/discuss',
            name: 'discuss',
            component: CourseDetailsComponent,
            meta: { requiresAuth: true }
        },
        {
            path: '/medal',
            name: 'medal',
            component: MedalView,
            meta: { requiresAuth: true },
            redirect: '/medal/user-medal',
            children: [
                {
                    path: '/medal/user-medal',
                    name: 'medal-wall',
                    component: MedalWallComponent,
                }
            ]
        },
        {
            path: '/notifications',
            name: 'notifications',
            component: NotificationView,
            meta: { requiresAuth: true }
        },
        {
            path: '/group',
            name: 'group',
            component: GroupView,
            meta: { requiresAuth: true }
        },
        {
            path: '/exercise/:id',
            name: 'exercise-solve',
            component: ExerciseSolveView,
            meta: { requiresAuth: true },
            props: true
        },
        {
            path: '/course/chapter/:courseId',
            name: 'course-chapter',
            component: CourseChapterView,
            meta: { requiresAuth: true },
            props: true
        },
        {
            path: '/question-bank',
            name: 'question-bank',
            component: QuestionBankView,
            meta: { requiresAuth: true }
        },
        {
            path: '/service-hall',
            name: 'service-hall',
            component: ServiceHallView,
            meta: { requiresAuth: true }
        },
        {
            path: '/service/3d-print',
            name: '3d-print',
            component: ThreeDPrintView,
            meta: { requiresAuth: true }
        },
        {
            path: '/community',
            name: 'community',
            component: CommunityView,
            meta: { requiresAuth: true }
        },
    ]
})

router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')

    if (to.meta.requiresAuth && !token) {
        // 未登录，重定向到登录页，并记录原目标以便登录后跳回
        next({ name: 'login', query: { redirect: to.fullPath } })
    } else if (token && (to.name === 'login' || to.name === 'register')) {
        // 已登录用户不允许再访问登录/注册页
        next({ name: 'home' })
    } else {
        next()
    }
})

export default router
