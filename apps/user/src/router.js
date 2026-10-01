import { createRouter, createWebHistory } from 'vue-router';

import { routeProgressStart, routeProgressDone } from './utils/routeProgress';
import { authSession } from './api';

// ── 落地三页保持同步打包（登录前后首屏直达，不做异步分包）：门户 /、主应用 /home、登录页 ──
import HomeView from './views/HomeView.vue'
import ProfileView from './views/ProfileView.vue'
import LoginView from './views/LoginView.vue'

// ── 其余路由组件全部懒加载（route-level code splitting）：
// 页面首访才拉自己的 chunk，TinyMCE/md-editor 重编辑器、课程学习等不再拖累首包。
// 同一组件多处引用共用同一 loader（课程详情在 /study/details 与 /discuss 复用），rollup 归并单 chunk。
const loadCourses = () => import('./components/Course/CoursesComponent.vue')
const loadCourseDetails = () => import('./components/Course/CourseDetailsComponent.vue')
const loadExamList = () => import('./components/ExamListComponent.vue')
const loadUserIndex = () => import('./views/UserIndex.vue')
// 全站搜索（B.2 五域框架，第一步=用户域）
const loadSearchView = () => import('./views/SearchView.vue')
const loadUserCenter = () => import('./views/UserCenter.vue')
const loadUserInfo = () => import('./components/User/UserInfoComponent.vue')
const loadUserSettings = () => import('./components/User/UserSettingsComponent.vue')
const loadMyFeedbacks = () => import('./components/User/MyFeedbacksComponent.vue')
const loadMyFavorites = () => import('./components/User/MyFavoritesComponent.vue')
const loadIdentityCenter = () => import('./components/Identity/IdentityCenter.vue')
const loadMyArticles = () => import('./components/User/MyArticlesComponent.vue')
// 我的书架（courseShelf 收藏课程，2026-09-22）
const loadMyShelf = () => import('./components/User/MyShelfComponent.vue')
const loadMyThreads = () => import('./components/User/MyThreadsComponent.vue')
const loadArticle = () => import('./views/ArticleView.vue')
const loadArticleV2 = () => import('./views/ArticleViewV2.vue')
const loadArticleEditorV2 = () => import('./views/ArticleEditorViewV2.vue')
const loadStudy = () => import('./views/StudyView.vue')
const loadExam = () => import('./views/ExamView.vue')
const loadRegister = () => import('./views/RegisterView.vue')
const loadFindPassword = () => import('./views/FindPasswordView.vue')
const loadAboutUs = () => import('./views/AboutUsView.vue')
// 平台更新日志（v3.3 起）：版本发布说明页，入口在页脚「关于我们」栏
const loadUpdateLog = () => import('./views/UpdateLogView.vue')
const loadMedalView = () => import('./views/MedalView.vue')
const loadMedalWall = () => import('./components/User/MedalWallComponent.vue')
const loadNotifications = () => import('./views/NotificationView.vue')
const loadExercise = () => import('./views/ExerciseSolveView.vue')
const loadCourseChapter = () => import('./views/CourseChapterView.vue')
const loadQuestionBank = () => import('./views/QuestionBankView.vue')
const loadServiceHall = () => import('./views/ServiceHallView.vue')
const loadResourceCenter = () => import('./views/ResourceCenterView.vue')
const loadOrganization = () => import('./views/OrganizationView.vue')
// 内部工作台（feature/work-collab）：面向已开通授权的社团工作人员，入口按 /work/me 探测显隐。
// 工作台 III：独立应用外壳（WorkShell=唯一 chrome 持有者）+ 嵌套子视图，URL 即导航
const loadWorkShell = () => import('./views/WorkShell.vue')
const loadWorkOverview = () => import('./views/WorkOverview.vue')
const loadWorkItem = () => import('./views/WorkItemView.vue')
const loadWorkItemsTable = () => import('./views/WorkItemsTable.vue')
const loadWorkMembers = () => import('./views/WorkMembersView.vue')
const loadWorkBoardComp = () => import('./components/Work/WorkBoard.vue')
const loadWorkSummaryComp = () => import('./components/Work/WorkSummaryBoard.vue')
const loadWorkFilesComp = () => import('./components/Work/WorkFilesIndex.vue')
const loadWorkRecordsComp = () => import('./components/Work/WorkRecordsIndex.vue')
const loadLLMService = () => import('./views/LLMServiceView.vue')
const loadCommunity = () => import('./views/CommunityView.vue')
const loadCommunityThread = () => import('./views/CommunityThreadView.vue')
const loadProjectSquare = () => import('./views/ProjectSquareView.vue')
const loadProjectDetail = () => import('./views/ProjectDetailView.vue')
const loadUiShowcase = () => import('./views/UiShowcaseView.vue')
const loadCampHome = () => import('./views/CampHome.vue')
const loadCamp = () => import('./views/CampView.vue')
const loadCampMarket = () => import('./views/CampMarket.vue')

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior() {
        return { top: 0 }
    },
    routes: [
        // ── UI 组件展示（开发用）──
        {
            path: '/ui-showcase',
            name: 'ui-showcase',
            component: loadUiShowcase
        },

        // ── 营期（学员端，需登录）──
        {
            path: '/camp-home',
            name: 'camp-home',
            component: loadCampHome,
            meta: { requiresAuth: true }
        },
        {
            path: '/camp',
            name: 'camp',
            component: loadCamp,
            meta: { requiresAuth: true }
        },
        {
            // 团购导生市集：营期域内全出血展示型子路由（IA 规范 §1.2 例外条款）
            path: '/camp/:sid/market',
            name: 'camp-market',
            component: loadCampMarket,
            meta: { requiresAuth: true }
        },

        // ── 公开路由（无需登录）──
        {
            path: '/login',
            name: 'login',
            component: LoginView,
            meta: { authPage: true }
        },
        // 开发测试账号面板：仅 dev 构建注册（生产构建路由不存在，页面代码亦不进产物）
        ...(import.meta.env.DEV ? [{
            path: '/dev/accounts',
            name: 'dev-accounts',
            component: () => import('./views/DevAccountsView.vue'),
            meta: { authPage: true }
        }] : []),
        {
            path: '/register',
            name: 'register',
            component: loadRegister,
            meta: { authPage: true }
        },
        {
            path: '/find_password',
            name: 'find_password',
            component: loadFindPassword,
            meta: { authPage: true }
        },
        {
            path: '/about',
            name: 'about',
            component: loadAboutUs,
        },
        {
            // 平台更新日志（v3.3 起）：版本发布说明，公开可读
            path: '/changelog',
            name: 'changelog',
            component: loadUpdateLog,
        },

        // ── 需要登录的路由 ──
        {
            path: '/',
            name: 'profile',
            component: ProfileView,
            meta: { requiresAuth: true }
        },
        {
            path: '/home',
            name: 'home',
            component: HomeView,
            meta: { requiresAuth: true }
        },
        {
            path: '/user',
            name: 'user',
            component: loadUserIndex,
            meta: { requiresAuth: true }
        },
        {
            // 任意用户的公开主页（复用 UserIndex 页面；排行榜/社区点击进入）
            path: '/profile/:id',
            name: 'user-profile',
            component: loadUserIndex,
            meta: { requiresAuth: true }
        },
        {
            // 全站搜索（五域框架，第一步=用户域；主导航搜索框回车进入）
            path: '/search',
            name: 'search',
            component: loadSearchView,
            meta: { requiresAuth: true }
        },
        {
            path: '/user-center',
            name: 'user-center',
            component: loadUserCenter,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '/user-center/user-info',
                    name: 'user-info',
                    component: loadUserInfo,
                },
                {
                    path: '/user-center/settings',
                    name: 'user-settings',
                    component: loadUserSettings,
                },
                {
                    path: '/user-center/my-feedbacks',
                    name: 'my-feedbacks',
                    component: loadMyFeedbacks,
                },
                {
                    path: '/user-center/my-favorites',
                    name: 'my-favorites',
                    component: loadMyFavorites,
                },
                {
                    // 我的书架：courseShelf 收藏的课程列表（学习分组入口在 UserCenterComponent 侧栏）
                    path: '/user-center/my-shelf',
                    name: 'my-shelf',
                    component: loadMyShelf,
                },
                {
                    path: '/user-center/my-articles',
                    name: 'my-articles',
                    component: loadMyArticles,
                },
                {
                    path: '/user-center/my-threads',
                    name: 'my-threads',
                    component: loadMyThreads,
                },
                {
                    // 身份中心（D4）：核验状态/身份核验向导/账号认领（规格 12.1）
                    path: '/user-center/identity',
                    name: 'user-identity',
                    component: loadIdentityCenter,
                }
            ]
        },
        {
            path: '/article',
            name: 'article',
            component: loadArticle,
            meta: { requiresAuth: true }
        },
        {
            // 旧 V1 TinyMCE 编辑入口收口（官方富文本方案 Phase 4）：
            // 停止新增 V1 文章，直访跳 V2 Markdown 编辑器；旧 /article 阅读页保留
            path: '/article-editor',
            name: 'article-editor',
            redirect: '/article-editor-v2',
        },
        {
            path: '/article-editor-v2',
            name: 'article-editor-v2',
            component: loadArticleEditorV2,
            meta: { requiresAuth: true }
        },
        {
            path: '/article-v2',
            name: 'article-v2',
            component: loadArticleV2,
            meta: { requiresAuth: true }
        },
        {
            path: '/ai-service',
            name: 'ai-service',
            component: loadLLMService,
            meta: { requiresAuth: true }
        },
        {
            path: '/study',
            name: 'study',
            component: loadStudy,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '/study/details',
                    name: 'study_details',
                    component: loadCourseDetails,
                },
                {
                    path: '',
                    name: 'study_default',
                    component: loadCourses,
                }
            ]
        },
        {
            path: '/exam',
            name: 'exam',
            component: loadExam,
            meta: { requiresAuth: true },
            children: [
                {
                    path: '/exam/details',
                    name: 'exam/details',
                    component: loadExamList,
                },
                {
                    path: '',
                    name: 'exma_list',
                    component: loadExamList,
                }
            ]
        },
        {
            path: '/discuss',
            name: 'discuss',
            component: loadCourseDetails,
            meta: { requiresAuth: true }
        },
        {
            path: '/medal',
            name: 'medal',
            component: loadMedalView,
            meta: { requiresAuth: true },
            redirect: '/medal/user-medal',
            children: [
                {
                    path: '/medal/user-medal',
                    name: 'medal-wall',
                    component: loadMedalWall,
                }
            ]
        },
        {
            path: '/notifications',
            name: 'notifications',
            component: loadNotifications,
            meta: { requiresAuth: false }
        },
        // /group 已下线（小组功能并入营期），老书签重定向到营期工作台
        { path: '/group', redirect: '/camp' },
        {
            path: '/exercise/:id',
            name: 'exercise-solve',
            component: loadExercise,
            meta: { requiresAuth: true },
            props: true
        },
        {
            path: '/course/chapter/:courseId',
            name: 'course-chapter',
            component: loadCourseChapter,
            meta: { requiresAuth: true },
            props: true
        },
        {
            path: '/question-bank',
            name: 'question-bank',
            component: loadQuestionBank,
            meta: { requiresAuth: true }
        },
        {
            path: '/service-hall',
            name: 'service-hall',
            component: loadServiceHall,
            meta: { requiresAuth: true }
        },
        {
            path: '/resources',
            name: 'resource-center',
            component: loadResourceCenter,
            meta: { requiresAuth: true }
        },
        {
            path: '/organization',
            name: 'organization',
            component: loadOrganization,
            meta: { requiresAuth: true }
        },
        {
            // 内部工作台（feature/work-collab，工作台 III 应用外壳）：嵌套子路由，URL 即导航。
            // 旧 URL 兼容：/work?tab=todo|group|board|summary|files|records → 对应子路径（ws= 透传）
            path: '/work',
            component: loadWorkShell,
            meta: { requiresAuth: true },
            children: [
                {
                    // 概览仪表盘（默认着陆，待办中心）
                    path: '',
                    name: 'work',
                    component: loadWorkOverview,
                    beforeEnter: (to) => {
                        const map = {
                            todo: '/work', group: '/work/items', board: '/work/board',
                            summary: '/work/summary', files: '/work/files', records: '/work/records',
                        }
                        const target = map[to.query.tab]
                        if (!target) return true
                        const query = { ...to.query }
                        delete query.tab
                        // tab=todo 时目标即自身：去掉 tab 后原样停留，避免重定向环
                        return { path: target, query, replace: true }
                    }
                },
                {
                    // 小组事项（表格视图，工作台 III）
                    path: 'items',
                    name: 'work-items',
                    component: loadWorkItemsTable,
                },
                {
                    // 对象看板（X2 通用投影）
                    path: 'board',
                    name: 'work-board',
                    component: loadWorkBoardComp,
                },
                {
                    // 成员看板（全社名录，浏览+检索；与组织页同数据源）
                    path: 'members',
                    name: 'work-members',
                    component: loadWorkMembers,
                },
                {
                    // 子组汇总（X1 摘要层；路由常驻，侧栏项按 subtree 授权显隐）
                    path: 'summary',
                    name: 'work-summary',
                    component: loadWorkSummaryComp,
                },
                {
                    // 工作资料（M4 附件索引）
                    path: 'files',
                    name: 'work-files',
                    component: loadWorkFilesComp,
                },
                {
                    // 工作记录（M5 历史检索）
                    path: 'records',
                    name: 'work-records',
                    component: loadWorkRecordsComp,
                },
                {
                    // 事项详情（话题/任务同构）：通知深链 /work/items/{source_id} 直达
                    path: 'items/:id',
                    name: 'work-item',
                    component: loadWorkItem,
                },
            ]
        },
        {
            path: '/community',
            name: 'community',
            component: loadCommunity,
            meta: { requiresAuth: true }
        },
        {
            // 帖子详情页（09-20 社区迭代）：feed 卡紧凑化，完整互动落独立页
            path: '/community/thread/:id',
            name: 'community-thread',
            component: loadCommunityThread,
            meta: { requiresAuth: true }
        },
        {
            // 项目广场（功能扩展轮 §五）：全站项目展示板块，双来源（营期发布投影+自由分享）
            path: '/projects',
            name: 'project-square',
            component: loadProjectSquare,
            meta: { requiresAuth: true }
        },
        {
            path: '/projects/:id',
            name: 'project-detail',
            component: loadProjectDetail,
            meta: { requiresAuth: true }
        },
    ]
})

router.beforeEach(async (to, from, next) => {
    // 路由顶部进度条：分包 chunk 首载期遮羞（同步导航瞬时完成，进度条一闪而过）
    routeProgressStart()

    // D1 会话门面：cookie 模式下页面刷新即失内存 token，必须先引导（兼容模式
    // 引导幂等且不触网）；booting 期间不得误判未登录（规格 6.5）
    await authSession.bootstrap()
    const token = authSession.getToken()

    if (to.meta.requiresAuth && !token) {
        // 未登录，重定向到登录页，并记录原目标以便登录后跳回
        next({ name: 'login', query: { redirect: to.fullPath } })
    } else if (token && (to.name === 'login' || to.name === 'register')) {
        // 已登录用户不允许再访问登录/注册页
        next({ name: 'home' })
    } else {
        next()
    }
})

router.afterEach(() => {
    routeProgressDone()
    // 导航成功即清自愈标记：下次 chunk 失败仍可刷新一次（防连续失败刷新循环）
    sessionStorage.removeItem('bme-chunk-reloaded')
})

router.onError((error) => {
    routeProgressDone()
    // 分包 chunk 拉取失败（发版后旧 hash 404 / 网络抖动）：整页刷新一次自愈，防白屏死路
    const msg = String(error?.message || '')
    if (/dynamically imported module|error loading dynamically/i.test(msg)
        && !sessionStorage.getItem('bme-chunk-reloaded')) {
        sessionStorage.setItem('bme-chunk-reloaded', '1')
        window.location.reload()
    }
})

export default router
