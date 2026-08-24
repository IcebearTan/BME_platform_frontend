---
name: dev-mac-env
description: 这台 Mac 跑 BME_3DFarm 的环境约束（代理/端口/venv），启动前必看
metadata: 
  node_type: memory
  type: project
  originSessionId: 4dd4981a-b083-41b7-a2f8-da3b4a84b21c
  modified: 2026-07-31T16:01:35.158Z
---

在 `/Users/icebear/开发/BME_platform/BME_3DFarm`（原 `/Users/icebear/开发/BME_3DFarm`，2026-07-29 迁入 BME_platform 归档；macOS APFS 大小写不敏感，`bme_3dfarm` 是同一目录）。

**网络（关键）**：本机有代理 app，系统代理 `127.0.0.1:443`。**Docker Hub / ghcr.io 直连不通**，必须开代理 app 的 **TUN 模式**（IP 层接管，Docker 虚拟机流量才走得通）才能 `docker pull`。Docker Desktop 不走 macOS 系统代理，光开系统代理不够。daocloud 等 mirror 也被 reset，别浪费时间。另外 **GitHub HTTPS 直连不通**（2026-08-01 实测 curl HTTP 000），git 已全局配置 `url."git@github.com:".insteadOf "https://github.com/"` 自动改写为 SSH（SSH 正常，已验证），BME_3DFarm 的 origin 也已从 HTTPS 切到 SSH。

**端口冲突**：宿主机 3306 被 **Homebrew 原生 MySQL 9.6**（`brew services` 跑的，别动）占用。Docker mysql 走 `docker-compose.override.yml` 的 `ports: !override ["3307:3306"]` 映射到 3307，`backend/.env` 的 `DB_PORT=3307` 同步。改回 3306 会冲突。

**Python**：系统 python 3.9 太旧，用 `uv venv --python 3.12`（uv 已装于 /opt/homebrew/bin/uv）。venv 在 `backend/.venv`，跑命令用 `.venv/bin/python` / `.venv/bin/celery`，且须 `cd backend`（dotenv 从 cwd 读 .env）。node v26 也已装。

**全套服务**：bambuddy(8000, docker) + mysql(3307,docker) + redis(6379,docker) + minio(9000/9001,docker) + backend(5002,venv 原生) + celery worker+beat(venv) + 前端 customer(5180)/admin(5181, npm run dev)。
Bambuddy→backend 的 webhook URL 必须用 `http://host.docker.internal:5002/...`（容器内 127.0.0.1 够不到宿主机）。

相关：[[bambuddy-real-printer]] [[morning-iteration-bugs]]
