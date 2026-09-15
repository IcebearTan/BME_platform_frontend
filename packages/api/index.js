import axios from 'axios'

// BME 共享 axios 客户端工厂：统一 baseURL / token 注入 / 可选 401 钩子。
// UI 行为（弹窗文案、跳转目标）由各 app 通过 onUnauthorized 注入；包本身零 UI 框架依赖，
// createUnauthorizedHandler 中的 ElMessage 为动态 import，由消费 app 提供（peerDependency）。
export function createApiClient({ baseURL, tokenKey, onUnauthorized }) {
  const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: false,
  })

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem(tokenKey)
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  })

  if (onUnauthorized) {
    api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          onUnauthorized(error)
        }
        return Promise.reject(error)
      },
    )
  }

  return api
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
