// 会话门面（D1 身份安全地基）：登录态的单一权威源，双模式运行。
//
// cookie 模式（后端 AUTH_REFRESH_COOKIE_ENABLED=true，经 GET /auth/session/config 发现）：
//   access token 仅存内存（刷新页即失，由 bootstrap 恢复）；refresh 走 HttpOnly
//   cookie（bme-{end}-rt，Path 限本端续期端点），跨标签页续期经 Web Locks 互斥，
//   服务端一次性消费是最终保证（并发撞已轮换 cookie → SESSION_REVOKED 终止会话）。
// compat 模式（后端开关关/探测失败/e2e mock 无字段）：沿用 localStorage 双键行为。
//
// 状态机：booting → authenticated | anonymous | unavailable
//   unavailable（网络错/503）不踢登录、保留草稿；booting 期间 getToken() 为 null，
//   守卫必须 await bootstrap() 后再决策（规格 6.5：不误判未登录）。
// 零框架依赖（与 @bme/api 其余导出一致），状态订阅为简单观察者。

const MODE_CACHE_KEY = (clientType) => `bme-${clientType}-auth-mode`
const TERMINAL_MACHINES = new Set([
  'SESSION_REVOKED', 'SESSION_EXPIRED', 'ACCOUNT_MERGED', 'ACCOUNT_DISABLED',
  'TOKEN_SCHEMA_REQUIRED',
])
const LEGACY_KEYS = (tokenKey) => [tokenKey, `${tokenKey}-refresh`]

function readCookie(name) {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : ''
}

export function createSessionFacade({ baseURL, clientType, tokenKey }) {
  const refreshKey = `${tokenKey}-refresh`
  const rtCookie = `bme-${clientType}-rt`
  const csrfCookie = `bme-${clientType}-csrf`
  const refreshUrl = `${baseURL}/auth/${clientType}/refresh`
  const logoutUrl = `${baseURL}/auth/${clientType}/logout`

  let state = 'booting'          // booting | authenticated | anonymous | unavailable
  let mode = null                // 'cookie' | 'compat'
  let accessToken = null         // cookie 模式：仅内存；compat 模式直读 localStorage
  let bootPromise = null
  let refreshing = null          // compat 单飞（cookie 模式走 Web Locks）
  const listeners = new Set()
  const identityHandlers = new Set()

  const setState = (next) => {
    if (state === next) return
    state = next
    listeners.forEach((cb) => { try { cb(state, mode) } catch (e) { /* 订阅者异常不外溢 */ } })
  }

  // ── compat 模式工具（现行为原样搬入）──────────────────────────
  const compatGetToken = () => localStorage.getItem(tokenKey)
  const compatSave = ({ token, refresh_token: rt }) => {
    if (token) localStorage.setItem(tokenKey, token)
    if (rt) localStorage.setItem(refreshKey, rt)
  }
  const clearLegacyStorage = () => LEGACY_KEYS(tokenKey).forEach((k) => localStorage.removeItem(k))

  async function compatRefresh() {
    const rt = localStorage.getItem(refreshKey)
    if (!rt) return null
    refreshing ??= fetch(`${baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${rt}` },
    }).then(async (res) => {
      if (!res.ok) return null
      const data = await res.json()
      if (data.token) localStorage.setItem(tokenKey, data.token)
      if (data.refresh_token) localStorage.setItem(refreshKey, data.refresh_token)
      if (data.role !== undefined || data.permissions !== undefined || data.level !== undefined) {
        identityHandlers.forEach((cb) => cb(data))
      }
      return data.token || null
    }).catch(() => null).finally(() => { refreshing = null })
    return refreshing
  }

  // ── cookie 模式续期 ─────────────────────────────────────────
  async function cookieRefresh() {
    let res
    try {
      res = await fetch(refreshUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-CSRF-Token': readCookie(csrfCookie) },
      })
    } catch (e) {
      setState('unavailable')   // 网络错：不踢登录（规格 6.5）
      throw e
    }
    if (res.status === 503) {
      setState('unavailable')
      throw new Error('service unavailable')
    }
    if (res.status === 401 || res.status === 403) {
      terminate('SESSION_REVOKED')  // cookie 失效/被撤：终态（此刻才清 legacy 键）
      return null
    }
    if (!res.ok) {
      setState('unavailable')
      throw new Error(`refresh ${res.status}`)
    }
    const data = await res.json()
    if (!data.token) {
      terminate('SESSION_REVOKED')
      return null
    }
    accessToken = data.token
    setState('authenticated')
    if (data.role !== undefined || data.permissions !== undefined || data.level !== undefined) {
      identityHandlers.forEach((cb) => cb(data))
    }
    return accessToken
  }

  async function ensureFresh() {
    if (mode === 'compat') return compatRefresh()
    // cookie 模式：Web Locks 跨标签页互斥——持锁者轮换直到新 cookie 安装完才释放；
    // 等待 >10s 未获锁则接管自试一次（锁期限与接管规则，规格 6.2）。
    if (typeof navigator !== 'undefined' && navigator.locks) {
      try {
        return await navigator.locks.request(
          `bme-auth-${clientType}-refresh`,
          { signal: AbortSignal.timeout(10000) },
          () => cookieRefresh(),
        )
      } catch (e) {
        if (e && e.name === 'AbortError') return cookieRefresh()  // 锁超时接管
        throw e
      }
    }
    return cookieRefresh()  // 无 Web Locks（旧浏览器）：服务端一次性消费兜底
  }

  // ── 模式发现与引导 ──────────────────────────────────────────
  async function probeMode() {
    const cached = sessionStorage.getItem(MODE_CACHE_KEY(clientType))
    if (cached) return cached
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    try {
      const res = await fetch(`${baseURL}/auth/session/config`, { signal: controller.signal })
      const data = res.ok ? await res.json() : {}
      const m = data && data.refresh_cookie_enabled ? 'cookie' : 'compat'
      sessionStorage.setItem(MODE_CACHE_KEY(clientType), m)
      return m
    } catch (e) {
      return 'compat'   // 探测失败（e2e 无后端/mock 无字段）：安全回退
    } finally {
      clearTimeout(timer)
    }
  }

  function bootstrap() {
    bootPromise ??= (async () => {
      mode = await probeMode()
      if (mode === 'cookie') {
        // 尝试用 cookie 恢复会话；401 → anonymous（此刻才清 legacy 键，规格 6.5：
        // 不在迁移第一步先清掉唯一可用证明）
        try {
          const token = await cookieRefresh().catch(() => null)
          if (token) return state
          if (state === 'booting') { clearLegacyStorage(); setState('anonymous') }
        } catch (e) {
          if (state === 'booting') setState('unavailable')
        }
        return state
      }
      // compat：本地有 token 即视为已登录（不探测网络，行为与现版一致）
      if (compatGetToken()) setState('authenticated')
      else setState('anonymous')
      return state
    })()
    return bootPromise
  }

  // ── 对外 API ────────────────────────────────────────────────
  function getToken() {
    if (state === 'authenticated') {
      return mode === 'cookie' ? accessToken : compatGetToken()
    }
    return (mode === 'compat' && compatGetToken()) || null
  }

  function saveLogin(res) {
    const data = res || {}
    if (mode === 'cookie') {
      // refresh 由登录响应 Set-Cookie 安装（请求须 credentials include，由 api 实例保证）
      accessToken = data.token || accessToken
    } else {
      compatSave(data)
    }
    setState('authenticated')
  }

  function markUnauthorized() {  // 兼容旧 onUnauthorized 入口（防重）
    if (state === 'authenticated' || state === 'booting') terminate('SESSION_REVOKED')
  }

  function terminate(machine) {
    accessToken = null
    clearLegacyStorage()
    setState('anonymous')
    return machine
  }

  async function logout() {
    if (mode === 'cookie') {
      try {
        await fetch(logoutUrl, {
          method: 'POST',
          credentials: 'include',
          keepalive: true,
          headers: { 'X-CSRF-Token': readCookie(csrfCookie) },
        })
      } catch (e) { /* fire-and-forget：本地清理不依赖服务端结果 */ }
    } else {
      const token = localStorage.getItem(tokenKey)
      const rt = localStorage.getItem(refreshKey)
      if (token || rt) {
        fetch(`${baseURL}/auth/logout`, {
          method: 'POST', keepalive: true,
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ refresh_token: rt }),
        }).catch(() => {})
      }
    }
    terminate('LOGOUT')
  }

  return {
    bootstrap,
    ensureFresh,
    getToken,
    saveLogin,
    logout,
    terminate,
    markUnauthorized,
    isTerminalMachine: (m) => TERMINAL_MACHINES.has(m),
    get state() { return state },
    get mode() { return mode },
    onChange(cb) { listeners.add(cb); return () => listeners.delete(cb) },
    onIdentity(cb) { identityHandlers.add(cb); return () => identityHandlers.delete(cb) },
  }
}
