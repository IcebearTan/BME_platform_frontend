# BME 平台前端架构设计指南

> 版本:2026-08-24(清债批次 1–6 完成后定稿)
> 读者:后续开发者与维护成员;也供 AI 辅助开发时作为权威上下文
> 定位:本文件是前端架构的**单一权威源**。与之冲突的旧文档(含 `docs/legacy/`、`docs/dev-memories/`)以本文件与代码为准。

---

## 1. 平台全景

BME(卓越工程师在线教育平台)前端由两个同域部署的 Vue 3 应用组成,共用一个 Flask 后端(`BME_platform_flask`,本地 `127.0.0.1:5001`):

| 应用 | 目录 | 使命 | dev 端口 | base 路径 |
|---|---|---|---|---|
| 用户端 | `apps/user`(@bme/user) | 学员/导生/老师的学习社区:课程、文章、营期、考勤、勋章、LLM 服务 | 8081 | `/AMEII/` |
| 管理端 | `apps/admin`(@bme/admin) | 后台管理:用户/内容/考勤/营期/激励/LLM 配额 | 5173 | `/admin/` |

同域部署是若干架构决策的根源:
- **localStorage 键必须带端前缀**(`bme-user-*` / `bme-admin-*`),否则互相覆盖(批次 3 修复的历史事故);
- 401 跳转按 `import.meta.env.BASE_URL + 'login'` 相对解析(见 `@bme/api`);
- 两端共享视觉语言(DewUI),但**不共享业务组件**——共享的只有设计系统与基础设施。

技术栈:Vue 3(Options API 与 `<script setup>` 并存,新代码建议 setup)、Vuex 4 + vuex-persistedstate、Element Plus(结构组件)+ 自研 DewUI(视觉层)、Vite 5、pnpm workspace、Playwright(e2e)。

## 2. 仓库拓扑与依赖方向

```
BME_platform_frontend/
├── apps/
│   ├── user/      # 用户端(不 import admin 的任何东西)
│   └── admin/     # 管理端(不 import user 的任何东西)
├── packages/      # 共享层,依赖只能向下
│   ├── styles/    # @bme/styles   tokens.css(310 变量)+ article-content.css + 自托管高亮资产
│   ├── dew-ui/    # @bme/dew-ui   19 个液态玻璃组件(零业务知识)
│   ├── api/       # @bme/api      axios 客户端工厂 + 401 处理器(零 UI 框架硬依赖)
│   └── editor/    # @bme/editor   md-editor-v3 自托管配置(side-effect 模块)
├── e2e/           # Playwright 冒烟安全网(双 webServer)
└── docs/          # 本指南 + legacy 归档 + dev-memories
```

**依赖方向**(只允许向下,禁止横向与反向):

```
apps/user ─┬─→ @bme/dew-ui ─→ @bme/styles(tokens)
apps/admin ┘   @bme/editor
               @bme/api(axios)
```

**什么代码进 packages**:被两端同时消费、且不含业务语义(tokens、玻璃组件、HTTP 客户端、编辑器配置)。**什么留在 app**:路由、状态、业务视图、端特有的样式桥接(admin 的 `pages.css`/`global.css`、user 的 `main.css`)。

## 3. 分层架构

| 层 | 载体 | 变更影响半径 | 纪律 |
|---|---|---|---|
| L0 设计 tokens | `@bme/styles/tokens.css`(`--dew-*` 玻璃配方、`--color-*`、`--radius-*` 等) | **两端全局** | 改一个变量=改全站视觉,PR 必须截图对比;禁止在组件里硬编码色值绕过 tokens |
| L1 视觉组件 | `@bme/dew-ui`(DewCard/DewButton/DewInput/…) | 两端使用处 | 组件零业务 props;新组件先上 user 端 `UiShowcaseView` 验证 |
| L1' 结构组件 | Element Plus(el-table/el-form/el-dialog/…) | 单端 | 保留 EP 做数据密集结构;视觉由各 app 的 EP 桥接层统一(见 §5.4) |
| L2 app 骨架 | `main.js`/`router.js`/`store.js`/`api.js` 薄壳/全局样式 | 单端全局 | `api.js` 只做工厂装配,不写业务 |
| L3 业务视图 | `views/` + `components/`(按域分子目录) | 单页 | 页面骨架必须走 §7.1 范式;scoped 样式里禁止重复定义全局类 |

## 4. 设计系统:DewUI 液态玻璃语言

### 4.1 核心配方

- **玻璃卡片四层结构**(DewCard 内置):毛玻璃底(`backdrop-filter: blur(20px) saturate(1.4)` + `--dew-card-bg`)+ 鼠标跟随折射层 + 色散层 + 顶部高光线;弹性动效统一 `--dew-bounce` 曲线。
- **极光衬底**:玻璃卡片依赖父层衬底出彩。admin 的衬底单源是 `global.css` 的 `.aurora-bg`(布局、登录、注册页共用);user 端以 HomeView 为准。**不要在玻璃卡下面再垫纯色块**。
- **flat 变体**:阅读/文档场景用 `variant="flat"`(纯色、无 glass、hover 零反馈),避免长文本在玻璃上晃动。
- **深色模式**:选择器约定 `.theme-dark`(挂在 body 与根 div),tokens 在 `.theme-dark` 下重定义。写组件样式时必须同时考虑两态。

### 4.2 DewCard 使用范式(最高频)

```vue
<!-- 内容卡片 -->
<DewCard :glass="true" :divided="true" size="lg">…</DewCard>

<!-- 表格容器(admin 标准骨架):关 hover、清零内边距 -->
<DewCard no-hover class="table-card">
  <el-table …/>
</DewCard>
<style scoped>
.table-card :deep(.dew-card__body) { padding: 0; }
</style>
```

### 4.3 组件速查(19 个,均在 `@bme/dew-ui`)

| 组件 | 关键 props | 用途 |
|---|---|---|
| DewCard | variant(default/elevated/inset/flat)、glass、tinted、accent、divided、noHover、interactive | 一切卡片容器 |
| DewButton | type(glass 默认/ghost/…)、size、block、loading、active | 按钮;有内容宽度测量层,隐藏容器(v-show tab)内会自动补测 |
| DewInput | v-model、type(含 password 显隐)、size、prefixIcon/suffixIcon、clearable、error | 表单输入,配 el-form-item 使用 |
| DewDialog / DewMessageBox / DewMessage | v-model / 命令式 | 弹窗与 Toast(Toast 极简:单图标+色,不加彩色底) |
| DewSelect / DewSwitch / DewDropdown / DewPopover | v-model 系 | 表单与浮层 |
| DewTag / DewBadge / DewProgress / DewSkeleton | type/size 系 | 状态展示;列表加载态一律 DewSkeleton |
| DewIsland / DewIslandGroup | items | user 端首页岛栏 |
| DewSidebar / DewSidebarNode | items、collapsible | 侧栏树 |
| DewButtonBar / DewPostCard | items / post | 按钮组与帖子卡 |

### 4.4 Element Plus 桥接策略(两端各自的"EP 皮肤")

EP 是结构层,不做逐个替换;通过全局 CSS 把 EP 拉进设计系统:

- **变量桥接**:admin `global.css` 把 `--el-color-primary` 等映射到本端变量,`.theme-dark` 下重定义 EP 暗色变量;
- **壳组件玻璃化**(admin):el-card 走玻璃配方,el-table 表头轻玻璃 + **行/单元格实心台子**(`--surface-solid`,密集数据可读性红线);
- **对话框/抽屉不走玻璃**(红线):浮层叠在页面内容上无衬底可借,半透明会透出底层文字——保持 EP 实心底;
- user 端桥接在 `apps/user/src/styles/main.css`。

### 4.5 UI 硬约束(多条返训沉淀,违反必返工)

1. 图标一律 `@element-plus/icons-vue` 或 SVG,**杜绝 emoji**;Icon 克制使用。
2. **禁止默认蓝紫渐变**装饰;用中性色/玻璃/语义色。
3. DewMessage/Toast 极简:单图标 + 色。
4. 新 Dew 组件先上 `UiShowcaseView`(user 端)验证再接业务。
5. UI 调整**大胆做**,不要每次只挪 2px。
6. **禁外网字体/脚本 CDN**(国内环境红线):字体走系统栈,高亮资产见 `@bme/editor`。

## 5. 共享包契约

### 5.1 @bme/styles

- `tokens.css`:`--dew-*` 玻璃配方与 `--color-*` 的**权威源**,两端 main.js 首先引入;
- `article-content.css`:文章正文样式单源;`copy-to-public.mjs` 在各 app `predev`/`prebuild` 时把产物复制进 `public/`(生成物已 gitignore);
- admin 额外有 `apps/admin/src/styles/variables.css`(结构变量:spacing/字号/阴影/`--primary-color`),与 tokens.css 形成**双轨**:玻璃配方看 tokens,结构节奏看 variables——这是清债后的既成事实,新样式优先用已有变量,不新造。

### 5.2 @bme/api

```js
// apps/<x>/src/api.js —— 薄壳,仅装配
const api = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  tokenKey: 'bme-<user|admin>-token',
  onUnauthorized: createUnauthorizedHandler({ tokenKey }),
})
```

- 请求拦截自动注 `Authorization: Bearer <token>`;401 时防重弹窗 + 清 token + 按 BASE_URL 跳登录;
- 包内 ElMessage 为动态 import(element-plus 是 peerDependency),包本身可在任意端复用;
- **业务错误处理约定**:catch 里解析 `error.response.data.message`(string 或 `{字段:[错误]}` 对象,取第一条),兜底友好文案。范式见 `apps/*/src/components/Auth/LoginComponent.vue`。

### 5.3 @bme/editor

`md-setup.js` 是 side-effect 模块:用到 md-editor-v3 的组件 `import '@bme/editor/md-setup'` 即生效(幂等)。它把 highlight.js 指到自托管的 `public/md-ext/`,并要求组件层 `noPrettier` + 工具栏排除 mermaid/katex——**保证编辑器零外网请求**。新增编辑器/阅读页必须走它,不得直连 CDN。

### 5.4 @bme/dew-ui

纯展示组件库,禁止引入业务概念(用户/课程等)。组件直接从包根 import(`import { DewCard } from '@bme/dew-ui'`)。修改组件 = 修改两端视觉,变更必须在 `UiShowcaseView` 有对照。

## 6. user 端架构要点

- **组织**:`views/`(路由页)+ `components/`(按域分组:Article/Attendence/Camp/Course/Auth/Home/…) + `composables/`(useArticleReactions 等) + `services/`(campService 等纯逻辑);
- **主题**:`store.isDarkMode` → body 与 `#app` 同步挂 `theme-dark/theme-light`(App.vue watch);
- **路由守卫**:`meta.requiresAuth` 未登录跳登录页并带 `redirect` 回跳;已登录禁入 login/register;
- **文章双轨**:v1(ArticleView/ArticleEditorView)与 v2(ArticleViewV2/ArticleEditorV2,md-editor-v3)并存,新功能一律 v2;v1 下线是既定清债项(见 §11)。

## 7. admin 端架构要点

### 7.1 管理页标准骨架(新页面必须套用)

全局类在 `apps/admin/src/styles/pages.css`(单源);布局由 HomeView 提供(fixed 顶栏 + 可折叠侧栏 + content-wrapper)。

```vue
<template>
  <div class="selectable">
    <div class="page-header">
      <div class="page-title">页面标题</div>
      <div class="header-actions">
        <el-form :inline="true" class="form-inline" @submit.prevent>…筛选…</el-form>
      </div>
    </div>
    <DewCard no-hover class="table-card">
      <el-table …/>
      <div class="pagination-wrapper"><el-pagination …/></div>
    </DewCard>
    <!-- 弹窗:el-dialog + footer 内 .dialog-footer 按钮行 -->
  </div>
</template>
```

**禁止**:在 scoped 里重定义 `page-header/form-inline/pagination-wrapper/dialog-footer/selectable` 等全局类;新增可复用样式先进 `pages.css` 再用。

### 7.2 RBAC 与路由

- 登录响应含 `role`(super_admin/teacher/mentor/student)与 `permissions`;
- store getters:`role` / `can(perm)`(super_admin 直通)/ `isStaff`(teacher/mentor/super_admin);
- 路由 `meta: { staffOnly: true }` + `router.beforeEach` 守卫防手输 URL 绕过菜单;菜单项用 `v-if="isStaff"` 同步显隐。

### 7.3 已知的"只读页"

`UserManage` 是只读列表——后端暂无 admin 用户管理接口(`admin.py` 仅 /overview),**不要在前端恢复编辑/删除按钮**,除非后端先补接口(见 §11 债务表)。

## 8. 状态与键名规范

- Vuex + `vuex-persistedstate`;**持久化键**:`bme-user-state` / `bme-admin-state`;**token 键**:`bme-user-token` / `bme-admin-token`;
- 两 app 同域,任何新 localStorage 键必须带 `-user-`/`-admin-` 段;
- 登录态真相源:localStorage token(store 从中初始化);页面级权限以 `/user/user_index` 拉取的 user 为准。

## 9. 工程化

| 命令 | 作用 |
|---|---|
| `pnpm install` | 全 workspace 安装 |
| `pnpm dev:user` / `dev:admin` / `dev:all` | 起对应 dev server |
| `pnpm build` / `build:user` / `build:admin` | 构建 |
| `pnpm test:e2e` | Playwright(注意必须带 `-c e2e/playwright.config.ts`,根 script 已封装;裸跑 `npx playwright test` 不会起 webServer) |

- **不要在仓库根直接 `npx vite`**:app 的 vite.config 依赖 cwd 读各自 package.json 注入 `__APP_VERSION__`;一律走根 scripts 或进 `apps/*` 目录;
- env:`.env.development` 被 gitignore(内容 `VITE_API_BASE_URL=http://127.0.0.1:5001`),新 clone 后两 app 各建一份;`apps/user/.env.example` 有模板;
- Windows 开发机:Node ≥ 18 手动切换,重新 clone 本仓,按 README 建 env;
- 提交规范:中文 conventional commits(`feat(camp): …`/`refactor(admin): …`);分支模型:`master`(稳定)+ `Icebear_develop`(日常开发,稳定后合回)。**不做一批次一分支**;
- **项目级 Claude skills 随仓库分发**(`.claude/skills/`,已放行 gitignore;个人 `settings.local.json` 仍忽略):`bme-admin-page`(新增管理页)、`bme-dewui`(DewUI/视觉调整)、`bme-e2e`(测试编写)。它们是本指南的程序性投影,权威源仍是本文——改架构先改文档再改 skill。

## 10. 质量保障

### 10.1 e2e 冒烟网(7 条,`e2e/*.spec.js`)

- 双 webServer(8081/5173),`reuseExistingServer` 复用已起服务;
- **不依赖后端**:`page.route` 拦截全部 API——`loginAsStaff()` 预置假 token 与 vuex 持久化态、mock `/user/user_index` 返回 super_admin,其余统一 200 空数据;
- 用例覆盖:两端登录页渲染、user 路由跳转、DewUI 展示页、admin 布局壳、md-editor 挂载、用户管理页(表格渲染 + 前端搜索 + **pageerror 断言**);
- **新增页面请配一条用例**;pageerror 断言是抓"模板引用不存在绑定"类事故的利器(批次 6 教训)。

### 10.2 变更检查清单(提交前自查)

- [ ] `pnpm build` 两端通过
- [ ] `pnpm test:e2e` 全绿
- [ ] 改了 tokens/DewUI?两端目检(明/暗两态)+ UiShowcaseView 对照
- [ ] 新增 localStorage 键带端前缀
- [ ] scoped 里没有重复定义全局类
- [ ] 无硬编码色值(用 tokens/variables 变量)
- [ ] 无 console.log 残留、无注释掉的死代码块
- [ ] 新组件/页面无 emoji 图标、无蓝紫渐变

## 11. 已知债务与路线图(2026-08-24 快照)

| 优先级 | 项 | 说明 |
|---|---|---|
| 高 | admin 用户管理接口缺失 | 后端 `admin.py` 仅 /overview;补齐 CRUD 后恢复 UserManage 操作列 |
| 高 | MedalManage 勋章图 404 | `/admin/medals/${id}.png` 后端无路由无存储;需设计存储方案 |
| 中 | LearningProgress ~280 行不可达死码 | 「课程进度设置」dialog 链,入口已注释,可直接删 |
| 中 | user 端 v1 文章双轨下线 | ArticleView/ArticleEditorView(v1)删路由删文件;顺带 `mock/config.js`、空 `components/ui/` |
| 中 | admin 主 chunk 2429 kB | EP 全量引入;按需引入或 manualChunks |
| 低 | LLM 三页深色模式 | 纯浅色硬编码,需整体 token 化重设计 |
| 低 | HomeView routeMap 补全 | `/editor`、`/llm/*` 面包屑兜底"系统管理";`/public` 路由语义存疑 |

## 12. 新成员 Onboarding

1. `pnpm install`;两 app 各建 `.env.development`(见 §9);
2. 起 Flask 后端(另仓,5001)→ `pnpm dev:all`;
3. 通读本文件 §2/§5/§7 → 跑 `pnpm test:e2e` 确认环境绿;
4. 第一个任务建议从"给某管理页加一列"开始,套 §7.1 骨架;
5. 深入设计语言:读 `docs/dev-memories/bme-dewui-design-language.md` 与 `UiShowcaseView.vue`;
6. 历史背景:git log(批次提交信息即变更日志)、`docs/legacy/` 审查报告、`docs/dev-memories/MEMORY.md` 索引。

---

*本指南随架构演进同步更新;修改架构(新增共享包、变更依赖方向、调整设计系统红线)必须先改本文再动代码。*
