import { createApiClient, createUnauthorizedHandler } from '@bme/api'

export const API_URL = import.meta.env.VITE_API_BASE_URL

const TOKEN_KEY = 'bme-admin-token'

const api = createApiClient({
    baseURL: API_URL,
    tokenKey: TOKEN_KEY,
    onUnauthorized: createUnauthorizedHandler({ tokenKey: TOKEN_KEY }),
});

export default api;
