import Vuex from 'vuex';
import VuexPersist from 'vuex-persistedstate';
import { useRouter } from 'vue-router';
import { session } from './api';


export default new Vuex.Store({
    state: {
        user: null,
        token: localStorage.getItem('bme-admin-token') || null,
        isLogin: false,
        isDarkMode: false,
    },
    mutations: {
        setToken(state, token) {
            state.token = token;
        },
        clearToken(state) {
            state.token = null;
        },
        setUser(state, user) {
            state.user = user
        },
        clearUser(state) {
            state.user = null
        },
        setTheme(state, isDarkMode) {
            state.isDarkMode = isDarkMode
        },
        toggleTheme(state) {
            state.isDarkMode = !state.isDarkMode
        }
    },
    actions: {
        // 原 login action 引用了未 import 的 api 且全仓无 dispatch 调用（登录组件直接调 api），已删除
        setUser({ commit }, user) {
            commit('setUser', user)
        },
        logout({ commit }) {
            // 后端吊销 access+refresh（fire-and-forget）+ 本地双清；
            // 只清 user 的话 token 仍在 localStorage，退出后任何页面免密直进
            session.revoke();
            commit('clearUser');
            commit('clearToken');
        }

    },
    getters: {
        isLogin: (state) => !!state.token,
        isDarkMode: (state) => state.isDarkMode,
        // RBAC：role / permissions 随登录响应存于 state.user（两级角色：teacher/mentor 已并入，仅剩 super_admin 登录管理端）
        role: (state) => state.user?.role || '',
        permissions: (state) => state.user?.permissions || [],
        can: (_state, getters) => (perm) => getters.role === 'super_admin' || getters.permissions.includes(perm),
        isStaff: (state) => state.user?.role === 'super_admin',
    },
    plugins: [
        VuexPersist({
            key: 'bme-admin-state',  // 本地存储的键名
            storage: window.localStorage,  // 使用 localStorage，也可以使用 sessionStorage
        })
    ]
});