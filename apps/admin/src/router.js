import { createRouter, createWebHistory } from 'vue-router';

import HomeView from './views/HomeView.vue'
import { authRoutes } from './router/routes/auth'
import { shellChildren } from './router/manifest'
import store from './store';

const router = createRouter({
    history: createWebHistory("/admin/"),
    routes: [
        {
            path: '/',
            name: 'home',
            component: HomeView,
            children: shellChildren,
        },
        ...authRoutes,
    ]
})

// 登录守卫 + RBAC 路由守卫：
// 无 token 直跳登录页（2026-09-16 加固）——原先依赖接口 401 兜底踢回，
// 退出后直访受保护页会先渲染整壳再闪退；staffOnly 防手输 URL 绕菜单
router.beforeEach((to) => {
    const publicPages = to.path === '/login' || to.path === '/register';
    if (!publicPages && !localStorage.getItem('bme-admin-token')) {
        return { path: '/login' };
    }
    if (to.meta.staffOnly && !store.getters.isStaff) {
        return { name: 'home_default' };
    }
});

// 页面标题随路由 meta 派生（原 32 项路径字面量表删除后此处是唯一出口）
router.afterEach((to) => {
    document.title = to.meta?.title ? `${to.meta.title} · BME 管理系统` : 'BME 管理系统';
});

export default router
