// 版本配置文件
// 这个文件用于统一管理版本号和更新信息

// 当前版本号（会在构建时被 vite.config.js 读取）
export const APP_VERSION = '3.2.2'

// 构建日期（会在构建时自动生成）
export const BUILD_DATE = new Date().toLocaleDateString('zh-CN')

// 更新日期（手动设置）
export const UPDATE_DATE = '2026/9/20'

// 更新公告的唯一标识（基于更新日期和版本号）
export const ANNOUNCEMENT_ID = `20260920-v3.2.2`

// 版本更新日志
export const VERSION_CHANGELOG = {
    '3.2.2': {
        date: '2026/9/20',
        features: [
            '社区广场重设计：公告、精选、话题标签、项目关联与精华内容分层展示',
            '新增学习资源中心：支持平台资料浏览、管理与短签下载',
            '营期老师工作台升级：报名审批、成员管理、全营考勤、学习进度与组会总览集中处理',
            '组会任务支持截止时间、必交设置、迟交策略与审阅通过/退回状态',
            '官方富文本推文导入：管理端 Jodit 排版、图片转存与安全清洗，用户端保持一致展示',
            '通知中心与站内导航优化，支持通知分类、深链直达与跨营课程准确归属'
        ],
        importantNotice: '本次升级保持账号与历史数据不变；官方富文本导入仅限管理端使用，如遇内容显示或资源下载异常请及时反馈。'
    },
    '3.2.1': {
        date: '2026/9/16',
        features: [
            '登录安全加固：令牌自动静默续期，登录状态更安全可靠',
            '全站搜索上线第一步：主导航新增搜索框，支持搜索用户',
            '营期申请批量审批：待审学员可多选通过，导生申请一键通过',
            '营期详情新增「学习进度」看板：按导生团队查看章节认证进度',
            'XLab 全新黑白视觉：导航、弹窗与项目档案页改版',
            '项目详情页展示收藏数'
        ],
        importantNotice: '本次升级包含登录安全加固，所有用户需重新登录一次；账号与历史数据均保持不变。'
    },
    '3.2.0': {
        date: '2026/9/15',
        features: [
            '营期系统全面重构：状态流转 + 侧栏选营工作台',
            '方向制学习：课程方向绑定、按章认证、进度看板',
            '全新「项目营」：申报、组队、里程碑交付、双轨审核',
            'XLab 项目广场：成果一键分享、筛选收藏、项目讨论区',
            '感谢信上线：向帮助过你的同学致谢',
            '通知中心改版：邮箱式分栏、全新分类、邮件通知开关',
            'AI 每日分享：「资讯君」每天自动精选撰写前沿分享',
            '社团组织架构页 + 干事任命体系，发言带职位徽章',
            '考勤升级：三种模式、周考勤看板、数据导出',
            '首页轮播状态化：主推营报名状态直达工作台',
            '注册成功即自动登录；修复同秒重复打卡',
            '首屏大幅提速：按需加载、懒加载、加载态规范化',
            '头像/勋章/轮播迁统一对象存储，头像自动 WebP'
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
