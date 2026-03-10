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
        {
            path: '/',
            name: 'profile',
            component: ProfileView
        },
        {
            path: '/home',
            name: 'home',
            component: HomeView
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
            path: '/user',
            name: 'user',
            component: UserIndex,
        },
        {
            path: '/about',
            name: 'about',
            component: AboutUsView,
        },
        {
            path: '/find_password',
            name: 'find_password',
            component: FindPasswordView,
        },
        {
            path: '/user-center',
            name: 'user-center',
            component: UserCenter,
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
            component: ArticleView
        },

        {
            path: '/study',
            name: 'study',
            component: StudyView,
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
        },
        {
            path: '/medal',
            name: 'medal',
            component: MedalView,
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
        },
        {
            path: '/group',
            name: 'group',
            component: GroupView,
        },
        {
            path: '/exercise/:id',
            name: 'exercise-solve',
            component: ExerciseSolveView,
            props: true
        },
        {
            path: '/course/chapter/:courseId',
            name: 'course-chapter',
            component: CourseChapterView,
            props: true
        },
        {
            path: '/question-bank',
            name: 'question-bank',
            component: QuestionBankView
        },
        {
            path: '/service-hall',
            name: 'service-hall',
            component: ServiceHallView
        },
        {
            path: '/service/3d-print',
            name: '3d-print',
            component: ThreeDPrintView
        },
        {
            path: '/community',
            name: 'community',
            component: CommunityView
        },
    ]
})

// 全局前置守卫：已登录用户访问首页时跳转到学习中心
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    // 如果访问首页且有token，且是从其他页面导航过来的，则允许访问profile
    if (to.path === '/' && token && from.path && from.path !== '/') {
        next()
    } else if (to.path === '/' && token) {
        // 如果是刷新页面（没有from），则跳转到home
        next('/home')
    } else {
        next()
    }
})

export default router
