---
name: bambuddy-real-printer
description: 接入的真打印机信息（P1S、bambuddy id、有 AMS）
metadata: 
  node_type: memory
  type: project
  originSessionId: 4dd4981a-b083-41b7-a2f8-da3b4a84b21c
  modified: 2026-07-30T06:03:03.541Z
---

Phase 0 已实测通过：局域网真打印机已接入 Bambuddy 并成功打印过。

- Bambuddy 里打印机 **id=1**，name `测试打印机`，型号 **P1S**
- SN **`01P00C5A2200910`**，IP **`192.168.1.101`**，access_code **`163be704`**（2026-07-30 在 110 上重配 bambuddy 时现场确认；旧值 `01P00C540301358`/`4e1fb292`/`192.168.11.103` 全废弃）
- **bambuddy 已部署到 110**（Docker Desktop + `maziggy/bambuddy:latest` 容器，8000:8000，已 healthy）。打印机 id=1、name `P1S-01`，`GET /api/v1/printers/1/status` 返回 connected=true、温度、AMS 数据（有 AMS）。注意校园网挡 ghcr.io/GitHub(403)，镜像用 Docker Hub 的 `maziggy/bambuddy`，别用 compose 里的 ghcr 地址。
- 打印机与桥头堡主机 [[lan-windows-host-110]]（192.168.1.110）同在 `192.168.1.0/24`。该 LAN 由路由器A（WAN=172.25.56.19）接入校园网；后端/农场服务器在 `172.25.56.83`（.83:80 开放，5002 没开，webhook 端点 `/internal/webhooks/bambuddy/*` 当前从校园网不可达）。跨网方案:路由器A 端口转发(WAN:port→192.168.1.110:8000，源IP白名单 .83)+ bambuddy webhook 出站到 .83。
- **有 AMS**（`/printers/1/status` 返回 ams 数组）→ `printers.yaml` 的 `has_ams` 可改 true
- Bambuddy **未开 auth**，`BAMBUDDY_API_KEY` 留空即可

业务侧 `printers.yaml`：P1S-01 已填 `bambuddy_printer_id: 1` + `source: real`，enabled。其余 P1S-02~07 占位未启用。

Bambuddy `/api/v1/printers/` 列表只含元数据、**不含实时 status**；实时状态（state/progress/温度/AMS）在 `/api/v1/printers/{id}/status`。

相关：[[dev-mac-env]] [[morning-iteration-bugs]]
