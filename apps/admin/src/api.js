import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: false,


});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('bme-admin-token'); // 从 localStorage 获取 token
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`; // 在请求头中添加 token
    }
    return config;
}, error => {
    return Promise.reject(error);
});

// 401 统一处理（对齐用户端 api.js）：清 token + 提示 + 跳登录页
// 此前 admin 遇 401 完全静默，token 失效后各接口各自报错、页面留在原地
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            // 避免多次弹窗
            if (!window.__hasShownLoginExpire) {
                window.__hasShownLoginExpire = true;
                import('element-plus').then(({ ElMessage }) => {
                    ElMessage.error('登录失效，请重新登录');
                });
                localStorage.removeItem('bme-admin-token');
                // 延迟跳转，保证提示能完整显示
                setTimeout(() => {
                    // base 相对：BASE_URL 为 `/admin/` 时跳 /admin/login
                    const loginPath = import.meta.env.BASE_URL + 'login';
                    if (window.location.pathname !== loginPath) {
                        window.location.href = loginPath;
                    }
                    window.__hasShownLoginExpire = false;
                }, 1000);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
