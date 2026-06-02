# BME 后台管理系统审查报告

> **项目名称：** AMEII -- 卓越工程师训练营后台管理系统  
> **版本：** 0.0.0  
> **审查日期：** 2026-05-19  
> **审查范围：** 架构、代码质量、安全性、性能、样式管理、功能完备性、依赖管理

---

## 目录

1. [架构层面](#一架构层面)
2. [代码质量](#二代码质量)
3. [安全性](#三安全性)
4. [性能](#四性能)
5. [样式管理](#五样式管理)
6. [功能完备性](#六功能完备性)
7. [依赖管理](#七依赖管理)
8. [重构建议优先级总表](#八重构建议优先级总表)

---

## 一、架构层面

### 1.1 零路由守卫，任何页面可直接访问（严重）

**位置：** [src/router.js](../src/router.js)

路由配置中完全没有 `beforeEach` 导航守卫。所有管理后台路由（用户管理、考勤管理、勋章管理等）均可在未登录状态下直接访问。

当前鉴权逻辑仅存在于 [HomeView.vue:80-91](../src/views/HomeView.vue#L80-L91) 的 `created()` 钩子中：

```js
async created() {
    api({
      url: "/user/user_index",
      method: "get",
    }).catch((error) => {
      ElMessage.error('登录失效，请重新登录')
      this.router.push('/login')
    })
}
```

**问题：**
- 直接在浏览器输入 `/user-manage/users` 即可绕过鉴权进入管理页面
- `catch` 中跳转登录页后，页面内容仍可能短暂暴露
- 没有 token 过期检测和主动刷新机制
- 管理后台的鉴权应该比前台更严格，而非更松散

**建议：** 添加全局路由守卫，对所有非 `/login`、`/register` 路由强制鉴权：

```js
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  if (!token && to.path !== '/login' && to.path !== '/register') {
    next('/login')
  } else {
    next()
  }
})
```

---

### 1.2 Options API 与 Composition API 混用（严重）

**位置：** 全项目范围内

两种 API 风格并存，且存在同一文件混用的情况：

| 组件 | API 风格 |
|------|----------|
| [HomeView.vue](../src/views/HomeView.vue) | **两个 `<script>` 块**：Options API + `<script setup>` |
| [DashboardComponent.vue](../src/components/DashboardComponent.vue) | Options API |
| [LoginComponent.vue](../src/components/LoginComponent.vue) | Options API + `this.$router`/`this.$message` |
| [RegisterComponent.vue](../src/components/RegisterComponent.vue) | Options API + `this.registerForm` |
| [ArticleManage.vue](../src/components/ArticleManage.vue) | Options API + `this.$router`/`this.$refs` |
| [EditorView.vue](../src/views/EditorView.vue) | Options API |
| [CreateView.vue](../src/views/CreateView.vue) | Options API |
| [UserManage.vue](../src/components/UserManage.vue) | Composition API (`<script setup>`) |
| [CourseCreate.vue](../src/components/CourseCreate.vue) | Composition API (`<script setup>`) |
| [GroupManage.vue](../src/components/GroupManage.vue) | Composition API (`<script setup>`) |

**最严重的问题** — [HomeView.vue](../src/views/HomeView.vue) 同时包含 `<script>`（Options API）和 `<script setup>`（Composition API）：
- Options API 的 `created()` 钩子调用了 `api` 和 `ElMessage`，但它们只在 `<script setup>` 中 import
- `useStore()` 和 `useRouter()` 在 Options API 的 `data()` 中初始化，这是反模式
- 两个块共享组件实例但状态来源不清晰

**建议：** 统一为 Composition API（`<script setup>`），消除 HomeView 的双 `<script>` 块。

---

### 1.3 Vuex Store 未导入 api（严重）

**位置：** [src/store.js](../src/store.js)

Store 文件中的 `login` action 引用了 `api`，但文件顶部没有 `import api from './api'`：

```js
actions: {
    async login({ commit }, credentials) {
        try {
            const response = await api.post('/login', credentials);  // api 未导入！
            const token = response.data.token;
            commit('setToken', token);
        } catch (error) {
            console.error('Login failed:', error);
        }
    },
}
```

同时，`login` action 与实际登录流程完全不匹配——组件调用的是 `/auth/admin_login`，而 store 里写的是 `/login`。此 action 从未被使用。

另外，`clearToken` mutation 存在但从未在任何 action 中调用，`logout` action 只调用了 `clearUser` 没有清除 token：

```js
logout({ commit }) {
    commit('clearUser');  // 只清除了 user，没清除 token
}
```

**建议：** 修复 import，使 `logout` 同时清除 token 和 user，或重构为无用的 action 直接删除。

---

### 1.4 所有路由同步加载，无代码分割（中等）

**位置：** [src/router.js:1-23](../src/router.js#L1-L23)

所有 16 个组件全部静态 import，没有任何路由懒加载：

```js
import HomeView from './views/HomeView.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'
import DashboardComponent from './components/DashboardComponent.vue'
import UserManage from './components/UserManage.vue'
// ... 16 个同步 import
```

**建议：** 改为动态导入：

```js
const HomeView = () => import('./views/HomeView.vue')
const UserManage = () => import('./components/UserManage.vue')
```

---

### 1.5 路由路径拼写错误（轻微）

**位置：** [src/router.js:69](../src/router.js#L69)

```js
path: '/learningprgress/manage',  // "prgress" 应为 "progress"
name: 'learningprgress_manage',
```

该路径还硬编码在 [HomeView.vue:40](../src/views/HomeView.vue#L40) 和 [HomeView.vue:285](../src/views/HomeView.vue#L285) 中。

**建议：** 修正为 `/learning-progress/manage`，并使用命名路由跳转代替硬编码路径。

---

## 二、代码质量

### 2.1 编辑器组件近乎完整复制（严重）

**位置：** 
- [src/components/EditorComponent.vue](../src/components/EditorComponent.vue)（~1084 行）
- [src/components/EditorCreateComponent.vue](../src/components/EditorCreateComponent.vue)（~1058 行）

两个文件 95% 以上的代码完全相同，包括：
- TinyMCE 的全部 import 和配置
- `setup()` 中的响应式数据、watch、方法
- 模板结构（编辑区 + 预览区分屏布局）
- 样式定义

**唯一区别：**
- `EditorComponent` 有 `Article_Id` prop，根据 ID 加载已有文章
- `EditorCreateComponent` 没有 `Article_Id`，创建新文章
- 高度默认值不同（600 vs 800）

**建议：** 合并为一个 `ArticleEditor.vue` 组件，通过 prop `mode: 'create' | 'edit'` 区分行为。

---

### 2.2 `console.log` 残留（中等）

**位置：** 全项目 81 处，分布在 17 个文件

| 文件 | 数量 |
|------|------|
| [GroupManage.vue](../src/components/GroupManage.vue) | 19 |
| [LearningProgress.vue](../src/components/LearningProgress.vue) | 10 |
| [EditorComponent.vue](../src/components/EditorComponent.vue) | 9 |
| [EditorView.vue](../src/views/EditorView.vue) | 6 |
| [FileUploadComponent.vue](../src/components/FileUploadComponent.vue) | 6 |
| [CreateView.vue](../src/views/CreateView.vue) | 5 |
| [其他 11 个文件](../src) | 26 |

**建议：** 清理所有调试用 `console.log`，保留仅必要的错误日志。配置 Vite 在生产构建时自动移除。

---

### 2.3 大量注释掉的废弃代码（中等）

**位置：** 多个文件

- [UserManage.vue:18-41](../src/components/UserManage.vue#L18-L41) — 注释掉的旧搜索逻辑（后端搜索版本）
- [api.js:2-5](../src/api.js#L2-L5) — 注释掉的历史 API 地址（含公网 IP）
- [EditorComponent.vue:96](../src/components/EditorComponent.vue#L96) — 注释掉的图片上传地址 `http://192.168.3.47:8081/imgUpload`
- [ArticleCreate.vue:7](../src/components/ArticleCreate.vue#L7) — 注释掉的 `EditorComponent` import
- [store.js:3](../src/store.js#L3) — 无用的 `useRouter` import

**建议：** 删除所有注释掉的代码。需要保留历史记录请使用 Git。

---

### 2.4 ArticleCreate.vue 残留无关代码（中等）

**位置：** [src/components/ArticleCreate.vue](../src/components/ArticleCreate.vue)

文件名为"文章创建"，但其中包含大量用户管理相关的残留代码：

```js
const tableLabel = reactive([
    { prop: 'id', label: '文章id', width: '200px' },
    { prop: 'username', label: '文章标题', width: '300px' },  // username 映射到"文章标题"？
    { prop: 'is_admin', label: '创建日期', width: '300px' },  // is_admin 映射到"创建日期"？
]);
```

变量命名与实际用途完全不匹配，明显是从 UserManage 模板复制后未清理。

**建议：** 重写此组件，或确认其真实功能后重新命名和整理。

---

### 2.5 拼写错误（轻微）

| 当前 | 应为 | 位置 |
|------|------|------|
| `attendence` | `attendance` | 组件名、路由名、变量名（贯穿全项目） |
| `handleCancle` | `handleCancel` | [ArticleManage.vue:204](../src/components/ArticleManage.vue#L204)、[ArticleCreate.vue:237](../src/components/ArticleCreate.vue#L237) |
| `learningprgress` | `learning-progress` | [router.js:69](../src/router.js#L69) |
| `appendGruopDialogVisible` | `appendGroupDialogVisible` | [GroupManage.vue:4](../src/components/GroupManage.vue#L4) |
| `configGruopDialogVisible` | `configGroupDialogVisible` | [GroupManage.vue:40](../src/components/GroupManage.vue#L40) |
| `configBuildGroup` | `confirmBuildGroup` | [GroupManage.vue:27](../src/components/GroupManage.vue#L27) |

---

### 2.6 空文档文件（轻微）

以下文件存在但内容为空：

| 文件 | 预期内容 |
|------|----------|
| `EDITOR_MODES.md` | 编辑器模式说明 |
| `FILE_UPLOAD_GUIDE.md` | 文件上传指南 |
| `UPLOAD_TEST_GUIDE.md` | 上传测试指南 |
| `test-article.html` | 测试页面 |
| `test-article.md` | 测试文章 |
| `README.md` | 默认 Vite 模板文本 |

**建议：** 要么填充内容，要么删除空文件。

---

## 三、安全性

### 3.1 内网 IP 硬编码暴露（严重）

**位置：** 
- [src/api.js:7](../src/api.js#L7) — `http://172.25.56.83:8080/api`
- [src/components/AttendenceCodeComponent.vue:165](../src/components/AttendenceCodeComponent.vue#L165) — `http://172.25.56.83:8080/scan?code=...`

此外 [api.js:2-5](../src/api.js#L2-L5) 还保留了大量注释掉的历史 IP：

```js
// const API_URL = 'http://110.41.177.107:8000';     // 公网 IP
// const API_URL = 'http://139.159.157.5:5000';      // 公网 IP
// const API_URL = 'http://127.0.0.1:5000';          // 本地地址
```

**影响：** 
- 管理后台代码一旦泄露，内网拓扑信息直接暴露
- 公网 IP 注释增加了被攻击的风险面
- QR 码中的硬编码 URL 使得部署环境变更时必须修改代码

**建议：** 全部改为环境变量 `VITE_API_BASE_URL`，清理所有历史注释。QR 码 URL 从环境变量动态拼接。

---

### 3.2 MD5 密码哈希（严重）

**位置：** [src/components/RegisterComponent.vue:3](../src/components/RegisterComponent.vue#L3)、[src/components/ArticleCreate.vue:5](../src/components/ArticleCreate.vue#L5)

```js
import { md5 } from 'js-md5';
```

MD5 在密码学上已被证明不安全：
- 无 salt，易受彩虹表攻击
- 速度快，易被暴力破解
- 管理后台的密码安全应该比前台更严格

**建议：** 确保 HTTPS 传输加密，前端不做哈希（或使用 SHA-256 + salt），密码安全应由后端 bcrypt/scrypt 承担。

---

### 3.3 XSS 风险：v-html 渲染未过滤内容（严重）

**位置：**
- [src/components/EditorComponent.vue:590](../src/components/EditorComponent.vue#L590)
- [src/components/EditorCreateComponent.vue:551](../src/components/EditorCreateComponent.vue#L551)
- [src/components/FileUploadComponent.vue:92](../src/components/FileUploadComponent.vue#L92)

```html
<div v-html="content" class="preview-body"></div>
<div v-html="parsePreview"></div>
```

管理后台的内容来源包括文章编辑和文件导入（HTML/Markdown），均未做 XSS 过滤。管理员账户被 XSS 攻击的影响远大于普通用户。

**建议：** 使用 DOMPurify 对 `v-html` 内容进行过滤后再渲染。

---

### 3.4 Token 存储与清除不一致（中等）

**位置：** [src/store.js](../src/store.js)、[src/api.js:22](../src/api.js#L22)

与前台项目存在相同问题：
1. Axios 拦截器直接读 `localStorage.getItem('token')`
2. Vuex Store 也从 localStorage 初始化 token
3. `logout` action 只清除 user，不清除 token

```js
// store.js - logout 不清除 token
logout({ commit }) {
    commit('clearUser');  // 只有 clearUser，没有 clearToken
}
```

**建议：** 统一为单一来源，`logout` 必须同时清除 token 和 user，并清除 localStorage。

---

### 3.5 管理后台无角色区分（中等）

**位置：** [src/views/HomeView.vue](../src/views/HomeView.vue)

侧边栏菜单对所有登录用户显示完全相同的内容，无角色/权限区分：
- "首页管理" 使用 `disabled` 硬编码禁用，而非基于权限动态控制
- "草稿箱"、"勋章查询" 同样 `disabled` 硬编码
- 所有用户均可访问用户管理、考勤管理等敏感功能

```html
<el-sub-menu index="6" disabled>  <!-- 硬编码禁用，不是权限控制 -->
```

**建议：** 从后端获取用户角色/权限列表，前端根据权限动态渲染菜单和路由。

---

### 3.6 无 CSRF 防护（轻微）

**位置：** [src/api.js:16](../src/api.js#L16)

```js
withCredentials: false,
```

当前使用 Bearer Token 存储在 localStorage，对 XSS 无防护。若后续迁移到 Cookie 方案则需配置 CSRF Token。

---

## 四、性能

### 4.1 仪表盘数据全部硬编码（严重）

**位置：** [src/components/DashboardComponent.vue](../src/components/DashboardComponent.vue)

整个仪表盘页面的所有数据都是前端硬编码的静态值：

```js
stats: [
    { title: '总用户数', value: '2,847', change: '+12.5%', ... },
    { title: '文章数量', value: '1,234', change: '+8.2%', ... },
    { title: '活跃小组', value: '156', change: '+15.3%', ... },
    { title: '勋章发放', value: '892', change: '+23.1%', ... },
],
recentActivities: [ ... ],   // 硬编码的假活动
systemStatus: [ ... ],        // 硬编码的假系统状态
```

图表区域使用 `Math.random()` 生成柱状图高度，每帧重新渲染：
```html
<div class="chart-bar" v-for="i in 7" :key="i" :style="{ height: Math.random() * 100 + 20 + 'px' }"></div>
```

通知徽章也是硬编码：`<el-badge :value="3" />`

**影响：** 仪表盘作为管理后台首页，完全丧失了数据监控和运营洞察功能。

**建议：** 从后端 API 获取真实统计数据，图表接入 ECharts/Chart.js。

---

### 4.2 全量数据前端分页（中等）

**位置：** [src/components/UserManage.vue](../src/components/UserManage.vue)、[src/components/GroupManage.vue](../src/components/GroupManage.vue) 等

所有列表组件采用"全量获取 + 前端切片"的分页策略：

```js
// UserManage.vue - 先获取全部，再前端分页
const allUsers = ref([]);        // 全部数据
const filteredUsers = ref([]);   // 筛选后数据
const currentPage = ref(1);
const pageSize = ref(16);

// 前端切片
const pagedUsers = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredUsers.value.slice(start, start + pageSize.value);
});
```

搜索也完全是前端过滤：

```js
const handleSearch = () => {  // 前端搜索
    filteredUsers.value = allUsers.value.filter(user => { ... });
};
```

**影响：** 当用户量增长后，一次性传输全部数据会导致请求超时、内存占用过高。

**建议：** 改为服务端分页和搜索，传递 `page`、`pageSize`、`keyword` 参数。

---

### 4.3 三个富文本编辑器并存（中等）

**位置：** [package.json](../package.json)

项目安装了三个不同的富文本编辑器：

| 编辑器 | 版本 | 使用位置 |
|--------|------|----------|
| TinyMCE | ^5.10.3（已过时） | EditorComponent、EditorCreateComponent |
| TipTap | ^2.11.5 | 已安装但未发现实际使用 |
| vue-quill | ^1.2.0 | 已安装但未发现实际使用 |

TinyMCE v5 已停止维护，当前版本为 v6/v7。

**建议：** 选择一个编辑器（推荐 TipTap，现代且模块化），移除其他两个。TinyMCE 升级到 v7 或移除。

---

### 4.4 Element Plus 图标可能全量注册（轻微）

与前台项目可能存在相同问题，需要确认 [main.js](../src/main.js) 中的图标注册方式。若使用 `for...of Object.entries(ElementPlusIconsVue)` 循环注册，将引入数百个未使用的图标组件。

---

## 五、样式管理

### 5.1 核心数据

| 指标 | 数值 | 分布 |
|------|------|------|
| `!important` 出现 | **144 次** | 7 个文件 |
| `console.log` 残留 | **81 处** | 17 个文件 |
| 硬编码 IP 地址 | **6 处** | 3 个文件 |
| 内联 IP 地址（注释） | **3 处** | 1 个文件 |

### 5.2 CSS 变量体系已建立但未充分使用（中等）

**位置：** [src/styles/variables.css](../src/styles/variables.css)

值得肯定的是，后台项目已经建立了 CSS 变量体系（前台项目没有），定义了完整的 Design Token：

```css
:root {
    --primary-color: #4f46e5;
    --bg-primary: #ffffff;
    --text-primary: #1f2937;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --radius-md: 8px;
    --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
    /* ... */
}
```

但 [HomeView.vue](../src/views/HomeView.vue) 中仍大量使用 `!important` 覆盖 Element Plus 样式（77 处），说明变量体系尚未覆盖到组件级的样式覆盖场景。

**建议：** 将 Element Plus 的样式覆盖统一收敛到 `element-overrides.css`，使用更高优先级的选择器代替 `!important`。

### 5.3 HomeView 样式过度膨胀（中等）

**位置：** [src/views/HomeView.vue](../src/views/HomeView.vue)

HomeView.vue 的 `<style>` 块有 **560 行**（整个文件 915 行，样式占比 61%），包含：
- 侧边栏全部样式
- 顶部导航栏样式
- 主内容区样式
- 响应式断点样式
- 滚动条样式
- 折叠/展开动画
- Element Plus 菜单覆盖样式

**建议：** 将侧边栏抽离为 `AdminSidebar.vue` 组件，顶部导航栏抽离为 `AdminNavbar.vue` 组件，各自包含自己的样式。

---

## 六、功能完备性

### 6.1 功能完成度评估

| 模块 | 状态 | 说明 |
|------|------|------|
| 登录/注册 | ✅ 可用 | 但存在安全问题（MD5、无守卫） |
| 仪表盘 | ❌ 静态假数据 | 全部硬编码，无真实数据 |
| 用户管理 | ✅ 可用 | 前端分页/搜索，无角色权限 |
| 考勤管理 | ✅ 可用 | 签到码生成 + 记录查询 |
| 文章管理 | ⚠️ 部分可用 | 编辑器可用，草稿箱 `disabled` |
| 小组管理 | ✅ 可用 | 基础 CRUD |
| 课程管理 | ✅ 可用 | 含章节/课时管理 |
| 学习进度 | ✅ 可用 | 前端分页 |
| 首页管理 | ❌ 禁用 | `disabled` 硬编码 |
| 勋章管理 | ⚠️ 部分可用 | 勋章查询 `disabled` |
| 系统设置 | ❌ 占位 | 点击提示"开发中" |
| 通知系统 | ❌ 占位 | 硬编码徽章数字 `3` |
| 个人资料 | ❌ 占位 | 点击提示"开发中" |

### 6.2 管理后台缺失的核心功能

- **操作日志**：管理员操作无审计追踪
- **数据统计**：仪表盘无真实数据，无报表导出
- **权限管理**：无角色区分，所有管理员权限相同
- **系统配置**：系统设置功能未实现
- **通知系统**：通知入口存在但功能为空
- **数据导入/导出**：快速操作中有"数据导入"但未实现（路由 `/data/import` 不存在）

---

## 七、依赖管理

### 7.1 重复/冗余依赖

| 包名 | 版本 | 问题 |
|------|------|------|
| `tinymce` | ^5.10.3 | 严重过时，当前版本 v7；与 @tinymce/tinymce-vue v6 不匹配 |
| `@tiptap/*`（5 个包） | ^2.11.5 | 已安装但未使用 |
| `@vueup/vue-quill` | ^1.2.0 | 已安装但未使用 |
| `js-md5` | ^0.8.3 | 用于密码哈希，安全价值有限 |
| `marked` | ^15.0.12 | 仅在 FileUploadComponent 使用 |
| `turndown` | ^7.2.1 | 仅在 FileUploadComponent 使用 |

**建议：** 移除 TipTap 和 Quill 相关包；TinyMCE 升级到 v7 或迁移到 TipTap。

### 7.2 缺失的开发依赖

| 缺失项 | 说明 |
|--------|------|
| ESLint | 无代码检查 |
| Prettier | 无代码格式化 |
| Vitest / Jest | 无单元测试 |
| Cypress / Playwright | 无 E2E 测试 |
| `.env` 文件 | 无环境变量管理 |

### 7.3 版本号异常

**位置：** [package.json](../package.json)

```json
"version": "0.0.0"
```

项目已投入实际使用，但版本号仍为初始值。

---

## 八、重构建议优先级总表

### P0 — 上线前必须解决

| # | 问题 | 文件 | 建议 |
|---|------|------|------|
| 1 | 零路由守卫 | [router.js](../src/router.js) | 添加全局 `beforeEach` 鉴权守卫 |
| 2 | 内网 IP 泄露 | [api.js](../src/api.js#L7)、[AttendenceCodeComponent.vue](../src/components/AttendenceCodeComponent.vue#L165) | 改为 `VITE_API_BASE_URL` 环境变量 |
| 3 | XSS 风险 | EditorComponent、EditorCreateComponent、FileUploadComponent | 使用 DOMPurify 过滤 `v-html` 内容 |
| 4 | Token 清除不一致 | [store.js](../src/store.js) | `logout` 必须同时清除 token 和 localStorage |
| 5 | Store 未导入 api | [store.js](../src/store.js) | 修复 import 或删除未使用的 action |

### P1 — 重构重点，建议本版本完成

| # | 问题 | 影响范围 | 建议 |
|---|------|----------|------|
| 6 | 仪表盘硬编码假数据 | [DashboardComponent.vue](../src/components/DashboardComponent.vue) | 对接后端统计 API |
| 7 | 编辑器组件复制 | EditorComponent + EditorCreateComponent（~2100 行） | 合并为一个组件 |
| 8 | 统一为 Composition API | HomeView、Dashboard、Login 等 | 消除 Options/Composition 混用 |
| 9 | 服务端分页/搜索 | UserManage、GroupManage 等 | 改为后端分页 |
| 10 | 角色权限控制 | [HomeView.vue](../src/views/HomeView.vue) | 基于权限动态渲染菜单 |
| 11 | 路由懒加载 | [router.js](../src/router.js) | 16 个路由全改为动态 import |
| 12 | 清理三个编辑器依赖 | [package.json](../package.json) | 选一个，移除其他两个 |

### P2 — 建议本版本或下一版本完成

| # | 问题 | 影响范围 | 建议 |
|---|------|----------|------|
| 13 | HomeView 样式/逻辑拆分 | [HomeView.vue](../src/views/HomeView.vue)（915 行） | 抽离侧边栏和导航栏为独立组件 |
| 14 | 减少 `!important` | 7 个文件（144 处） | 统一到 element-overrides.css |
| 15 | 拼写错误修正 | 全项目 | `attendence`→`attendance` 等 |
| 16 | 清理 console.log | 17 个文件（81 处） | 移除调试日志 |
| 17 | 清理注释掉的废弃代码 | 多文件 | 删除，使用 Git 保留历史 |
| 18 | 添加 ESLint/Prettier | 全项目 | 统一代码风格 |
| 19 | 环境变量管理 | 全项目 | 创建 `.env` 文件，移除硬编码配置 |

### P3 — 持续改进

| # | 问题 | 影响范围 | 建议 |
|---|------|----------|------|
| 20 | ArticleCreate 残留代码 | [ArticleCreate.vue](../src/components/ArticleCreate.vue) | 重写或清理 |
| 21 | MD5 密码哈希 | RegisterComponent | 确保使用 HTTPS + 后端安全哈希 |
| 22 | 删除空文档文件 | EDITOR_MODES.md 等 | 填充或删除 |
| 23 | 更新版本号 | package.json | 从 0.0.0 更新为实际版本 |
| 24 | 添加单元测试 | 全项目 | 至少对 API 层、Store 加测试 |
| 25 | 操作审计日志 | 全项目 | 记录管理员关键操作 |
| 26 | TinyMCE 升级 | EditorComponent | 升级到 v7 或迁移到 TipTap |

---

## 附录：项目基础信息

| 项目 | 信息 |
|------|------|
| **框架** | Vue 3.5 + Vite 5.4 |
| **UI 库** | Element Plus 2.8 |
| **状态管理** | Vuex 4（vuex-persistedstate 持久化） |
| **路由** | Vue Router 4（History 模式，base: /admin/） |
| **HTTP** | Axios 1.7 |
| **语言** | JavaScript（无 TypeScript） |
| **CSS** | 纯 CSS + CSS Variables（有设计系统变量定义） |
| **富文本编辑器** | TinyMCE 5 + TipTap 2 + Quill（三选一未决） |
| **测试** | 无 |
| **代码检查** | 无 ESLint/Prettier 配置 |
| **组件数量** | 17 个 Vue 组件 |
| **View 数量** | 5 个页面 |
| **路由数量** | 14 个命名路由（含嵌套子路由） |
| **版本号** | 0.0.0 |
