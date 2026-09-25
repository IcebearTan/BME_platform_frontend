// 登录/注册与沉浸式编辑器（壳外顶层路由）
import LoginView from '../../views/LoginView.vue'

const loadRegisterView = () => import('../../views/RegisterView.vue')
const loadArticleEditorV2 = () => import('../../components/ArticleEditorV2.vue')

export const authRoutes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
  },
  {
    path: '/register',
    name: 'register',
    component: loadRegisterView,
  },
  {
    path: '/editor',
    name: 'editor',
    component: loadArticleEditorV2,
    meta: { title: '文章编辑', backTo: '/content/articles' },
  },
  {
    path: '/public',
    name: 'public',
    component: loadArticleEditorV2,
    meta: { title: '文章编辑', backTo: '/content/articles' },
  },
]
