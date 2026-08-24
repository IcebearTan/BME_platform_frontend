---
name: bme-flask-restart-trap
description: 3DFarm/BME Flask 后端重启坑——TaskStop 杀父进程但 Flask 子进程残留，端口占用 + 旧代码继续生效
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7211f323-f79b-4f68-9803-c1aad7fe5096
  modified: 2026-07-31T15:49:02.619Z
---

> ⚠️ **坑本身两机通用**(TaskStop 杀父不杀子),但文中清理命令是 **Windows PowerShell** 写法;Mac 侧用 `lsof -i :<端口>` 查 PID 后 `kill`。

3DFarm（BME 同栈）后端 `app.py` 用 `app.run()` 启动（无 debug/reload）。Claude 后台重启后端用 TaskStop 杀 task，但 **TaskStop 只杀父进程，Flask 实际监听端口的子进程残留**，导致：
1. 新后端起不来（端口被占，strictPort 报错或静默失败）
2. curl 命中残留旧进程 → 跑旧代码/旧 `__pycache__`，新改动不生效（表现为仍返回 TODO 占位等）

**Why:** 2026-07-12 admin 前端冒烟时，`/admin/orders` 反复返回旧占位 `{"data":[],"message":"TODO: Phase 1"}`，admin.py 磁盘已完整、清 `__pycache__` 也没用——根因是 5002 上跑着残留旧后端 PID 52180（之前 TaskStop 没杀干净的 Flask 子进程）。

**How to apply:** 重启后端（改了后端代码、要确认新代码生效时）按这三步：
1. TaskStop 当前后端 task
2. PowerShell 查端口占用进程并杀干净：
   ```powershell
   Get-NetTCPConnection -LocalPort 5002 -State Listen -EA SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
   ```
3. 确认 5002 free 后再起新后端
顺手清 `__pycache__`（`find backend -type d -name __pycache__ -exec rm -rf {} +`）防 `.pyc` 缓存，但残留进程是主因。

关联：[[bme-3dfarm-project]] [[bme-local-dev-env]]
