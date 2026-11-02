# BME 前端规范索引

维护日期：2026-11-02。此目录维护随前端仓库分发的现行规格；计划、运行记录与审查结果仍放工作区 `../docs/`。

## 固定入口与职责

| 文档 | 负责什么 | 什么时候读 |
| --- | --- | --- |
| [AGENTS.md](../AGENTS.md) | Codex / Claude 等助手的阅读顺序、开发红线、交付要求 | 每项任务 |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | 所有贡献者的分支、发布、hotfix 回流与公共/个人规则边界 | 每项任务与交付 |
| [运行说明](../README.md) | workspace、环境、命令、开发入口 | 启动与验证前 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 双端依赖、分层、路由、会话、领域边界 | 改代码前 |
| [API-CONTRACT.md](standards/API-CONTRACT.md) | 请求分层、响应解包、错误、权限、竞态、上传下载 | 改接口与数据流 |
| [UI-DESIGN.md](standards/UI-DESIGN.md) | DewUI、tokens、页面结构、主题、响应式与交互状态 | 改界面与样式 |
| [QUALITY.md](standards/QUALITY.md) | 验证范围、测试环境、视觉验收矩阵、完成标准 | 开始时确定、交付前核验 |
| [加载态与骨架规范](加载态与骨架规范.md) | DewSkeleton / DewImage 与分层加载反馈 | 涉及异步数据和图片 |
| [DewUI 组件说明](../packages/dew-ui/README.md) | 公共组件用法；实际 API 以对应组件声明与导出为准 | 选择或修改组件 |

接口契约描述开发纪律，**不是后端全量端点目录**。具体 URL、字段、状态与权限仍须核对各 app 服务层和后端实现。

## 领域规格与代码入口

| 领域 | 规格与边界 | 优先对照的代码 |
| --- | --- | --- |
| 营期、培训小组、双身份 | [营期 IA](营期模块-设计与IA规范.md) 的现行口径、[营期重构](营期升级重构-设计方案.md)、架构 §6/§7 及后续领域补充；历史布局不覆盖现行口径 | `apps/user/src/views/CampView.vue`、`services/campService.js`、admin `domains/camps/` |
| 独立项目与项目营工作区 | 架构 §7 项目营交付契约 | user `domains/projects/`、`components/Camp/ProjectWorkspaceShell.vue` |
| 管理端导航与管理页 | 架构 §7.1–§7.3 | admin `router/manifest.js`、`app/navigation/`、`styles/pages.css` |
| XLAB 项目广场 | 架构 §4.6 的局部主题与导航约定 | user `views/ProjectSquareView.vue`、`styles/xlab.css` |
| 积分 | 架构末尾积分补充与 UI 规范局部主题约定 | user `services/pointsService.js`、`styles/points.css` |
| 反馈工单 | [接口与处理流程](反馈工单-接口与流程.md) | user 全局 `FeedbackBubble`、admin `domains/feedback/` |
| 首页 banner | [运营规范](首页banner-运营规范.md) | user 首页相关组件和 admin banner 管理 |
| 独立工作台入口 | 架构末尾“独立工作台入口”契约；内部工作台本体在兄弟仓库 | user `composables/useWorkAccess.js`、`views/WorkbenchAuthorizeView.vue` |

表内缩略路径均相对 `apps/<对应端>/src/`；不代表跨端可互相导入业务代码。

## 旧资料如何使用

- `.claude/skills/bme-admin-page`、`bme-dewui`、`bme-e2e` 是既有 Claude 流程适配，便于查模板；不是另一套规范。部分示例和用例数量来自旧版本，先按本索引核对。
- `.claude/skills/web-design-engineer` 是通用设计参考；BME 继续使用 Vue、系统字体、自托管资源和 DewUI，不默认引入 React/CDN/独立品牌方案或调参面板。
- 本机 `.claude/skills/bme-browse` 不随仓库分发，包含过时的角色与会话注入示例；当前会话验证参照 `e2e/auth-foundation.spec.js`，真实联调走正常登录流程。
- `apps/user/docs/`、`apps/admin/docs/` 内旧审查/重构文档以及工作区开发记忆用于追溯；不要使用旧 `components/ui/tokens.css`、裸 `token` 键、四级全局角色或旧仓库安装步骤。
- 架构和领域文档中的日期补充，只有业务契约在适用领域内持续有效；“本轮测试”“本次发布”等执行记录不是永久验收要求。统一验收看 QUALITY。

## 维护方式

1. 工作流改 `AGENTS.md`；架构边界改 `ARCHITECTURE.md`；接口、视觉、质量分别改对应 standards 文件；领域特殊规则留在领域规格并注明作用范围。
2. 新增规则写明适用场景、代码入口、检查办法；区分“当前实现”“新增开发要求”“历史债务”。规范提出要求不等于旧页面已全部达标。
3. 新规格在本索引登记并检查 `.gitignore`，确保新 clone 可获得；不要让强制规则仅存在于个人记忆或本机文档。
4. 修改规则后同步相关入口与模板引用；历史背景保留原日期，不再复制一份继续维护。
