# BME 平台前端架构设计指南

> 版本:2026-09-11(营期重构 1a/阶段1/2 + jiayuanpush 合并后校准;首版 2026-08-24)
> 读者:后续开发者与维护成员;也供 AI 辅助开发时作为权威上下文
> 定位:本文件是前端架构的**单一权威源**。仓内 `docs/` 只放被 git 跟踪并持续维护的规格(本文 + 营期IA规范 + 营期重构设计方案);计划/参考/记录/归档在本地根目录 `../docs/`(不入库,跨机手动同步),与本文冲突处以本文与代码为准。

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
└── docs/          # 规格层(git 跟踪):本指南 + 营期IA规范 + 营期重构设计方案
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

1. 图标一律 `@element-plus/icons-vue` 或 SVG，**杜绝 emoji**。禁令同时覆盖界面、用户文案、Toast、日志和源码注释；提交前运行 `pnpm check:no-emoji`。
2. **禁止默认蓝紫渐变**装饰;用中性色/玻璃/语义色。
3. DewMessage/Toast 极简:单图标 + 色。
4. 新 Dew 组件先上 `UiShowcaseView`(user 端)验证再接业务。
5. UI 调整**大胆做**,不要每次只挪 2px。
6. **禁外网字体/脚本 CDN**(国内环境红线):字体走系统栈,高亮资产见 `@bme/editor`。

### 4.6 XLab 主题:明暗双态(2026-10-09 更新)

当前 XLAB 入口 `/lab` 为项目广场，发布页为 `/lab/projects/new`，详情通过 `ProjectDetailDrawer` 展示；旧 `/projects` 与 `/projects/:id` 分别重定向到广场与详情抽屉。当前页面族复用 DewUI 框架，颜色单源为 `apps/user/src/styles/xlab.css` 的 `--xg-*` 变量，跟随全站 `.theme-dark/.theme-light`。历史恒黑页面已退出主流程，当前广场、发布页、抽屉与社区推荐面板均使用明暗双态。

- 明暗变量在 `:root` 与 `.theme-dark` 定义，覆盖背景、实心面板、文字、边框、封面占位、徽标、按钮、焦点与海报衔接；不修改全站 DewUI tokens。
- XLAB 只使用玫红与紫色强调：玫红用于主按钮、自由分享和已完成，紫色用于营期来源、进行中、筛选和焦点。颜色与光晕全部使用 `--xg-pink-*` / `--xg-purple-*` 变量；暗色使用更亮的文字色，主按钮文字与反白选中态各自使用专用对比色变量。
- 详情抽屉 Teleport 到 body，必须继承 body 的全站主题变量，抽屉和顶部栏保持实心背景；无需额外维护独立主题状态。
- 共享样式继续使用 `xl-` / `xlab-` / `xg-` 前缀，页面布局留在 scoped 样式中。
- 视觉验收覆盖广场、详情抽屉、发布表单和两种预览的明暗切换，以及桌面和约 400px 手机宽度。
- 页面族通过局部 DewUI token 桥接统一卡片、输入、按钮和分段控件；桥接限定在 XLAB 页面与详情抽屉，不覆盖全站主题。导航及社区关联卡同步使用粉紫强调，弃用绿色发光和硬投影。
- 广场全站导航常驻顶部，并预留 60px 高度避免遮挡海报；不再自动收起或要求悬停展开。

## 5. 共享包契约

### 5.1 @bme/styles

- `tokens.css`:`--dew-*` 玻璃配方与 `--color-*` 的**权威源**,两端 main.js 首先引入;
- `article-content.css`:文章正文样式单源;`copy-to-public.mjs` 在各 app `predev`/`prebuild` 时把产物复制进 `public/`(生成物已 gitignore);
- admin 额外有 `apps/admin/src/styles/variables.css`(结构变量:spacing/字号/阴影/`--primary-color`),与 tokens.css 形成**双轨**:玻璃配方看 tokens,结构节奏看 variables——这是清债后的既成事实,新样式优先用已有变量,不新造。

### 5.2 @bme/api

```js
// apps/<x>/src/api.js —— 薄壳,仅装配
const authSession = createSessionFacade({   // D1 安全地基:登录态单一权威源
  baseURL: import.meta.env.VITE_API_BASE_URL,
  clientType: 'user',                       // 'user' | 'admin',双端 cookie/会话隔离
  tokenKey: 'bme-<user|admin>-token',
})
const api = createApiClient({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  tokenKey: 'bme-<user|admin>-token',
  auth: authSession,
  onUnauthorized: createUnauthorizedHandler({ tokenKey, auth: authSession }),
})
```

- 请求拦截自动注 `Authorization: Bearer <token>`(token 取自 facade);401 按 machine 语义细分——终态(SESSION_REVOKED/ACCOUNT_MERGED 等)直接终止该端会话,仅 ACCESS_TOKEN_EXPIRED/无 machine 走静默续期重放一次;
- **会话门面(2026-10-01 D1)**:状态机 booting/authenticated/anonymous/unavailable,双模式——cookie 模式(后端 `AUTH_REFRESH_COOKIE_ENABLED=true`,经 `GET /auth/session/config` 探测)access 仅内存、refresh 走 HttpOnly cookie、刷新页由 bootstrap 恢复;compat 模式沿用 localStorage 双键。**守卫必须 `await authSession.bootstrap()` 再判定**,组件不得直读 localStorage token(收口 `authSession.getToken()`);跨标签页续期经 Web Locks 互斥,服务端一次性消费兜底;
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
- **营期域**(2026-09 重构后):规范源= `docs/营期模块-设计与IA规范.md`(IA/状态渲染,唯一规范来源)与 `docs/营期升级重构-设计方案.md` v1.2(数据模型/流程,阶段3项目营未实施)。要点:视角纪律=看**营内角色**(`sessions` 回包 `my_roles` / `available_perspectives`，`my_role` 仅兼容旧单身份)而非全局 role(1a 身份解耦后全局仅 super_admin/user,旧 mentor/student 比较一律无效);营期中心 `/camp` 纯导航(五分组卡片),报名唯一入口=营期工作台内 CampJoin;导生市集 `/camp/:sid/market` 是营期域内全出血子路由(IA 规范 §1.2 例外);学员收藏与志愿窗口同门禁(collecting)。

## 7. admin 端架构要点

### 项目营交付契约（2026-10-13）

2026-10-17独立项目领域位于用户端 `domains/projects`：`/my-projects` 为长期项目入口，
`/project-workspace/:projectId` 持有独立项目上下文，编号、长期团队、D0、研发节点、日历和记录不依附营期。
`binding` 指定本期关联；研发节点进度与本期考核分开显示，退出本期或结营保留长期项目。
工作区使用单条侧栏；老师仅通过本营关联读取明确共享的本期资料，已结束关联使用冻结快照。
项目与营期入口复用 `ProjectWorkspaceShell` / `ProjectWorkspaceFrame`，不在加载后自动换页。
`/camp?sid=&scope=&unit=&tab=` 保留营期、项目、栏目及视角；独立地址通过 `binding` 选择本期上下文，返回营期保留位置。
长期项目（日历、记录、团队）与本期工作（考核、组会、人员、成果、考勤）分组，积分、公告、请假也在同一外壳中切栏。
本期能力字段由 context 的 binding 返回，不使用长期负责人身份猜测本期权限；老师视角仍只读明确共享内容。
原 CampUnit ID、材料、评价及通知来源保留；未映射项目继续原流程，不通过名称猜测归属。
已迁入项目不再使用旧团队、模板和旧广场写入口；本期考核复用里程碑新增/编辑，保留节点与材料ID。
已结束关联概览与日历考核均读冻结数据，来源深链携带binding/unit/node；返回营期先区分有效参与与已结束关联。既有已结营档案仍从原营期查看，本轮迁移工具只切换未结营项目。
用户端与管理端分别实现参营组合界面，后端 `/project-core` 统一授权与版本控制，
`PROJECT_CORE_ENABLED` 默认关闭。发布必须先执行迁移79，即使入口关闭也要满足兼容读取的新表依赖。
项目通知通过服务端授权解析到具体节点或记录；记录深链不受最近200条列表限制。
项目概览使用独立日程方框显示D0、D1、D2等日数；正式启动前或D0未确认时隐藏日数方框。
月历与时间线沿用同一格式函数，启动前不显示负日数。方框默认使用中性色，启动日、关键节点日、
本期考核截止日和节点完成日按当前授权日历记录着色，并保留文字状态；取消节点与已结束参营关系不触发本期提醒。
日数按项目时区计算，跨午夜及页面恢复可见时更新；概览的考核空态明确显示未设置节点，身份与进度按统一基线排版。
项目请求去重统一使用 `@bme/api` 的 `createRequestKey`，普通HTTP来源不能依赖仅安全上下文提供的 `crypto.randomUUID`。
该标识只用于请求去重，不用于认证。`e2e/playwright.project-http.config.ts` 使用普通HTTP来源和隔离预览API，检查同壳营期导航、工作区、D0、节点和研发记录；localhost检查不能代替这一项。
本次专项配置为 `e2e/playwright.project-core.config.ts`，使用隔离本地API与18096端口；
只检查新领域、原工作区、看板和交付的直接依赖，不执行全量回归。

2026-10-16项目营用户工作区改为 ProjectWorkspaceShell：固定营期与项目上下文、单条侧栏、按栏目挂载右侧工作页。
状态统一保存在 `/camp?sid=&scope=camp|project&unit=&tab=&node=`，兼容旧积分/组会/请假入口。
成员与负责人合并项目选择器，职责来自项目关系；老师全营与项目只读视角使用相同外壳，后端权限不因导航变化扩大。
ProjectBoard 作为可按 section 挂载的业务适配器，ProjectMilestones 的工作区模式采用节点列表与选中详情，原培训营流程保留。
积分、公告、请假明确为营期事务，不按项目复制奖励数据。开发与预览使用独立目录、独立端口及隔离演示数据。
节点通知在同营期内导航时也解析目标项目，过期响应不覆盖后续导航；名单变更静默更新项目上下文，保留当前栏目和草稿。
老师人员页以真实项目关系展示职责，直接入营使用 member，项目组队和负责人转交仍遵守既有权限；培训营的学员/导生组件默认行为保持兼容。
结营老师的项目名单读取冻结看板，公告仅供阅读；开启考勤时保留个人周累计、负责人项目周表及老师全营考勤。

2026-10-14新增项目总览：本营管理老师在用户端 TeacherWorkspace 默认进入 TeacherProjectDashboard，
管理端对应 `/camps/:campId/project/dashboard`。两端各自持有业务组件，共用后端
`/camp/projects/:sid/dashboard` 与按项目key的只读详情接口，不跨app导入业务组件。
后端按有效 CampStaff 的 `project.read_all` 实时授权，老师只读材料/评价及附件，不增加项目写权限。
矩阵按实际节点展开，无节点明确显示未配置；完成率复用交付完成口径，结营后使用冻结档案。
刷新、切营与关闭详情均忽略过期响应；表格和抽屉使用Dew语义变量，支持明暗主题和窄屏。
专项检查位于 `e2e/camp-project-dashboard.spec.js`，通过独立配置使用18091/15183端口，
避免与积分分支共用检查服务。运行该专项及相关交付检查，不执行全量回归。

多人项目由成员交付、负责人评价；单人项目由负责人交付、管理员验收。ProjectMilestones 使用后端
`can_submit` 决定提交入口，使用 `completion_mode`、`node_complete` 和派生 `status` 展示进展。
模板仍兼容旧 `submit_mode` 字段，但申报、模板编辑和审核页不再承诺旧整队/个人两种模式。
附件一次最多20个、合计48MiB，说明最多64KiB，前后端共同校验，适配现有生产50MiB代理限制。
管理端附件先以JWT请求 `/token`，再打开短签地址，不使用无鉴权裸链接。

归档响应中的 `archive` 与 `revisions` 是同级字段。归档页将二者组成展示状态，切营或状态变化后重新加载，
忽略旧请求结果。普通业务操作归档只读，但专用登记修正入口仍向管理员开放，由后端校验原因与版本。
新回归位于 `e2e/camp-project-delivery.spec.js`，只运行该文件及 `camp-center` 的项目营场景，不运行全量套件。

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

- 两级角色(2026-09「1a 身份解耦」后):登录响应 `role` 只有 `super_admin`/`user`,管理端实际仅 super_admin 登录;历史 teacher/mentor 角色串已清扫,**不要再写 role==='teacher' 类比较**;
- store getters:`role` / `can(perm)`(super_admin 直通)/ `isStaff`(=super_admin,store.js:46-50);
- 路由 `meta: { staffOnly: true }` + `router.beforeEach` 守卫防手输 URL 绕过菜单;菜单显隐由 `app/navigation/useMenu.js` 按 staffOnly 统一过滤(不再是模板里逐项 v-if)。

### 7.3 路由清单 = 导航单一真相源(2026-09-21 IA 重构)

旧「router.js + HomeView 硬编码菜单 + routeMap 标题表」三真相源已废除。现在:

- 路由集中在 `router/manifest.js` 组装(域路由模块:`router/routes/*` + `domains/<域>/routes.js`),每条路由的 `meta` 携带 `title / domain / navGroup / navOrder / showInMenu / icon / staffOnly / activeMenu`;
- **挂载新页面 = 加一条带 meta 的路由**(侧栏/标题/面包屑/菜单排序/激活态全部自动派生),跨域深链给 `meta.activeMenu`(菜单 index 路径);对象详情子路由加 `meta.campCrumb` 类标记可让面包屑插对象名(营期工作区见 `domains/camps/context/campLabel.js`);
- 分区定义在 `app/navigation/navGroups.js`(`NAV_SECTIONS`,type=item 直达项/type=group 分组;icon 用 ICONS 注册表键名);
- 旧路径兼容用**函数式 redirect 记录**保 query/params(集中在各域 routes.js 的 `*Redirects` 导出);
- 营期工作区:`/camps/:campId/*` 嵌套叶子 + provide/inject 上下文(`domains/camps/context/campContext.js`)+ `workspaceNav.js` 谓词单源(导航可见性/路由守卫/blocked 原因共用)。

### 7.4 已知的"只读页"

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
| `pnpm dev:preview` | 起 5002 临时预览 API + 两端 preview 模式，仅用于演示数据 |
| `pnpm build` / `build:user` / `build:admin` | 构建 |
| `pnpm test:e2e` | Playwright(注意必须带 `-c e2e/playwright.config.ts`,根 script 已封装;裸跑 `npx playwright test` 不会起 webServer) |

- **不要在仓库根直接 `npx vite`**:app 的 vite.config 依赖 cwd 读各自 package.json 注入 `__APP_VERSION__`;一律走根 scripts 或进 `apps/*` 目录;
- env:`.env.development` 被 gitignore(内容 `VITE_API_BASE_URL=http://127.0.0.1:5001`),新 clone 后两 app 各建一份;`.env.preview` 仅指向 5002 演示 API,禁止混用;`.env.test` 固定 5001 并使用独立前端端口;
- Windows 开发机:Node ≥ 18 手动切换,重新 clone 本仓,按 README 建 env;
- 提交规范:中文 conventional commits(`feat(camp): …`/`refactor(admin): …`);分支模型:`master`(稳定)+ `Icebear_develop`(日常开发,稳定后合回)。**不做一批次一分支**;
- **项目级 Claude skills 随仓库分发**(`.claude/skills/`,已放行 gitignore;个人 `settings.local.json` 仍忽略):`bme-admin-page`(新增管理页)、`bme-dewui`(DewUI/视觉调整)、`bme-e2e`(测试编写)。它们是本指南的程序性投影,权威源仍是本文——改架构先改文档再改 skill。

## 10. 质量保障

### 10.1 e2e 冒烟网(32 条,6 个 spec,`e2e/*.spec.js`)

- user/admin 测试服务使用独立端口 18081/15173,不复用 8081/5173 的开发或预览进程;
- 5002 预览 API 有独立契约测试:关键管理数据结构、已知空列表结构、未知路由必须 404;
- **不依赖后端**:`page.route` 拦截全部 API——user 端 mock 登录态恒 `role:'user'`、admin 端 mock `super_admin`(两级角色,**勿再用旧 teacher/mentor/student 角色值,会掩盖漂移**);营期用例的 `sessions` 回包带 `my_role`,其余统一 200 空数据;
- 用例覆盖:两端登录页渲染、user 路由跳转、DewUI 展示页、admin 布局壳、md-editor 挂载、用户管理页只读、营期中心五分组与报名选组/占位卡/申请撤回、导生市集状态机(志愿收集/结果门禁/打烊/导生勾选)、邮箱式通知收件箱与感谢信(直达/写信/频控),以及预览 API 契约;
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

## 11. 已知债务与路线图(2026-09-11 校准)

> 全量待办(含非架构项、跨仓项)见本地根目录 `../docs/待办总账.md`(不入库);下表只列架构相关且仍有效的项。

| 优先级 | 项 | 说明 |
|---|---|---|
| 中 | user 端 v1 文章双轨下线 | **v1 不是死码**——旧格式文章(articleVersion≠2)的现役渲染器,StudyHub/收藏夹按版本分流;下线需先做旧文内容迁移(后端配合) |
| 中 | LLM 三页深色模式 | 纯浅色硬编码(111 处色值),需整体 token 化重设计 |
| 低 | admin EP 按需引入 | manualChunks 已拆 vendor(主 chunk 2462→1277 kB,09-11);unplugin 按需引入属工程化批 |

(2026-09-11 处置:admin 用户管理已落地——编辑+封禁取代删除(flask 9a4fda8/前端 437494d),UserManage 操作列恢复——剔除;MedalManage `:rules` 已补+validate 前置,勋章图实测由前端同域静态服务不 404——剔除;注册即登录已闭环(a7a6f6f)——剔除;HomeView routeMap 已补 /editor、/public、/llm/*——剔除;导生双选后端分叉(camp_ms 已收敛 flask)——剔除;LearningProgress「课程进度设置」按遗留下线——入口 v-if="false" 禁用,整链代码休眠保留,恢复去掉该开关即可。)**注意:休眠入口代码不是可删死码,动 LearningProgress 前先看本条。**

## 12. 新成员 Onboarding

1. `pnpm install`;两 app 各建 `.env.development`(见 §9);
2. 起 Flask 后端(另仓,5001)→ `pnpm dev:all`;
3. 通读本文件 §2/§5/§7 → 跑 `pnpm test:e2e` 确认环境绿;
4. 第一个任务建议从"给某管理页加一列"开始,套 §7.1 骨架;
5. 深入设计语言:对照 `UiShowcaseView.vue` 实例(DewUI 设计语言全文在本地根目录 `../docs/记录/dev-memories/`,未随库分发);
6. 历史背景:git log(批次提交信息即变更日志);其余计划/归档/记忆都在本地根目录 `../docs/`(计划/参考/记录/归档四区,未随库分发,跨机手动同步)。

---

*本指南随架构演进同步更新;修改架构(新增共享包、变更依赖方向、调整设计系统红线)必须先改本文再动代码。*


### 培训小组与双身份接入 2026-10-11

CampView 根据服务端 available_perspectives 切换学员、导生和老师视角；界面视角不代表授权。
同营同人可同时学习和带教，避免再用一个 my_role 排他渲染全部入口。学习、认证、组会多组时
显式选择 unit_id；单组保留自动解析。课程页面继续传 sid，多营同课不默认把写入换到另一个营。

用户端老师工作台新增“培训小组”，管理端在营期成员页提供同类入口。两端各自维护
TrainingGroups.vue，业务代码不跨 app 引用。创建、增减职责、课程转交和治理负责人调整均由
本营权限及版本校验保护；前端隐藏按钮不能代替后端授权。招生组学员仍走既有指派/释放流程。

这次仅执行修改组件的 SFC 编译及后端内存定向检查，未运行全量 build/E2E 或生产迁移。


### 阶段 4 历史与运营收口 2026-10-11

用户端老师及管理端的学习/考勤看板提供“包含历史名单”；归档营按后端契约自动包含。
考勤导出沿用同一筛选，权限仍由后端校验；导生不因历史参数获得退出人员或其他组访问权。
培训小组标注已退营/离组及已结束职责，结束职责不显示操作按钮。历史学习课程在提示中标注。
组会任务总数使用服务端每人 `task_total`，详情使用各项 `expected_count`，不以当前全组人数
推算所有旧任务；`required_for_me=false` 不计待办并提示不要求本次提交/认证。带教矩阵遵守
章节 `visible_user_ids` 及 `expected_user_ids`，无权格不提供认证入口，下载始终由后端重新鉴权。
本轮只检查 8 个受影响 Vue 组件的 SFC 编译及后端定向场景，未运行全量构建/E2E。

### 视觉收尾及发布验收 2026-10-11

用户随后授权全量回归，前述阶段性验证限制不再适用于本轮。用户端、管理端的
TrainingGroups 各自复用 DewCard/Button/Dialog/Input/Select/ButtonBar/Tag/Skeleton 等控件；
成员表继续使用 Element Plus 结构组件，通过组件内主题变量适配浅色/深色，不改共享 token。
课程展示优先使用真实标题；职责转交表单有必填禁用、取消和重开重置；小组改名不重置课程范围。
切营会清空旧视图及弹窗，并忽略过期请求。旧营的学习、组会提示仍按导生语义展示。

多学习组选择器统一为 DewSelect。管理端营期工作台在窄屏列布局明确内容宽度，避免表格
固有宽度撑开页面。两端业务逻辑仍各自持有，没有引入跨 app 业务组件依赖。
新增培训组 E2E 覆盖两端双主题、创建/改名/结束职责、转交请求及归档只读和窄屏弹窗；
修复组会审阅旧测试的表头定位问题并恢复执行。构建与完整 E2E 结果记录在本次发布验收中。

### 积分联动（2026-10-14）

个人积分挂在 `/user-center/points`，复用个人中心布局；顶栏、头像菜单与移动导航提供入口。
浅色/深色沿用 DewUI tokens、DewCard/Button/ButtonBar/Select/Dialog，说明放在问号浮层。
积分页窄屏隐藏原个人中心大侧栏，仍可从全局移动导航进入个人中心。

`usePoints` 只在内存缓存余额，换号/退出清空；未知余额显示短横线，查询失败保留上次值并提示未更新。
`usePointsStore` 统一承接原服务台票据换取与表单 POST，多个入口共用防重复请求状态。
用户端和管理端积分管理分别持有业务组件，不跨 app 导入业务视图。

个人积分页仅展示余额、平台常驻获取途径和已到账收支。每日打卡、发布帖子未配置奖励，展示待开放。
营期任务、个人发放进度、导生提报和老师审核统一进入 `/camp?sid=&tab=points`，管理组件锁定当前 sid。
管理路由 `/operations/points` 通过原导航 meta 注册；营期老师/导生从本营工作台进入积分奖励，
服务端按实际营期职责授权；全局 user 角色不推导老师/导生权限。规则保存传版本，后端追加新版本。
商城通用流水尚未开放，明确区分训练营流水与商城记录入口，不把本地列表当成中央全量账本。

本轮仅做积分、商城 SSO 和章节认证相关定向检查；不执行全量回归。


### 积分配色与任务状态（2026-10-15）

首页右栏使用 PointsTasksPanel 展示统一余额与平台任务入口。首页、个人积分与营期积分展示
共用用户端 `styles/points.css` 的局部暖金配色，沿用头像钱包的 warning 色系、DewCard 和
DewButton，不修改全站 tokens。完成状态由 PointsTaskStatus 显示勾选圆标、空心时钟、锁形
或待更新图标；仅按接口明确的完成字段判断，不把未开放或状态未知的任务算作未完成。
任务状态优先读取线上 `done_today`，保留已上线的每日打卡、发帖与文章任务；状态样式检查使用模拟数据。

### 独立工作台入口（2026-10-15）

用户端工作台入口资格固定查询 `/workbench-sso/me`；`/work` 及其子路径的跳转地址通过
`/workbench-sso/config` 的运行时配置获得。二者不依赖 `VITE_WORKBENCH_URL` 是否在构建时设置。
普通训练营页面发布曾因缺少该变量编译回退到已退役 `/work/me`，导致有资格者入口消失；
不能通过只改服务器 `.env.production` 或复用旧产物来修复。新构建必须保留此运行时契约。
有资格者入口显示、无资格者隐藏；入口本身不授予工作台访问权限，真实登录继续逐请求检查。
入口和授权定向检查可运行 `pnpm exec playwright test -c e2e/playwright.workbench.config.js`，无需全量回归。
