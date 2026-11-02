# BME 前端公共开发规则

适用于所有贡献者、Codex、Claude Code 及其他编码助手，覆盖 `apps/user`、`apps/admin`、`packages`。维护日期：2026-11-02。

## 开始任务

1. 阅读 [团队协作约定](CONTRIBUTING.md)、[规范索引](docs/README.md)、[架构](docs/ARCHITECTURE.md) 和 [运行说明](README.md)。
2. 改接口或数据流时读 [接口契约](docs/standards/API-CONTRACT.md)；改页面或样式时读 [视觉与交互规范](docs/standards/UI-DESIGN.md) 和 [加载态规范](docs/加载态与骨架规范.md)。
3. 阅读目标页面、现有服务/组合函数、共享组件实际 props 及相关测试；先找同类实现再设计。涉及营期、XLAB、项目或工作台时按规范索引继续阅读领域约束。
4. 在仓库内检查 `git status --short`，保留用户改动。工作区上层不是 Git 仓库。

## 规范如何使用

- 本文件约束工作流程；架构文档负责边界与领域契约；`docs/standards/` 分别负责接口、视觉和验收要求。领域特殊规则必须明确限定范围。
- 分支、版本发布与公共/个人规则的边界以 [CONTRIBUTING.md](CONTRIBUTING.md) 为准。个人偏好可补充项目约定，实际冲突说明来源与影响；不修改他人的个人配置，也不在公共文件写死某个贡献者的工作习惯。
- 历史计划、审查报告、开发记忆和 `.claude/skills/` 是参考或流程适配，不能覆盖现行规范。通用设计 skill 的字体、CDN、框架和风格建议不得替代 BME 规则。
- 文档与代码冲突时核对相关实现、后端与测试，说明差异并同步修正规范；不要据旧文档恢复已退役功能，也不要把现有违规写法当模板。
- 如果另一个工作区存在 `../开发AMELL项目规范.md`，按其适用范围补充阅读；本工作区未提供此文件，开发不依赖它。

## 架构与接口红线

- 双端是 Vue 3 应用；新代码优先 `<script setup>`，按现有 JavaScript 风格开发，不顺带迁移技术栈或批量格式化。
- 在现行 `apps/user`、`apps/admin` 和 `packages` 中开发，不从 `BK备份/`、旧 BME_frontend / BME_backend 或其他历史仓库开发。
- `apps/user` 与 `apps/admin` 不互相导入业务代码。共享基础设施进入 `packages`，业务服务、路由和状态留在各 app。
- HTTP 复用本端 `src/api.js` 装配的 `@bme/api` 客户端；登录态使用 `authSession`，守卫先 `await authSession.bootstrap()`。禁止在新业务组件中直读 localStorage token 或另写续期拦截器。
- 接口按领域服务封装；明确响应是否已解包、业务失败与空态、分页、权限、版本和去重字段。不能把请求失败显示成成功空列表。
- 全局角色是 `super_admin` / `user`；营内角色、可用视角和操作能力按服务端契约判断。前端显隐不替代后端授权。
- 新持久化键使用 `bme-user-` / `bme-admin-` 前缀；账号相关缓存还要按账号和业务范围隔离，退出/换号时清理。

## 视觉红线

- 基础控件优先从 `@bme/dew-ui` 导入；复杂表格/表单等保留 Element Plus，通过本端全局桥接保持一致。先检查实际导出和 props，禁止猜组件 API。
- 颜色、字体、圆角、间距、阴影和动效优先复用现有变量；新增颜色在指定 token/领域样式文件集中定义并补明暗两态，不在页面散落硬编码色值。
- 卡片/入口可用玻璃；阅读、密集数据、对话框、抽屉和菜单优先清晰实心表面。不要在页面手写新的玻璃配方。
- 同时考虑明暗主题、窄屏、加载、空态、错误、禁用与提交反馈；远程图片使用 `DewImage`，数据骨架用 `DewSkeleton`。
- 不新增 emoji（包括 UI、文案、Toast、日志、源码注释）。已有用户明确要求的例外：`apps/user/src/components/Community/communityEmoji.js` 是正文/评论的用户内容选项，保留该表情面板；界面图标仍用 `@element-plus/icons-vue` 或已有 SVG。
- 不新增默认蓝紫渐变、外网字体/脚本 CDN、彩色大底 Toast。XLAB、积分等既有局部主题只在各自范围使用。
- 新共享组件先在用户端 `UiShowcaseView` 验证；改共享 tokens/组件须检查两端。管理页沿用 `pages.css` 骨架，scoped 不重定义通用全局类。

## 执行与交付

- 日常功能使用 `feature/*`，集成测试进入 `develop`，个人分支可选；版本使用留存的 `release/<版本号>`，现场修复使用 `hotfix/*`。2026-11-02 整理的 Icebear 维护工作区已改名为 `hotfix/server-maintenance`，不要求其他贡献者切入此分支；远端 `codex/server-maintenance` 为暂留的同事共享旧入口，不自动退役或同步 master。
- 使用根目录 pnpm scripts；不要在仓库根裸跑 Vite。`.env.development` 固定真实 API `http://127.0.0.1:5001`；演示使用 `pnpm dev:preview` 的 5002，不覆盖开发配置。
- 验证按 [质量与验收](docs/standards/QUALITY.md) 选择范围。文档改动检查链接/路径与差异；业务改动验证相关行为；共享改动扩大至双端。历史记录中的“本轮仅专项测试”不约束新任务。
- 代码提交前默认运行 `pnpm check:no-emoji`、`pnpm build`、`pnpm test:e2e`；纯文档提交按 QUALITY 检查链接、路径、命令与差异，无需重复构建和 E2E。用户明确限定验证范围时按其要求执行，说明未覆盖项，不声称全量通过。
- 页面与交互变更必须做实际浏览器验收，构建通过不能代替视觉检查。报告实际运行的检查、结果及未验证内容。
- 不主动 commit、push、发布或修改生产数据；需要用户明确授权。架构或规范变化同步更新对应权威文件，不再新增一份平行指南。
