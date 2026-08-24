---
name: claude-memory-sync-plan
description: 跨机 Claude Code 记忆同步方案(讨论中)——Windows 开发机非 110、近期不同局域网、路径待查
metadata: 
  node_type: memory
  type: project
  originSessionId: 52e208f4-aa5b-43f8-86bf-8100b4eae5a7
  modified: 2026-07-31T16:22:24.083Z
---

2026-07-31 与用户讨论「Mac ↔ Windows 开发机 Claude Code 记忆同步」的初步方案。目标:让 auto-memory(~/.claude/projects/<slug>/memory/)和 settings.json 在两台机器间同步,实现无缝切换开发。

**关键事实与约束:**
- **Claude 自身配置(user 级 settings.json/config.json)不纳入同步**——用户用 **ccswitch** 管理 API key/模型等,迁移包里的 user-dot-claude 已忽略。
- 那台 Windows 开发机**不是** 192.168.1.110(110 是另一台局域网机器,与本次无关)。
- 近期两台机器**不在同一局域网、互不可达** → SSH/rsync 直连方案排除。
- Windows 上 Claude Code 的项目路径未知,待开机后查询;slug 按「绝对路径每个非字母数字字符→`-`」推算。
- Mac 侧 slug:`-Users-icebear----BME-platform`,memory/ 约 80K(16 个 md + MEMORY.md)。
- `~/.claude/settings.json` 含 DeepSeek API key(ANTHROPIC_AUTH_TOKEN)和模型路由配置,是同步刚需但也是隐私点——云盘/git 方案建议排除它或只放私有仓。

**候选方案(推荐排序):**
1. Syncthing 跨公网双向同步(推荐):无账号、端到端加密、NAT 打洞+中继回退、实时自动;两端本地路径可不同,天然解决 slug 不一致。
2. git 私有仓库 + SessionStart/SessionEnd hook 自动 pull/push:有版本历史;需两端 git 身份+私仓访问(GitHub 或 Gitee)。
3. 云盘(坚果云/OneDrive)+ 符号链接/junction:最省事,但数据经第三方,API key 不建议上云。

**通用设计点(与机制无关):**
- 同步「内容」而非整目录:只同步 memory/ + settings.json,不含 transcripts/telemetry。
- 首次启动同步前先做双向 diff 合并(两边可能各有对方没有的记忆),再开自动同步。
- 用户一次只用一台机器,冲突概率低。

**2026-07-31 首次导入完成:** Windows 侧已打包 `claude-migration-package.zip`(在 Mac 项目根目录),27 个记忆文件已并入本机 memory/(本索引已更新,进度类标 `[进度]` 待核对)。Windows 机器信息确认:用户名 **61494**、项目路径 `D:\My Projects\Education_platform`、slug `D--My-Projects-Education-platform`。导入的准则记忆(禁自动 commit、提方案别擅自执行)Mac 同样适用。Windows 的 `user-dot-claude/settings.json` 与 Mac 配置同构但 key 不同(`sk-0a35...`),**未覆盖 Mac 配置**;其 `BME_backend/settings.local.json` 权限规则为 Windows 路径,未拷贝。

**代码进度(不在此次范围,README 提及待用户决定拉取):** BME_3DFarm 新分支 `feat/bambuddy-prod-test-infra`(2026-07-31,打通生产测试方案);未推送:`BME_frontend` develop +3、`BME_platform_flask` Icebear_develop +3、bambuddy 仓库 docs/bambuddy_customer_platform_architecture.md 未跟踪。

**2026-08-01 代码已拉取(用户授权):** 3DFarm 切到 `feat/bambuddy-prod-test-infra`(30610ae);frontend/backend develop 已同步;flask 已切到 `Icebear_develop`(9e4601f,Windows 侧工作)。GitHub HTTPS 直连不通,已全局 insteadOf 映射 SSH。checkin 分支为历史遗留,不管。

**2026-08-01 本地开发环境已就绪:** flask 本地 `sysu_bme` 完成 migrate_01~06 + init_seats(备份 /tmp/sysu_bme_backup_20260801.sql;role 列、7 营期表、40 座、17 权限全验证);3DFarm docker 容器(bme_3dfarm-mysql-1/redis-1/minio-1/bambuddy)已启动,`bme_3dfarm` 库已补 notification 表(seed_pricing create_all)+ print_order.fail_reason/completion_note(手动 ALTER)。Mac compose 无 orca-slicer-api 服务且代码无引用,不需要。3DFarm canary 定时部署(记忆待办)Mac 侧未做。

**待办:** Windows 端对应 slug 目录尚未并入(等 Windows 侧执行导入仪式时合并)→ 写 Mac 导出/Windows 导入脚本。
