import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: false, // default


});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token'); // 从 localStorage 获取 token
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`; // 在请求头中添加 token
    }
    return config;
}, error => {
    return Promise.reject(error);
});

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
                localStorage.removeItem('token');
                // 延迟跳转，保证提示能完整显示
                setTimeout(() => {
                    if (window.location.pathname !== '/login') {
                        window.location.href = '/login';
                    }
                    window.__hasShownLoginExpire = false;
                }, 1000);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
