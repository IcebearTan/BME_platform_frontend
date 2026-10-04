# BME_platform_frontend

BME 平台前端 monorepo（pnpm workspace），由 `BME_frontend`（用户端）与 `BME_backend`（admin 管理端）两仓于 2026-08 合并而来，完整保留两仓 git 历史。

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

## 分支

- `master` — 稳定主线
- `Icebear_develop` — 日常开发分支，稳定后合回 master

（2026-08 清债批次 1–6 历史为线性提交，全部包含于 master；原 debt/N-* 中间分支与 legacy/admin-master 存档线已清理，后者头部提交为 86b48b9，如需找回见本地 reflog。）
