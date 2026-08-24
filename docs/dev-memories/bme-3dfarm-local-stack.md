---
name: bme-3dfarm-local-stack
description: 3DFarm 本地全栈怎么起——Bambuddy/MinIO/orca 是 Docker 容器、Celery on Windows 的 --pool=solo 坑、Bambuddy 本地无 API key、VP 停止 404 是本地虚拟机特有非 bug
metadata: 
  node_type: memory
  type: project
  originSessionId: 9bd33568-6eb1-4f28-bdbe-ff2127d45e87
  modified: 2026-07-31T15:49:05.771Z
---

> ⚠️ **适用环境:Windows 开发机**（`D:\My Projects\Education_platform`）——Docker Desktop/.venv\Scripts/PowerShell 命令以 Windows 为准;Mac 侧环境见 [[dev-mac-env]]。

3DFarm 本地开发全栈（`D:\My Projects\Education_platform\BME_3DFarm`）的启动方式与坑（2026-07-30 实测）：

**服务分工**
- Flask 后端 5002、customer 前端 5180(`/3dfarm/`)、admin 前端 5181(`/3dfarm/admin/`)：都用本地 venv / npm 起，**不走 Docker**。
  - 后端：`cd backend && .venv/Scripts/python.exe app.py`
  - 前端：`cd frontend/{customer,admin} && npm run dev`
- MySQL 复用 BME 的 **3300**（库 `bme_3dfarm`，root/root）、Redis 6379。
- **Bambuddy(8000) + MinIO(9000) + orca-slicer-api(3003) 是 Docker 容器**（`docker ps -a` 可见容器名 `bambuddy` / `3dfarm-minio` / `orca-slicer-api`）。Docker Desktop 必须先开——daemon 起来要 1-2 分钟，`\\.\pipe\dockerDesktopLinuxEngine` 命名管道出现即就绪。DD 重启后这些容器会 `Exited (255)`，`docker start bambuddy 3dfarm-minio` 即可恢复（配置/数据在卷里）。

**Celery on Windows 坑**
- worker **必须** `--pool=solo`（默认 prefork 在 Windows 卡/崩）：
  `cd backend && .venv/Scripts/python.exe -m celery -A celery_app.celery worker --pool=solo --loglevel=info`
- beat 另起一个：`... -A celery_app.celery beat --loglevel=info`
- app 引用 = `celery_app.celery`；beat 每 30s 跑 `tasks.poller.sync_active_orders` / `sync_printers`（poller 会把陈旧打印机状态纠正成真值）。

**后端热加载 / 脚本传参坑**
- 后端 `app.py` 是 `app.run(host, port)` **无 debug=True**——没有 reloader，改 `.py` **不会热加载**，必须杀进程重启才生效（前端 Vue 有 Vite HMR 不用管）。重启见 [[bme-flask-restart-trap]]：`Get-NetTCPConnection -LocalPort 5002` 找 PID → `Stop-Process` 杀干净残留 `app.py` → 重新 `app.py`。
- PowerShell 给 `python -c "..."` 传含双引号的代码会**吃掉双引号**（`{id:2,tray_color:1E9BFF}` 报 SyntaxError）——改用 Bash 工具单引号包，或写临时 `.py` 文件再跑。

**Bambuddy 鉴权 / 虚拟打印机**
- 数据在容器 `/app/data/bambuddy.db`（SQLite+WAL）。`api_keys` 表本地为空 → **本地不用填 `BAMBUDDY_API_KEY`**，`/api/v1/printers`、`/api/v1/queue` 等端点开放（无 auth 也 200）。
- 本地 VP-P1S-01 是**虚拟打印机**（`virtual_printers` 表，不在 `printers` 表），所以 `POST /printers/{id}/print/stop` 本地 **404 "Printer not found"**——**这是本地特有现象，不是 bug**；生产真机在 `printers` 表里，停止功能用户已验证正常。排查停止 404 时别去改 adapter。
- Bambuddy 是**队列模型**：任务在 `/api/v1/queue/`，调度器 dispatch 给打印机。孤儿/卡住的队列项 `DELETE /api/v1/queue/{id}` 清掉即可。

**Why**：3DFarm 后端配置里 BAMBUDDY_API_KEY 留空、本地没真机，照搬生产思路会误判。
**How to apply**：下次起 3DFarm 全栈或排查"停止 404 / 打印机状态不刷新"时照此来。相关：[[bme-3dfarm-project]]、[[bme-3dfarm-schema-drift]]、[[bme-flask-restart-trap]]、[[python-uv-toolchain]]。
