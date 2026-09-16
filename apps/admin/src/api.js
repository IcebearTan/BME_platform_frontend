import { createApiClient, createUnauthorizedHandler, createAssetUrl, createSession } from '@bme/api'

export const API_URL = import.meta.env.VITE_API_BASE_URL

const TOKEN_KEY = 'bme-admin-token'

const api = createApiClient({
    baseURL: API_URL,
    tokenKey: TOKEN_KEY,
    onUnauthorized: createUnauthorizedHandler({ tokenKey: TOKEN_KEY }),
});

// 会话（token 对）存管 + 退出吊销：登录组件 save，store.logout 里 revoke
export const session = createSession({ baseURL: API_URL, tokenKey: TOKEN_KEY });

// 媒体 URL 前缀拼接：后端图片回相对路径（/media/...），dev 跨域必须拼 baseURL（与 user 端 campService.assetUrl 同源）
export const assetUrl = createAssetUrl({ baseURL: API_URL });

export default api;
