# BME 前端项目审查报告

> **项目名称：** AMEII -- 卓越工程师训练营  
> **版本：** 2.1.5  
> **审查日期：** 2026-05-15  
> **审查范围：** 架构、代码质量、安全性、性能、样式管理、功能完备性

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

### 1.1 单一巨型 Vuex Store（严重）

**位置：** [src/store.js](../src/store.js)

整个应用的 Vuex Store 采用完全扁平的结构，没有使用 module 进行拆分。`auth`、`user`、`checkin`、`theme` 四种完全不相关的状态全部耦合在一个 Store 实例中。

```js
// 当前状态：所有内容混在一个文件
state: {
    user: null,          // 用户模块
    token: null,         // 认证模块
    isLogin: false,      // 认证模块
    avatar: null,        // 用户模块
    checkinInfo: { ... }, // 打卡模块
    isDarkMode: false    // 主题模块
}
```

**问题：** 随着新版本功能增加（学习小组、考勤、讨论区等），这个文件会快速膨胀到不可维护。不同团队成员的修改都会冲突。

**建议：** 按功能域拆分为 module：
```
store/
├── index.js
├── modules/
│   ├── auth.js
│   ├── user.js
│   ├── checkin.js
│   └── theme.js
```

---

### 1.2 Mock 系统默认开启、设计意图不清晰（严重）

**位置：** [src/mock/config.js:7](../src/mock/config.js#L7)

```js
export const mockConfig = {
    enabled: true,  // 始终开启
    // ...
}

export const shouldUseMock = () => {
    return import.meta.env.DEV && mockConfig.enabled
}
```

虽然生产 build 时 `import.meta.env.DEV` 为 false 所以不会生效，但：
- 配置文件中 `enabled: true` 作为硬编码默认值，意图不清晰
- 没有在 UI 上标识当前处于 Mock 模式
- `mockApiRequest` 函数在真实 API 失败时还会**自动回退到 mock 数据**，可能导致开发者误以为后端接口正常

**建议：**
- 改用环境变量 `VITE_USE_MOCK=true` 控制
- 在开发模式下，页面顶部增加醒目的 Mock 模式标识
- 移除"API 失败自动回退 mock"逻辑

---

### 1.3 路由全部同步加载，零代码分割（严重）

**位置：** [src/router.js](../src/router.js)

19 个路由全部在文件顶部使用静态 `import` 同步加载，没有任何路由懒加载。

```js
// 当前：所有 view 同步引入
import HomeView from './views/HomeView.vue'
import ProfileView from './views/ProfileView.vue'
import LoginView from './views/LoginView.vue'
// ... 19 个同步 import
```

**影响：** 当前 20 个 view + 60+ 个 component 全量打包进主 bundle，首屏加载体积随功能增长线性增加。

**建议：** 全部改为动态导入：
```js
const HomeView = () => import('./views/HomeView.vue')
const ProfileView = () => import('./views/ProfileView.vue')
```

---

### 1.4 Options API 与 Composition API 混用（中等）

项目中两种 API 风格并存：
- **Options API**：`MenuComponent.vue`、`App.vue`、`LoginView.vue` 等使用 `export default { ... }`
- **Composition API（`<script setup>`）**：`HomeView.vue`、`GroupView.vue`、`UserGreeting.vue` 等

**更严重的是：** [MenuComponent.vue](../src/components/MenuComponent.vue) 同时包含 `<script>`（Options API）和 `<script setup>`（Composition API）两个块，这在 Vue 3 中是反模式——两个块共享同一个组件实例，状态的来源和归属不清晰。

**建议：** 统一为 Composition API（`<script setup>`），这是 Vue 3 的推荐写法，也是生态的未来方向。

---

### 1.5 路径别名形同虚设（轻微）

**位置：** [vite.config.js](../vite.config.js#L16-L19)

Vite 配置了 `@` → `src/` 别名：

```js
resolve: {
    alias: {
        '@': resolve(__dirname, 'src'),
    },
},
```

但全项目所有 import 都使用的**相对路径**（`../../api`、`../components/...`），没有一处使用 `@/` 前缀。

**建议：** 二选一 —— 要么全局替换为 `@/` 别名导入（推荐，便于重构时移动文件），要么删除别名配置。

---

## 二、代码质量

### 2.1 布局逻辑大量重复（严重）

每个 View 各自实现了完全相同的响应式布局逻辑。以下代码在 **HomeView、StudyView、GroupView、ArticleView、CommunityView、ProfileView、ServiceHallView、ThreeDPrintView、UserCenter** 共 10 个文件中重复：

**模板重复（10 次）：**
```html
<el-container class="common-layout">
  <el-header class="header-container">
    <div v-if="!isMobile" class="desktop-menu-container">
      <MenuComponent />
    </div>
    <div v-else class="mobile-header">
      <div class="mobile-logo">
        <img ... @click="router.push('/')" />
      </div>
      <el-icon class="hamburger-icon" @click="toggleMobileMenu">
        <Expand />
      </el-icon>
    </div>
  </el-header>
  <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />
  <el-main> ... </el-main>
  <el-footer class="page-footer">
    <PageFooterComponent />
  </el-footer>
</el-container>
```

**JS 逻辑重复（10 次）：**
```js
const isMobile = ref(window.innerWidth <= 768)
const isMobileMenuOpen = ref(false)
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) isMobileMenuOpen.value = false
}
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}
onMounted(() => {
  checkScreenSize()
  window.addEventListener('resize', checkScreenSize)
})
onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize)
})
```

**建议：** 抽取 `<PageLayout>` 组件，所有 View 通过 slot 插入内容。

---

### 2.2 巨型文件（中等）

| 文件 | 行数 | 问题 |
|------|------|------|
| [GroupView.vue](../src/views/GroupView.vue) | 1541 行 | 承担了列表、详情、路由管理、搜索、创建表单等过多职责 |
| [MenuComponent.vue](../src/components/MenuComponent.vue) | 1173 行 | 导航栏 + 搜索 + 用户信息 + 主题切换全部耦合在一起 |

**建议：**
- `GroupView` 拆分为 `GroupListView` + `GroupDetailView` + `GroupCreateDialog`
- `MenuComponent` 拆分为 `NavBar` + `UserMenu` + `ThemeToggle` + `SearchBox`

---

### 2.3 拼写错误（轻微）

| 当前 | 应为 |
|------|------|
| `Attendence/` 目录 | `Attendance/` |
| `AttenceRankComponent` | `AttendanceRankComponent` |

---

### 2.4 `!important` 滥用

[MenuComponent.vue](../src/components/MenuComponent.vue) 中大量使用 `!important` 来覆盖 Element Plus 的默认样式（超过 30 处）。当多个 `!important` 堆叠时，调试变得极其困难。

**建议：** 统一在 `element-overrides.css` 中用更高优先级的选择器覆盖，而非 `!important`。

---

### 2.5 `console.log` 残留

`GroupView.vue` 中存在大量调试用的 `console.log` 语句，在生产环境中不应出现。

---

## 三、安全性

### 3.1 内网 IP 硬编码暴露（严重）

**位置：** [src/api.js:10](../src/api.js#L10)

```js
export const API_URL = 'http://172.25.56.83:8080/api';
```

此外文件中还保留了大量注释掉的历史 IP 地址，泄露了内网拓扑信息：
```js
// const API_URL = 'http://110.41.177.107:8000';
// export const API_URL = 'http://139.159.157.5:5000';
// export const API_URL = 'http://172.25.56.83:5173/api';
```

**影响：** 一旦前端代码被分享或公开，内网 IP 直接暴露，增加了内网被攻击的风险面。

**建议：** 全部改为环境变量 `VITE_API_BASE_URL`，并清理历史注释。

---

### 3.2 Token 的双重来源不一致（中等）

Token 存在两处，读取路径不一致：

1. **localStorage `token`** —— [api.js:30](../src/api.js#L30) 的请求拦截器直接从这里读
2. **Vuex `state.token`** —— 从 localStorage 初始化但可能不同步

拦截器绕过 Vuex 直接读 localStorage：
```js
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token'); // 绕过 store
    // ...
});
```

同时 Vuex 初始化时也从 localStorage 读取：
```js
state: {
    token: localStorage.getItem('token') || null,
}
```

**问题：** `clearToken` mutation 只清除 Vuex 状态，不清除 localStorage。两个来源可能不一致。

**建议：** 统一为单一来源 —— 要么只用 Vuex（通过 vuex-persistedstate 持久化），要么只用 localStorage。不要两处各读各的。

---

### 3.3 MD5 前端密码哈希（中等）

**位置：** [LoginComponent.vue:145](../src/components/Auth/LoginComponent.vue#L145)

```js
const User_Password = md5(loginForm.value.password)
```

MD5 已被证明在密码学上不安全，且前端哈希不能替代 HTTPS 传输加密。如果传输层已经使用 HTTPS，前端哈希的意义不大；如果传输层没有 HTTPS，MD5 也无法防止中间人攻击。

**建议：** 确保使用 HTTPS 传输，在传输层保护密码安全。前端哈希可以考虑使用更安全的算法（如 SHA-256 + salt），但最佳实践是依靠 HTTPS + 服务端 bcrypt/scrypt。

---

### 3.4 Cookie 安全配置缺失

**位置：** [src/api.js:24](../src/api.js#L24)

```js
withCredentials: false,
```

跨域请求不携带 Cookie，但也没有配置 CSRF Token 机制。当前使用 Bearer Token 方案，Token 存储在 localStorage 中，对 XSS 攻击完全没有防护。

**建议：** 至少要对用户生成内容做 XSS 过滤，并考虑使用 httpOnly Cookie 方案存储敏感 Token。

---

## 四、性能

### 4.1 Element Plus 图标全量注册（严重）

**位置：** [src/main.js:15-17](../src/main.js#L15-L17)

```js
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
}
```

Element Plus 有数百个图标，这行代码将所有图标注册为全局 Vue 组件。每个图标都是一个完整的组件实例，全部注册后：
- 主 bundle 体积显著增加
- 应用启动时需要初始化数百个全局组件
- 实际项目中用到的图标可能不到 20 个

**建议：** 改为按需引入，只注册实际使用的图标。或者使用 `unplugin-icons` 实现 Tree Shaking。

---

### 4.2 勋章图片文件过大（中等）

**位置：** `public/medals/` 目录

22 张勋章 PNG 图片，每张 1-3.6MB，总计约 50MB+。首次访问勋章墙页面时需要下载大量图片。

**建议：** 全部转为 WebP 格式，并使用压缩工具减小体积。目标：每张控制在 50-100KB 以内。

---

### 4.3 无构建产物分析

没有配置 `rollup-plugin-visualizer`，无法分析打包体积分布和识别需要优化的模块。

**建议：** 接入 `rollup-plugin-visualizer`，在每次构建后生成 bundle 分析报告。

---

### 4.4 无虚拟滚动

对于可能有大量数据的列表（课程列表、小组成员列表、讨论区帖子等），没有使用虚拟滚动技术。当列表超过数百条时，DOM 节点数量会导致渲染性能下降。

**建议：** Element Plus 的 `el-table-v2` 或 `vueuc` 的虚拟列表组件。

---

## 五、样式管理

### 5.1 核心数据

| 指标 | 数值 | 分布 |
|------|------|------|
| `.theme-light` / `.theme-dark` 出现 | **335 次** | 27 个文件 |
| `transition: all 0.3s ease` 出现 | **104 次** | 40+ 个文件 |
| `page-footer` 样式分别定义 | **10+ 处** | 10+ 个 View 文件 |
| `header-container` 样式分别定义 | **10+ 处** | 10+ 个 View 文件 |
| `mobile-header` 模板+CSS 重复 | **10+ 次** | 10+ 个 View 文件 |
| `common-layout` 布局重复 | **15+ 处** | 15+ 个 View 文件 |
| `min-height: 100vh` 出现 | **30 次** | 21 个文件 |
| 滚动条样式自定义 | **7 种实现** | 7 个组件 |
| 同时含 scoped + 非 scoped style | **11 个文件** | 各处 |
| `isDarkMode = computed(...)` 声明 | **10+ 次** | 10+ 个组件 |

### 5.2 主题系统：335 处"假 DRY"

每个组件都在用相同的模式重复定义主题样式：

```css
/* 组件 A */
.theme-light .card { background: #ffffff; color: #333333; }
.theme-dark .card { background: #1a1a1a; color: #ffffff; }

/* 组件 B（完全相同的颜色值） */
.theme-light .panel { background: #ffffff; color: #333333; }
.theme-dark .panel { background: #1a1a1a; color: #ffffff; }
```

**根本原因：** 没有 CSS 自定义属性（CSS Variables）体系。所有颜色值都是硬编码的魔法值。

**解决方案：**
```css
/* styles/tokens.css —— 只定义一次 */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f7fa;
  --text-primary: #303133;
  --text-secondary: #6b7280;
  --border-color: rgba(0, 0, 0, 0.06);
  --transition-base: all 0.3s ease;
}

.theme-dark {
  --bg-primary: #1a1a1a;
  --bg-secondary: #1e1e1e;
  --text-primary: #ecf0f1;
  --text-secondary: #a1a1aa;
  --border-color: rgba(255, 255, 255, 0.1);
}

/* 所有组件统一使用变量，不再需要 .theme-light/.theme-dark 分支 */
.card { background: var(--bg-primary); color: var(--text-primary); }
```

### 5.3 页脚样式：10 种不一致的实现

同一个 `.page-footer`，在不同文件中使用了不同的覆盖方式：

| 文件 | 实现方式 |
|------|----------|
| HomeView | 非 scoped `<style>` 中定义 |
| LoginView | scoped 中 + `:deep(.el-footer)` |
| RegisterView | 同上 |
| FindPasswordView | 同上，但高度值不同 |
| StudyView | 非 scoped，滚动条样式也混在一起 |
| ServiceHallView | `:deep(.page-footer)` |
| ThreeDPrintView | `:deep(.page-footer)` |
| MedalView | 完全独立定义 |
| QuestionBankView | 完全独立定义 |
| ProfileView | 完全独立定义 |

而 `PageFooterComponent` 已经是独立组件了，这些外部的样式覆盖本应全部收敛到组件内部。

### 5.4 背景装饰：逐字复制 200+ 行 CSS

[LoginView.vue](../src/views/LoginView.vue)、[RegisterView.vue](../src/views/RegisterView.vue)、[FindPasswordView.vue](../src/views/FindPasswordView.vue) 三个认证页面中，以下内容**完全从同一个源复制粘贴**：

- `.bg-decorations` 容器结构（background-decoration）
- `.bg-circle`、`.bg-circle-1` ~ `.bg-circle-4` 的样式定义
- `.theme-light` / `.theme-dark` 颜色变体
- `@keyframes float`、`@keyframes pulse` 动画
- 移动端响应式适配

另一个 View [ProfileView.vue](../src/views/ProfileView.vue) 使用了类似但不相同的 `.background-decoration` 方案（10 个圆圈 vs 4 个）。

**浪费估算：** 约 200 行 CSS × 3 处重复 = 600 行冗余代码。

### 5.5 滚动条样式：7 种互不兼容的实现

| 文件 | 选择器 |
|------|--------|
| StudyView | `::-webkit-scrollbar`（全局级别） |
| CourseChapterView | `.catalog-list::-webkit-scrollbar` |
| ExerciseCodePanel | `.output-container::-webkit-scrollbar, .test-container::-webkit-scrollbar` |
| ExerciseDescriptionPanel | `.panel-content::-webkit-scrollbar` |
| GroupSettings | `.settings-content::-webkit-scrollbar` |
| GroupSidebar | `.group-sidebar::-webkit-scrollbar` |
| TaskSubmission | `.submission-content::-webkit-scrollbar` |

每个实现都包含相同的轨道样式、滑块样式、hover 效果和主题适配，但使用不同的 CSS 选择器。

### 5.6 全局样式泄漏：11 个文件混用 scoped + 非 scoped

以下文件同时包含 `<style scoped>` 和 `<style>` 两个块：

| 文件 |
|------|
| App.vue |
| MenuComponent.vue |
| HomeView.vue |
| StudyView.vue |
| ArticleView.vue |
| MedalView.vue |
| UserCenter.vue |
| GroupSettings.vue |
| MenuPlainComponent.vue |
| UpdateAnnouncement.vue |
| AvatarUploadComponent.vue |

**问题：** 非 scoped 的样式会影响全局。当 `.page-footer` 样式出问题时，无法从组件树判断样式来自哪个文件的非 scoped 块。调试时需要在 11 个文件中逐个排查。

### 5.7 建议的 CSS 架构

```
src/
├── styles/
│   ├── tokens.css            ← CSS 自定义属性（颜色、间距、圆角、阴影、过渡）
│   ├── theme.css             ← .theme-light / .theme-dark 只在这定义变量值
│   ├── global.css            ← 全局 reset + 滚动条美化 + 基础排版
│   └── element-overrides.css ← 统一覆盖 Element Plus 默认样式
├── components/
│   └── layout/
│       ├── PageLayout.vue    ← 所有 View 共享的 header+footer 布局
│       └── AuthLayout.vue    ← 登录/注册/找回密码专用（含背景装饰）
```

---

## 六、功能完备性

### 6.1 学习小组模块大量未完成（高优先级，上线 Blocker）

**位置：** [src/views/GroupView.vue](../src/views/GroupView.vue) 及 Group 子组件

前端 UI 架子已搭建完毕，但后端 API 对接全部悬空。共有 **27 处 TODO** 标记：

**课程管理：**
- `TODO: 实现课程编辑功能` — [GroupView.vue:342](../src/views/GroupView.vue#L342)
- `TODO: 实现新建课程功能` — [GroupView.vue:347](../src/views/GroupView.vue#L347)

**成员管理：**
- `TODO: 实现添加成员逻辑` — [GroupView.vue:453](../src/views/GroupView.vue#L453)
- `TODO: 实现编辑成员逻辑` — [GroupView.vue:458](../src/views/GroupView.vue#L458)
- `TODO: 实现移除成员逻辑` — [GroupView.vue:462](../src/views/GroupView.vue#L462)
- `TODO: 实现角色更改逻辑` — [GroupView.vue:467](../src/views/GroupView.vue#L467)
- `TODO: 实现 view details` — [GroupMembers.vue:403](../src/components/Group/GroupMembers.vue#L403)

**公告管理：**
- `TODO: 实现公告创建逻辑` — [GroupView.vue:504](../src/views/GroupView.vue#L504)
- `TODO: 实现公告编辑逻辑` — [GroupView.vue:509](../src/views/GroupView.vue#L509)
- `TODO: 实现公告删除逻辑` — [GroupView.vue:514](../src/views/GroupView.vue#L514)
- `TODO: Display statistics` — [GroupAnnouncements.vue:602](../src/components/Group/GroupAnnouncements.vue#L602)
- `TODO: Implement file download` — [GroupAnnouncements.vue:660](../src/components/Group/GroupAnnouncements.vue#L660)

**任务管理：**
- `TODO: 实现任务创建逻辑` — [GroupView.vue:520](../src/views/GroupView.vue#L520)
- `TODO: 实现任务编辑逻辑` — [GroupView.vue:525](../src/views/GroupView.vue#L525)
- `TODO: 实现任务删除逻辑` — [GroupView.vue:530](../src/views/GroupView.vue#L530)
- `TODO: 实现任务提交逻辑` — [GroupView.vue:535](../src/views/GroupView.vue#L535)
- `TODO: Implement submission detail view` — [TaskManagement.vue:671](../src/components/Group/TaskManagement.vue#L671)
- `TODO: Implement file preview` — [TaskManagement.vue:789](../src/components/Group/TaskManagement.vue#L789)
- `TODO: Refresh task data / update stats` — [GroupTasks.vue:829](../src/components/Group/GroupTasks.vue#L829)
- `TODO: Implement batch download` — [GroupTasks.vue:835](../src/components/Group/GroupTasks.vue#L835)
- `TODO: Implement export statistics` — [GroupTasks.vue:841](../src/components/Group/GroupTasks.vue#L841)

**活动管理：**
- `TODO: 实现活动详情查看逻辑` — [GroupView.vue:541](../src/views/GroupView.vue#L541)
- `TODO: 实现活动列表刷新逻辑` — [GroupView.vue:546](../src/views/GroupView.vue#L546)

**小组状态管理：**
- `TODO: 调用API更新后端状态` — [GroupView.vue:590](../src/views/GroupView.vue#L590)
- `TODO: 调用API删除小组` — [GroupView.vue:600](../src/views/GroupView.vue#L600)
- `TODO: 从列表中移除已删除的小组` — [GroupView.vue:601](../src/views/GroupView.vue#L601)

**考勤：**
- `TODO: 调用API保存考勤设置到后端` — [GroupView.vue:626](../src/views/GroupView.vue#L626)

### 6.2 路由守卫不完整

**位置：** [src/router.js:196-207](../src/router.js#L196-L207)

全局前置守卫逻辑非常简单，只处理了首页 `/` 的跳转判断：

```js
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    if (to.path === '/' && token && from.path && from.path !== '/') {
        next()
    } else if (to.path === '/' && token) {
        next('/home')
    } else {
        next()
    }
})
```

**问题：**
- 没有对需要登录的页面做统一的鉴权重定向
- 鉴权逻辑分散在各组件的 `onMounted` 中各自实现
- 有些组件（如 MenuComponent）自己用 `checkLogin()` 判断登录状态，方式不统一

### 6.3 无单元测试

项目中未发现任何测试框架配置或测试文件（vitest、jest、cypress 等均不存在）。

---

## 七、依赖管理

### 7.1 未使用的依赖

| 包名 | 安装版本 | 实际情况 |
|------|----------|----------|
| `gsap` | ^3.12.7 | 已安装，但代码中基本只使用了 CSS animation/transition |
| `vue-persistedstate` | ^1.2.5 | 已安装，但实际使用的是 `vuex-persistedstate` |
| `js-md5` | ^0.8.3 | 用于前端密码哈希，安全价值有限（见 3.3） |

**建议：** 移除 `gsap` 和 `vue-persistedstate`，减少 `node_modules` 体积和潜在安全漏洞面。

### 7.2 两个构建输出目录

项目根存在 `dist/` 和 `dist_frontend/` 两个构建输出目录，暗示部署配置可能混乱或曾有过实验性配置。

---

## 八、重构建议优先级总表

### P0 — 上线前必须解决

| # | 问题 | 文件 | 建议 |
|---|------|------|------|
| 1 | 内网 IP 泄露 | [api.js](../src/api.js#L10) | 改为 `VITE_API_BASE_URL` 环境变量 |
| 2 | Mock 配置默认开启 | [mock/config.js](../src/mock/config.js#L7) | 环境变量控制，UI 增加标识 |
| 3 | 小组模块 27 处 TODO | [GroupView.vue](../src/views/GroupView.vue) 等 | 对接后端 API |

### P1 — 重构重点，建议本版本完成

| # | 问题 | 影响范围 | 建议 |
|---|------|----------|------|
| 4 | 抽取 `<PageLayout>` 布局 | 10+ View 文件 | 消除模板+JS+CSS 三重重复 |
| 5 | 建立 CSS 变量体系 | 全项目 | 消除 335 处主题样式重复 |
| 6 | 图标按需引入 | [main.js](../src/main.js#L15-L17) | 减少打包体积 |
| 7 | 路由懒加载 | [router.js](../src/router.js) | 19 个路由全改为动态 import |
| 8 | 全局滚动条样式 | 7 个组件 | 统一到 `global.css` |

### P2 — 建议本版本或下一版本完成

| # | 问题 | 影响范围 | 建议 |
|---|------|----------|------|
| 9 | Vuex Store 模块化 | [store.js](../src/store.js) | 拆分为 4 个 module |
| 10 | 统一为 Composition API | `MenuComponent` 等 | 消除 Options/Composition 混用 |
| 11 | 统一 API 调用路径 | 多处 | 所有 import 改为 `@/` 别名 |
| 12 | Token 来源统一 | [api.js](../src/api.js#L30) + [store.js](../src/store.js#L9) | 单一来源原则 |
| 13 | 勋章图片优化 | `public/medals/` | 转 WebP，压缩 |
| 14 | 配置构建产物分析 | `vite.config.js` | 接入 visualizer |

### P3 — 持续改进

| # | 问题 | 影响范围 | 建议 |
|---|------|----------|------|
| 15 | 拼写错误修正 | `Attendence/` | 重命名为 `Attendance/` |
| 16 | 清理废弃依赖 | `package.json` | 移除 `gsap`、`vue-persistedstate` |
| 17 | 添加单元测试 | 全项目 | 至少对 API 层、Store 加测试 |
| 18 | 清理 `console.log` | `GroupView.vue` 等 | 保留仅必要的错误日志 |
| 19 | 抽取认证布局 | `LoginView` 等 3 文件 | 消除 200 行重复的背景 CSS |
| 20 | 清理 `dist_frontend/` | 根目录 | 确认其用途，保留一个构建输出 |

---

## 附录：项目基础信息

| 项目 | 信息 |
|------|------|
| **框架** | Vue 3.4 + Vite 5.4 |
| **UI 库** | Element Plus 2.8 |
| **状态管理** | Vuex 4（vuex-persistedstate 持久化） |
| **路由** | Vue Router 4（History 模式） |
| **HTTP** | Axios 1.7 |
| **语言** | JavaScript（无 TypeScript） |
| **CSS** | 纯 CSS（无 SCSS/Less/PostCSS） |
| **测试** | 无 |
| **代码检查** | 无 ESLint/Prettier 配置 |
| **组件数量** | 60+ Vue 组件 |
| **View 数量** | 20 个页面 |
| **路由数量** | 19 个命名路由 |
