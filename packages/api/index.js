import axios from 'axios'

// BME 共享 axios 客户端工厂：统一 baseURL / token 注入 / 401 静默续期 / 可选 401 钩子。
// UI 行为（弹窗文案、跳转目标）由各 app 通过 onUnauthorized 注入；包本身零 UI 框架依赖，
// createUnauthorizedHandler 中的 ElMessage 为动态 import，由消费 app 提供（peerDependency）。

// access(2h)/refresh(14d) 双令牌：401 时单飞调 /auth/refresh 换新对并重放原请求；
// refresh 也失败才走 onUnauthorized 踢下线。旧后端无 /auth/refresh 时 404 → 同样踢下线，安全降级。
// onRefreshed：续期响应若带身份字段（role/permissions/level，2026-09-17 起）回调给
// 消费 app 同步 store——否则 store 里的 role 只在登录时写一次，后台改身份后旧客户端
// 要到重新登录才生效（降级用户营期页 isStaff 假真）。
export function createApiClient({ baseURL, tokenKey, onUnauthorized, onRefreshed }) {
  const refreshKey = `${tokenKey}-refresh`
  // 运行期可换的引用：main.js 里 api.setOnRefreshed(store 回调)，
  // 避免 api.js ↔ store.js 静态循环依赖（admin 的 store 已反向 import api）
  let identityHandler = onRefreshed || null
  const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: false,
  })

  api.interceptors.request.use((config) => {
    // FormData 上传必须摘掉实例默认的 application/json：axios 1.x 的 transformRequest
    // 见 JSON 头会把 FormData 整体序列化成 JSON（字段变字符串、File 变空对象），
    // 后端 request.form/files 全空——课程资料 402「没有发送课程 ID」、图床 400「缺少
    // 图片文件」皆此因。摘头后交给浏览器带 boundary 自动设置 multipart。
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (typeof config.headers?.delete === 'function') config.headers.delete('Content-Type')
      else if (config.headers) delete config.headers['Content-Type']
    }
    const token = localStorage.getItem(tokenKey)
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  })

  // 单飞刷新：并发 401 只发一次 refresh，其余等同一 Promise
  let refreshing = null
  function refreshAccessToken() {
    const rt = localStorage.getItem(refreshKey)
    if (!rt) return Promise.resolve(null)
    refreshing ??= axios
      .post(`${baseURL}/auth/refresh`, null, {
        headers: { Authorization: `Bearer ${rt}` },
      })
      .then((res) => {
        const { token, refresh_token: newRt, role, permissions, level } = res.data || {}
        if (token) localStorage.setItem(tokenKey, token)
        if (newRt) localStorage.setItem(refreshKey, newRt)
        if (identityHandler && (role !== undefined || permissions !== undefined || level !== undefined)) {
          try {
            identityHandler({ role, permissions, level })
          } catch (e) {
            // 身份同步失败不影响续期本身（token 已落本地，重放继续）
          }
        }
        return token || null
      })
      .catch(() => null)
      .finally(() => {
        refreshing = null
      })
    return refreshing
  }

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status
      const config = error.config
      // /auth/* 自身（登录/刷新）的 401 不重试不续期，直接走失效流程
      const isAuthCall = typeof config?.url === 'string' && config.url.includes('/auth/')
      if (status === 401 && config && !config.__retried && !isAuthCall) {
        const newToken = await refreshAccessToken()
        if (newToken) {
          config.__retried = true // 只重放一次，防循环
          config.headers = { ...config.headers, Authorization: `Bearer ${newToken}` }
          return api(config)
        }
      }
      if (status === 401 && onUnauthorized) {
        onUnauthorized(error)
      }
      return Promise.reject(error)
    },
  )

  // 续期身份回调的运行期挂载（见上 identityHandler 注释）
  api.setOnRefreshed = (fn) => { identityHandler = fn }

  return api
}

// 会话存取 + 退出吊销：token 对的本地存管与 fire-and-forget 登出（后端吊销 access+refresh，
// 失败不阻塞本地清理——本地清了即未登录，后端令牌至多活到自然过期）
export function createSession({ baseURL, tokenKey }) {
  const refreshKey = `${tokenKey}-refresh`
  return {
    save({ token, refresh_token: refreshToken }) {
      if (token) localStorage.setItem(tokenKey, token)
      if (refreshToken) localStorage.setItem(refreshKey, refreshToken)
    },
    clear() {
      localStorage.removeItem(tokenKey)
      localStorage.removeItem(refreshKey)
    },
    revoke() {
      const token = localStorage.getItem(tokenKey)
      const refresh = localStorage.getItem(refreshKey)
      this.clear()
      if (!token && !refresh) return
      // keepalive：页面即将卸载也能送达
      fetch(`${baseURL}/auth/logout`, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ refresh_token: refresh }),
      }).catch(() => {})
    },
  }
}

// 标准 401 处理器（两 app 行为对齐后抽取）：
// 防重弹窗 + 动态 import ElMessage + 清 token + 按 BASE_URL 相对跳转登录页
export function createUnauthorizedHandler({ tokenKey, message = '登录失效，请重新登录' }) {
  return () => {
    // 避免多次弹窗
    if (window.__hasShownLoginExpire) return
    window.__hasShownLoginExpire = true
    import('element-plus').then(({ ElMessage }) => {
      ElMessage.error(message)
    })
    localStorage.removeItem(tokenKey)
    localStorage.removeItem(`${tokenKey}-refresh`)
    // 延迟跳转，保证提示能完整显示
    setTimeout(() => {
      // base 相对：user 的 BASE_URL 为 /AMEII/ 时跳 /AMEII/login；admin 为 /admin/login
      const loginPath = import.meta.env.BASE_URL + 'login'
      if (window.location.pathname !== loginPath) {
        window.location.href = loginPath
      }
      window.__hasShownLoginExpire = false
    }, 1000)
  }
}

// 媒体 URL 前缀拼接工厂：后端图片一律回相对路径（/media/...、过渡期 /data/avatars/...），
// dev 下前端与后端跨域（8081 vs 5001），必须拼 baseURL 才能出图；生产同源则自然还原。
// 与 createApiClient 同源配置，两 app 各自实例化一次（campService 的 assetUrl 即此产物）。
export function createAssetUrl({ baseURL }) {
  const base = (baseURL || '').replace(/\/$/, '')
  return (path) => (path ? base + path : '')
}
