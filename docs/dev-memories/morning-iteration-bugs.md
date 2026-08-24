---
name: morning-iteration-bugs
description: 2026-07-12 晨迭代实测发现的 bug（已 commit+push 066bd23）
metadata: 
  node_type: memory
  type: project
  originSessionId: 4dd4981a-b083-41b7-a2f8-da3b4a84b21c
---

2026-07-12 拉取晨迭代（Phase 1→4.5）后起环境时发现并修的 bug，**已 commit + push 到 origin/master（commit 066bd23）**。重构方案另见 [[order-dispatch-refactor-plan]] 和 repo 内 `docs/重构方案-订单与下发流.md`。

修的 bug：
1. `requirements.txt` 缺 `cryptography` → MySQL 8 `caching_sha2_password` 认证失败。已补。
2. **迁移与模型 drift**：`PrinterModel.source` 等字段模型有、迁移没建。实测用 `db.drop_all()+db.create_all()` 从模型重建绕过。根因是迁移没跟上 model，应补迁移（仍欠债）。
3. `celery_app.py`：`celery.conf.update(flask_app.config)` 混用大小写 key → celery 5.x `ImproperlyConfigured`。已删该行。
4. `celery_app.py`：Celery() 缺 `include=["tasks.poller","tasks.dispatch"]` → task 不注册 → `Received unregistered task`。已加。
5. `tasks/poller.py`：`_do_sync_printers` 从 `/printers/` 列表读 status（列表无此字段）→ 真机永远 offline。已改调 `/printers/{id}/status`。
6. `tasks/poller.py`：字段名 `mc_percent` 实测是 `progress`；`remaining_time` 单位是分钟不是秒。已加 fallback + 单位换算。完成态映射尚未对照真机完成打印验证。
7. `tasks/dispatch.py`：双击下发不幂等，堆重复队列项。已加 `job.bambuddy_queue_id` 守卫。
8. `printers.yaml`：P1S-01 填 `bambuddy_printer_id=1` + `source: real`（Poller 按 source 匹配）。
9. `PrintersView.vue`：`status_detail` 原始 JSON 摊开改为精选渲染（进度条/温度/AMS 色块）+ 时间单位修复。

相关：[[dev-mac-env]] [[bambuddy-real-printer]] [[order-dispatch-refactor-plan]]
