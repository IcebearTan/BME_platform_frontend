// 版本配置文件
// 这个文件用于统一管理版本号和更新信息

// 当前版本号（会在构建时被 vite.config.js 读取）
export const APP_VERSION = '2.1.3'

// 构建日期（会在构建时自动生成）
export const BUILD_DATE = new Date().toLocaleDateString('zh-CN')

// 更新日期（手动设置）
export const UPDATE_DATE = '2025/9/1'

// 更新公告的唯一标识（基于更新日期和版本号）
export const ANNOUNCEMENT_ID = `20250901-v2.1.3`

// 版本更新日志
export const VERSION_CHANGELOG = {
    '2.1.3': {
        date: '2025/9/1',
        features: [
            ' 修复了登录超时问题',
            ' 新增用户手册页面',
            ' 优化了页面加载速度'
        ],
        importantNotice: '如有问题请及时反馈！'
    }
}

// 获取当前版本的更新信息
export const getCurrentVersionInfo = () => {
    return VERSION_CHANGELOG[APP_VERSION] || {
        date: UPDATE_DATE,
        features: [],
        importantNotice: ''
    }
}

// 获取完整版本信息
export const getVersionInfo = () => {
    return {
        version: APP_VERSION,
        buildDate: BUILD_DATE,
        updateDate: UPDATE_DATE,
        announcementId: ANNOUNCEMENT_ID,
        changelog: getCurrentVersionInfo()
    }
}
