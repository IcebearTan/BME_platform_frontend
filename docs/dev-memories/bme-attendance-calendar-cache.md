---
name: bme-attendance-calendar-cache
description: 出勤日历缓存策略：个人/records/yearly已去缓存(实时)；全员admin_records/top10/weekly保留1h缓存但key补时间维度+打卡时invalidate_check_aggregate_cache主动失效
metadata: 
  node_type: memory
  type: project
  originSessionId: 3ca3ae20-7d79-4820-8aaf-ccb920d8982d
  modified: 2026-07-28T05:46:32.409Z
---

BME 出勤日历（贡献热力图，`BME_frontend/src/components/User/CalendarComponent.vue`，挂在 `/user`）后端为 `GET /records/yearly`（`BME_platform_flask/blueprints/codecheck.py: get_yearly_records`）。

**2026-07-28 改造后的缓存策略**（区分轻重接口，不要一刀切）：

- **个人维度 `/records/yearly`：已去掉 Redis 缓存**。原因：只查单用户当年 check_record（几百~两千行、date 有索引、毫秒级），原本的 1h 缓存收益小却导致"刚打卡最长 1h 才显示"。去缓存后每次请求直查 DB，完全实时。前端 CalendarComponent onMounted 拉一次、且 App.vue 无 keep-alive，每次进 `/user` 天然刷新——所以前端不用改。
- **全员聚合接口（重查询，保留 1h 缓存）**：`/admin_records`、`/records_top10`、`/weekly_records`。它们的 cache_key **补了时间维度**：`annual_check_records_cache:{year}`、`check_records_top10:{year}-{month}`、`weekly_check_records_cache:{iso_year}-W{iso_week:02d}`（修掉原 key 无维度导致跨月/跨周串味）。
- **主动失效**：`codecheck.py` 顶层 `invalidate_check_aggregate_cache()` 删上述 3 个当前周期 key；在 `check_in_out`(POST /check) 和 `face_check`(POST /face_check) 的 `db.session.commit()` 之后调用（签到+签退都失效）。
- **复合索引**：`check_record` 加了 `(user_id, date)` 即 `ix_check_record_user_date`，覆盖全仓库最高频 `WHERE user_id=? AND date BETWEEN ?`。靠 `scripts/migrate/migrate_06_check_record_indexes.py` 幂等建出（app.py 启动不跑 create_all/flask db upgrade，见 [[python-uv-toolchain]]）。

**Why**：当初"全年查询怕爆内存"是误判——个人接口本就毫秒级；真重的是全员聚合。

**How to apply**：以后动出勤/缓存相关，记得 (1) 个人接口别加缓存（要实时）；(2) 全员接口 key 必须带时间维度且在打卡点失效；(3) 新增任何写 check_record 的接口都要调 invalidate_check_aggregate_cache()。打卡 UI 缺失见 [[bme-no-checkin-ui]]。
