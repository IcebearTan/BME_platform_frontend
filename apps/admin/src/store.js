import Vuex from 'vuex';
import VuexPersist from 'vuex-persistedstate';
import { useRouter } from 'vue-router';


export default new Vuex.Store({
    state: {
        user: null,
        token: localStorage.getItem('token') || null,
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
        async login({ commit }, credentials) {
            try {
                const response = await api.post('/login', credentials);
                const token = response.data.token; // 假设 token 在响应中
                commit('setToken', token);
            } catch (error) {
                console.error('Login failed:', error);
            }
        },
        setUser({ commit }, user) {
            commit('setUser', user)
        },
        logout({ commit }) {
            commit('clearUser');
        }

    },
    getters: {
        isLogin: (state) => !!state.token,
        isDarkMode: (state) => state.isDarkMode,
        // RBAC：role / permissions 随登录响应存于 state.user
        role: (state) => state.user?.role || 'student',
        permissions: (state) => state.user?.permissions || [],
        can: (_state, getters) => (perm) => getters.role === 'super_admin' || getters.permissions.includes(perm),
        isStaff: (state) => ['super_admin', 'teacher', 'mentor'].includes(state.user?.role),
    },
    plugins: [
        VuexPersist({
            key: 'my-app',  // 本地存储的键名
            storage: window.localStorage,  // 使用 localStorage，也可以使用 sessionStorage
        })
    ]
});