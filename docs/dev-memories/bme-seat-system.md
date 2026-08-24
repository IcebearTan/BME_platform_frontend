---
name: bme-seat-system
description: BME 座位系统的业务模型（固定座位制）、看板与打卡的关联机制、生产初始化方式
metadata: 
  node_type: memory
  type: project
  originSessionId: e6477ec9-f71e-4450-be36-eb8d76f48766
---

BME 学习中心座位系统（后端 `blueprints/seat.py` + 前端 `Room106Map.vue`）。相关本地服务配置见 [[bme-local-dev-env]]。

**业务模型：固定座位制**（2026-07-08 用户确认，不要改成实时入座制）
- 座位通过 `SeatModel.bound_user_id` 预绑定给特定用户（一人一座，字段 unique）
- 看板反映的是"该座位归属人现在的打卡状态"，**不是**"座位现在有没有人物理坐上去"

**占用判定链路**（`blueprints/seat.py`）：
1. `_occupied_user_ids()`：查所有 `CheckRecord.check_out IS NULL` 的 user_id（当前在打卡学习的人）
2. `room_seats()`：对每个座位 `occupied = seat.bound_user_id ∈ 打卡集合`
3. 前端三种状态：绑定+打卡中 → "学习中"(占用色)；绑定+未打卡 → "未打卡"(空闲色)；未绑定 → "未分配"(空位色)

**关键：CheckRecord 不记录座位** —— `models.py` 里 `CheckRecord` 只有 `user_id/check_in/check_out/duration/date`，**没有 seat_id**。占用靠"绑定关系 + 打卡状态"间接推断。所以看板"在线人数" = 打卡中的绑定用户数，可能 ≠ 肉眼实际占座数。若未来要升级为"实时入座制"（打卡选座、谁坐哪亮哪），需给 CheckRecord 加 seat_id + 打卡接口传座位 + 看板按 seat_id 查。

**表结构**：`study_room`(id/name/description) + `seat`(id/room_id/label/bound_user_id)。106 房间 40 座（八角形分组 A/B/C/D/E × 1-8）。

**生产初始化**：用 `init_seats.py`（入库、幂等、数据驱动；加房间改顶部 `ROOMS` 字典）。**绝不跑 `seed.py`**（含测试账号 admin/admin123、张三等，会污染生产库）。
