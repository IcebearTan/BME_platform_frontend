// 登录/注册与沉浸式编辑器（壳外顶层路由）
import LoginView from '../../views/LoginView.vue'

const loadRegisterView = () => import('../../views/RegisterView.vue')
const loadArticleEditorV2 = () => import('../../components/ArticleEditorV2.vue')

// 开发测试账号面板：仅 dev 构建注册（生产构建路由不存在，页面代码亦不进产物）；
// 守卫白名单同步见 router.js beforeEach
const loadDevAccounts = () => import('../../views/DevAccountsView.vue')

export const authRoutes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  ...(import.meta.env.DEV ? [{
    path: '/dev/accounts',
    name: 'dev-accounts',
    component: loadDevAccounts,
  }] : []),
  {
    path: '/register',
    name: 'register',
    component: loadRegisterView,
  },
  {
    path: '/editor',
    name: 'editor',
    component: loadArticleEditorV2,
    meta: { title: '文章编辑', backTo: '/content/articles', staffOnly: true },
  },
  {
    path: '/public',
    name: 'public',
    component: loadArticleEditorV2,
    meta: { title: '文章编辑', backTo: '/content/articles', staffOnly: true },
  },
]
