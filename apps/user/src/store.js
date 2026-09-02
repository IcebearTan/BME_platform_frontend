import Vuex from 'vuex';
import VuexPersist from 'vuex-persistedstate';
import { useRouter } from 'vue-router';

// 用户等级（LV1-4 整数，1 为默认）归一：非整数/越界一律回退 1
const normalizeLevel = (value) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 1;
};

export default new Vuex.Store({
    state: {
        user: null,
        token: localStorage.getItem('bme-user-token') || null,
        isLogin: false,
        avatar: null,
        level: 1,
        // 添加打卡状态管理
        checkinInfo: {
            checkedIn: false,
            checkedOut: false,
            checkinTime: null,
            checkinTimestamp: null,
            checkoutTime: null,
            location: null,
            studyDuration: null,
            isOvertime: false
        },
        // 添加主题状态管理
        isDarkMode: false
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
            // 登录响应整体入 store 时顺带提取等级（level 为 LV1-4 整数，1 为默认）
            if (user && user.level != null) state.level = normalizeLevel(user.level)
        },
        setLevel(state, level) {
            state.level = normalizeLevel(level)
        },
        clearUser(state) {
            state.user = null
        },
        setAvatar(state, avatar) {
            state.avatar = avatar
        },
        clearAvatar(state) {
            state.avatar = null
        },
        // 添加打卡状态管理的 mutations
        setCheckinInfo(state, checkinInfo) {
            state.checkinInfo = { ...state.checkinInfo, ...checkinInfo }
        },
        setCheckinStatus(state, { checkedIn, checkedOut }) {
            state.checkinInfo.checkedIn = checkedIn
            state.checkinInfo.checkedOut = checkedOut
        },
        clearCheckinInfo(state) {
            state.checkinInfo = {
                checkedIn: false,
                checkedOut: false,
                checkinTime: null,
                checkinTimestamp: null,
                checkoutTime: null,
                location: null,
                studyDuration: null,
                isOvertime: false
            }
        },
        // 添加主题状态管理的 mutations
        setTheme(state, isDarkMode) {
            state.isDarkMode = isDarkMode
        },
        toggleTheme(state) {
            state.isDarkMode = !state.isDarkMode
        }

    },
    actions: {
        // 原 login action 引用了未 import 的 api 且全仓无 dispatch 调用（登录组件直接调 api），已删除
        setUser({ commit }, user, avatar) {
            commit('setUser', user)
            commit('setAvatar', avatar)
        },
        logout({ commit }) {
            commit('clearUser');
            commit('clearAvatar');
        },

    },
    getters: {
        isLogin: (state) => !!state.token,
        // 添加打卡状态的 getters
        checkinInfo: (state) => state.checkinInfo,
        isCurrentlyCheckedIn: (state) => state.checkinInfo.checkedIn && !state.checkinInfo.checkedOut,
        // 添加主题状态的 getters
        isDarkMode: (state) => state.isDarkMode,
        // RBAC：role / permissions 随登录响应存于 state.user
        role: (state) => state.user?.role || 'student',
        permissions: (state) => state.user?.permissions || [],
        // 用户等级 LV1-4（写入时已归一；旧持久化态无该键时回退 1）
        level: (state) => state.level ?? 1,
        can: (_state, getters) => (perm) => getters.role === 'super_admin' || getters.permissions.includes(perm),
    },
    plugins: [
        VuexPersist({
            key: 'bme-user-state',  // 本地存储的键名
            storage: window.localStorage,  // 使用 localStorage，也可以使用 sessionStorage
        })
    ]
});