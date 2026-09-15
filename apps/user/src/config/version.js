// 版本配置文件
// 这个文件用于统一管理版本号和更新信息

// 当前版本号（会在构建时被 vite.config.js 读取）
export const APP_VERSION = '3.2.0'

// 构建日期（会在构建时自动生成）
export const BUILD_DATE = new Date().toLocaleDateString('zh-CN')

// 更新日期（手动设置）
export const UPDATE_DATE = '2026/9/15'

// 更新公告的唯一标识（基于更新日期和版本号）
export const ANNOUNCEMENT_ID = `20260915-v3.2.0`

// 版本更新日志
export const VERSION_CHANGELOG = {
    '3.2.0': {
        date: '2026/9/15',
        features: [
            '🚀 营期系统全面重构：状态流转 + 侧栏选营工作台',
            '📚 方向制学习：课程方向绑定、按章认证、进度看板',
            '🚀 全新「项目营」：申报、组队、里程碑交付、双轨审核',
            '📚 XLab 项目广场：成果一键分享、筛选收藏、项目讨论区',
            '📚 感谢信上线：向帮助过你的同学致谢',
            '🔧 通知中心改版：邮箱式分栏、全新分类、邮件通知开关',
            '🌟 AI 每日分享：「资讯君」每天自动精选撰写前沿分享',
            '🔧 社团组织架构页 + 干事任命体系，发言带职位徽章',
            '🔧 考勤升级：三种模式、周考勤看板、数据导出',
            '🌟 首页轮播状态化：主推营报名状态直达工作台',
            '🔧 注册成功即自动登录；修复同秒重复打卡',
            '📊 首屏大幅提速：按需加载、懒加载、加载态规范化',
            '📊 头像/勋章/轮播迁统一对象存储，头像自动 WebP'
        ],
        importantNotice: '升级后账号与历史数据全部保持不变；如遇异常请及时反馈！'
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
