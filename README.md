# BME_platform_frontend

BME 平台前端 monorepo（pnpm workspace），由 `BME_frontend`（用户端）与 `BME_backend`（admin 管理端）两仓于 2026-08 合并而来，完整保留两仓 git 历史。

开发前阅读 [AGENTS.md](AGENTS.md)、[团队协作约定](CONTRIBUTING.md) 与 [规范索引](docs/README.md)。

## 结构

```
apps/
  user/    用户端（原 BME_frontend），dev 端口 8081，base /AMEII/
  admin/   管理端（原 BME_backend），dev 端口 5173，base /admin/
packages/  共享包（清债阶段填充：@bme/styles、@bme/dew-ui、@bme/api、@bme/editor）
```

## 常用命令

```bash
pnpm install          # 全 workspace 安装
pnpm dev:user         # 用户端（http://localhost:8081/AMEII/）
pnpm dev:admin        # 管理端（http://localhost:5173/admin/）
pnpm dev:all          # 两端同开
pnpm dev:preview      # 两端 + 5002 临时预览 API（仅演示数据）
pnpm build            # 两端构建
pnpm test:e2e         # 独立测试端口 18081/15173 + 预览 API 契约检查
pnpm check:no-emoji   # 检查生产源码中是否新增 emoji
```

注意：一律通过根 scripts 或进入对应 `apps/*` 目录运行命令；不要在仓库根目录直接跑 `npx vite`（app 的 vite.config 依赖 cwd 读取各自 package.json 注入 `__APP_VERSION__`）。

## 环境变量

`.env.development` 被 gitignore（两 app 各一份，内容：`VITE_API_BASE_URL=http://127.0.0.1:5001`，指向本地 BME_platform_flask）。新 clone 后需手动创建：

```bash
echo "VITE_API_BASE_URL=http://127.0.0.1:5001" > apps/user/.env.development
echo "VITE_API_BASE_URL=http://127.0.0.1:5001" > apps/admin/.env.development
```

`apps/user/.env.example` 有参考模板。

需要使用临时演示数据时运行 `pnpm dev:preview`。该模式通过 `.env.preview` 明确指向
`5002`，不得把 `.env.development` 改到预览 API；真实开发始终使用 `5001`。
Playwright 使用 `.env.test` 和独立端口，不会复用正在操作的开发/预览页面。

## 开发测试账号

本地开发库（BME_platform_flask 的 dev MySQL）固定测试账号，密码统一 `12345678`：

| 用途 | 账号 | 角色 |
| --- | --- | --- |
| 管理端·超管 | `admin@seed.dev` | super_admin |
| 管理端·老师视角 | `teacher@seed.dev` | super_admin（admin_tag=teacher） |
| 用户端·学员 | `stu1@seed.dev` ~ `stu4@seed.dev` | user |

dev server 下两端登录页有「测试账号面板」入口（仅 dev 构建显示），进入独立面板页
（`/dev/accounts`）：账号按角色分组（超管/老师/导生/学员），每个账号一张卡片
（昵称 + 邮箱 + 角色色标），支持搜索过滤，点击卡片即以约定密码登录并跳转首页。
面板页与路由由 `import.meta.env.DEV` 门控，**生产构建中页面与路由不存在、凭据零
泄漏**；数据端点 `GET /auth/dev_accounts` 由后端 debug 模式 / `DEV_TEST_ACCOUNTS=on`
门禁，生产一律 404。营期老师预览账号见 stu4（camp84 owner）。

## Windows 开发机

合并后请重新 clone 本仓库（旧两仓已封存）：

1. 安装 pnpm：`npm i -g pnpm`
2. Node 版本 ≥ 18（nvm-windows 不会自动读 .nvmrc，需手动切换）
3. 按「环境变量」一节手动创建 `.env.development`
4. `pnpm install` 后 `pnpm dev:user` / `pnpm dev:admin`

## 社区标签与阅读周整合

前后端须成套整合。后端先执行 `migrate_82_community_reading.py`、`migrate_83_community_discovery.py`，操作说明见后端 `docs/deploy/community-reading.md`。管理端「社区标签」维护专题与书单；帖子治理中的精选操作控制右栏前三个位置。普通社区文案保持通用，阅读标签才显示书名配图要求和建议字数。

正文、评论和回复共用 DewUI 表情选择器，原生 Unicode 内容随文字保存，不请求外网资源。不同操作系统的表情外观可能不同；系统界面图标仍使用图标库。热帖采用滚动 24 小时互动、15 分钟缓存，不需要每五小时运行任务。

隔离真实接口测试使用同级 `backend` 目录，也可用 `READING_BACKEND_DIR`、`READING_PYTHON` 指定后端与 Python。安装后端 `requirements-reading-local.txt` 后，构建测试资源（两端 `VITE_API_BASE_URL=http://127.0.0.1:5003`）：

```sh
pnpm --filter @bme/user exec vite build --outDir dist-reading
pnpm --filter @bme/admin exec vite build --outDir dist-reading
pnpm exec playwright test -c e2e/playwright.reading.config.ts
```

测试自动启动独立 SQLite / fakeredis API，使用 5003、18093、15193 端口；截图和报告写入忽略的 `test-results/`，数据库写入后端忽略的 `data/reading-local/`。不要把测试构建部署到线上。常规验证：`pnpm check:no-emoji`、`pnpm build`、`pnpm test:e2e e2e/community-redesign.spec.js`。

## 分支

- `master` — 生产发布主线；实际运行版本以部署提交记录为准。本次未移动旧 master，首次按新流程发布前先核对生产基线。
- `develop` — 团队开发集成、共享测试的来源；初始指向 2026-11-02 最新已提交维护线，不表示已经部署测试环境。
- `Icebear` — Icebear 的可选个人分支，替代 `Icebear_develop`；其他贡献者分支由本人管理。
- `feature/*` — 功能或阶段任务；AI 日程、营期现有工作分支保留。
- `release/<版本号>` — 每个版本候选与发布留存，发布后冻结。
- `hotfix/*` — 服务器现场修复；本次 Icebear 维护工作区检出为 `hotfix/server-maintenance`，保留原工作内容；其他贡献者不必切入。远端 `codex/server-maintenance` 暂留给现有协作，不自动退役。

开发、发布、hotfix 回流、个人规则与分支清理统一见 [CONTRIBUTING.md](CONTRIBUTING.md)。不自动同步 master 或部署；已有同事分支保持原状，本地分支、远端分支和失效跟踪引用分别管理。

（2026-08 清债批次 1–6 历史为线性提交，全部包含于 master；原 debt/N-* 中间分支与 legacy/admin-master 存档线已清理，后者头部提交为 86b48b9，如需找回见本地 reflog。）

## 反馈工单

全站反馈入口、自动页面快照、补充图片与管理员处理流程见 [反馈工单说明](docs/反馈工单-接口与流程.md)。保留原有绿色发光与悬停表情交互；需配套兼容后端，无新增数据库迁移，发布时先后端再前端。

## 独立项目

独立项目入口为 `/my-projects`，项目工作区为 `/project-workspace/:projectId`，长期团队、D0及研发日历跨营期保留。营期按显式关联组合项目，本期考核与积分仍沿用营期范围。配套后端需先执行迁移79，再按灰度范围开启 `PROJECT_CORE_ENABLED`。实现约束见 `docs/ARCHITECTURE.md` 的项目营交付契约；本次只执行独立项目、原工作区及相关看板/交付专项检查。

## 积分功能

用户端 `/user-center/points` 提供余额、平台常驻获取途径和已到账收支；
每日打卡、发布帖子未配置奖励时显示待开放。营期任务与发放进度移至 `/camp?sid=&tab=points`。
管理端 `/operations/points` 管理规则、审核及异常，营期老师/导生在各自营期工作台处理提报与审核。
页面复用 DewUI，说明使用问号提示。商城消费明细暂从商城入口查看。
后端需迁移 78 并配置 `POINTS_REWARDS_ENABLED` 后才启用奖励规则与发放。

## 项目工作台功能引导

项目营和独立项目工作台提供首次使用提示与顶栏“功能引导”入口。导览按当前可见栏目及身份
介绍功能，支持跳过、重看、手机和深浅色主题；完成或关闭状态按浏览器中的当前账号记忆。
导览不切换栏目或提交业务数据，退出后恢复原来的工作位置。

专项检查：启动后端隔离预览 API 5016 和用户端 18096 后，运行
`pnpm exec playwright test -c e2e/playwright.project-guide.config.ts`。这是用户端静态更新，
不需要数据库迁移、后端更新或新增环境配置。
