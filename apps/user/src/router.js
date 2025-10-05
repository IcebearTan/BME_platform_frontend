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

import MyFeedbacksComponent from './components/User/MyFeedbacksComponent.vue';

const router = createRouter({
    history: createWebHistory(),
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
    ]
})

export default router
