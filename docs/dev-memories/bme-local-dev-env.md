---
name: bme-local-dev-env
description: BME 平台本地开发环境关键事实（三仓库端口分工、MySQL 3300、Redis 无密码、Windows 兼容坑），启动/调试后端时参考
metadata: 
  node_type: memory
  type: project
  originSessionId: e6477ec9-f71e-4450-be36-eb8d76f48766
  modified: 2026-07-31T15:48:59.745Z
---

> ⚠️ **适用环境:Windows 开发机**(路径 `D:\My Projects\Education_platform`、用户名 61494)——本文件的端口/命令(.venv\Scripts、PowerShell)以 Windows 为准;Mac 侧环境见 [[dev-mac-env]]。

BME 教育平台本地开发环境（Windows），2026-07-07 摸清：

**三个仓库**（都在 `d:/My Projects/Education_platform/`）：
- `BME_platform_flask` — Flask 后端，跑在 **5001**（[app.py:65](BME_platform_flask/app.py#L65)，云端新版从 5000 改的；旧版是 5000）
- `BME_frontend` — 面向用户的前端，Vite 端口 **8081**
- `BME_backend` — admin 后台前端（名字叫 backend 但其实是 Vue 前端），Vite 端口 **5173**，`base: "/admin/"`

**后端分支工作流**：BME_platform_flask 的日常开发在 `Icebear_develop` 分支进行，**上线前才 merge 到 `develop` 主分支**。所以后端改动一律基于 `Icebear_develop`（当前已含 develop 主线最新 + 本地修复，领先 origin/Icebear_develop 29 个提交，待 push）。

**本地服务**（与云端默认值不同，靠 `.env` 适配）：
- MySQL 在 **3300**（非默认 3306），库 `sysu_bme`，root/root。`.env` 设 `DB_PORT=3300`；[config.py](BME_platform_flask/config.py) 默认 3306 但 `PORT` 从 env 读
- Redis 在 6379，**无密码**。`.env` 设 `REDIS_URL=redis://localhost:6379/0`（注意 exts.py 的 limiter 硬编码无密码，两边一致）

**前端 API 地址**：两个前端 `.env.development` 都配 `VITE_API_BASE_URL=http://127.0.0.1:5001`（BME_frontend 的被 gitignore；BME_backend 的被 tracked）

**Windows 兼容性**（云端代码假设 Mac/Unix，这些坑已在本地修过）：
- [attendance_report.py](BME_platform_flask/blueprints/attendance_report.py) 的 `fcntl` 改成 try/except 容错（Windows 无 fcntl）；`ensure_recipient_permission` 的 try/except 已移进 `with app.app_context()` 内（原来在外层导致 rollback 时 context 已销毁）
- [pyproject.toml](BME_platform_flask/pyproject.toml) 依赖从 `dotenv` 改为 `python-dotenv`（原包名错误，config.py 用 `from dotenv import load_dotenv`）

**座位功能**：106 房间 40 个座位（八角形 A/B/C/D/E × 1-8），表 `study_room` + `seat`。业务模型是**固定座位制**（看板反映绑定用户的打卡状态，详见 [[bme-seat-system]]）。接口 `GET /seat/rooms/<name>/seats`（需 JWT）。生产初始化用 `init_seats.py`（入库、幂等），**不要跑 `seed.py`**

**打卡功能开发测试**：人脸识别不在后端做，`/face_check` 只校验 `token == FACE_SECRET`（见 [codecheck.py](BME_platform_flask/blueprints/codecheck.py)），开发环境不需要真的人脸。用 `dev_test_checkin.py`（gitignored，匹配 `dev_*.py`）走真实 HTTP 接口模拟：`python dev_test_checkin.py [email] in`（绑座+签到，去前端看座位亮起）/ `python dev_test_checkin.py [email] out`（签退）。本地 `FACE_SECRET` 为空串，脚本传空串即可匹配。前置：Flask 跑在 5001、106 座位已初始化。

**schema 管理**：本项目**没有 Alembic / migrations 目录**（`alembic_version` 表是遗留）。实际用 `db.create_all()`（仅在 `seed.py` 里调用，建**新表**）+ **直接 `ALTER TABLE`**（给既有表加列）管理 schema。模型加新表 → 跑一次 create_all（seed 或独立脚本，注意 seed 会顺带塞测试用户）；模型给既有表加列 → 直接 ALTER（参见 `user.password` varchar(100)→(255) 漂移致登录 500 的事件）。**不要假设有迁移工具，也不要等 Alembic**。

**启动后端**（用 uv 管理的 `.venv`，无 pip，装包用 `uv pip install`）：
```powershell
cd BME_platform_flask
$env:PYTHONIOENCODING="utf-8"   # 避免中文日志在 GBK 控制台报 UnicodeEncodeError
.\.venv\Scripts\python.exe app.py
```
