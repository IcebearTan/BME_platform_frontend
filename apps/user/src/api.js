import { createApiClient, createUnauthorizedHandler, createSession } from '@bme/api'

export const API_URL = import.meta.env.VITE_API_BASE_URL

const TOKEN_KEY = 'bme-user-token'

const api = createApiClient({
    baseURL: API_URL,
    tokenKey: TOKEN_KEY,
    onUnauthorized: createUnauthorizedHandler({ tokenKey: TOKEN_KEY }),
});

// 会话（token 对）存管 + 退出吊销：登录/注册组件 save，MenuComponent 退出时 revoke
export const session = createSession({ baseURL: API_URL, tokenKey: TOKEN_KEY });

export default api;
