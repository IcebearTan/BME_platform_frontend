import Vuex from 'vuex';
import VuexPersist from 'vuex-persistedstate';
import { useRouter } from 'vue-router';


export default new Vuex.Store({
    state: {
        user: null,
        token: localStorage.getItem('token') || null,
        isLogin: false,
        avatar: null,
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
        }
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
        isCurrentlyCheckedIn: (state) => state.checkinInfo.checkedIn && !state.checkinInfo.checkedOut
    },
    plugins: [
        VuexPersist({
            key: 'my-app',  // 本地存储的键名
            storage: window.localStorage,  // 使用 localStorage，也可以使用 sessionStorage
        })
    ]
});