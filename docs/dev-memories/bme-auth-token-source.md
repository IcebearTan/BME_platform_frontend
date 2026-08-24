---
name: bme-auth-token-source
description: "BME_frontend 登录态的真相源是 localStorage 'token'，不是 Vuex store；鉴权类页面靠路由 meta.authPage 隐藏"
metadata: 
  node_type: memory
  type: project
  originSessionId: e3f91290-e208-4e1e-890e-f28a19fa710e
---

BME_frontend 判定登录态的**真相源是 `localStorage.getItem('token')`**（raw `token` key），**不是** Vuex store。判登录态一律用 `!!localStorage.getItem('token')`，**不要**用 `store.getters.isLogin`。

**Why（历史遗留）：** 登录时 `LoginComponent` 直接 `localStorage.setItem('token')`，**没有** `commit('setToken')`；`logout` action 只 clearUser/clearAvatar，**不清** store 的 token，`logOut` 靠 `localStorage.removeItem('token')` + reload。所以 `store.getters.isLogin`（基于 `state.token`）在「非 reload 登录后」会返回 false、在「登出后」可能仍 true（要等 vuex-persistedstate 重新水合才对）。这是双 token 存储（raw `token` + vuex-persistedstate `my-app` key）造成的。全站一致的真相源是 raw `token`：`api.js` 请求拦截器、路由守卫、MenuComponent 都读它。

**How to apply:**
- 登录态判定用 `!!localStorage.getItem('token')`；失效 token 由 `api.js` 全局 401 拦截器兜底（清 token + 跳登录），无需各组件自己 checkLogin。
- 头像：`store.state.avatar` 已被 LoginComponent `commit('setAvatar')` 并持久化，可直接同步读取（computed）。
- 鉴权类页面（登录/注册/找回密码）隐藏头像与登录注册入口：靠路由 `meta: { authPage: true }`，MenuComponent 用 `computed(() => route.meta.authPage)` 判定（已于 2026-07 替换掉旧的 `hideAuthButtons` prop 邪修）。
- 除非彻底重构登录流程（login commit setToken、logout clearToken、统一到 store），否则别引入 `store.getters.isLogin`。

前端仓库与端口分工见 [[bme-local-dev-env]]。
