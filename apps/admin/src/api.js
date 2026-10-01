import { createApiClient, createAssetUrl, createSessionFacade, createUnauthorizedHandler } from '@bme/api'

export const API_URL = import.meta.env.VITE_API_BASE_URL

const TOKEN_KEY = 'bme-admin-token'

// 会话门面（D1 安全地基）：登录态单一权威源，双模式（cookie/compat 由
// /auth/session/config 探测）。守卫与组件一律经 facade 判定，不再直读 localStorage。
export const authSession = createSessionFacade({
    baseURL: API_URL,
    clientType: 'admin',
    tokenKey: TOKEN_KEY,
})

const api = createApiClient({
    baseURL: API_URL,
    tokenKey: TOKEN_KEY,
    auth: authSession,
    onUnauthorized: createUnauthorizedHandler({ tokenKey: TOKEN_KEY, auth: authSession }),
});

// 媒体 URL 前缀拼接：后端图片回相对路径（/media/...），dev 跨域必须拼 baseURL（与 user 端 campService.assetUrl 同源）
export const assetUrl = createAssetUrl({ baseURL: API_URL });

// F1 过渡兼容层：旧 session API 委托 facade（F2 批次消费方全部迁移后移除）
export const session = {
    save: (res) => authSession.saveLogin(res),
    clear: () => authSession.terminate('CLEAR'),
    revoke: () => authSession.logout(),
};

export default api;
