---
name: bme-3dfarm-notifications
description: 3DFarm 站内通知系统——照搬 BME 系统 A 蓝本（扇出+is_read）、订单事件触发、两端 Tailwind 前端、DB schema 坑
metadata: 
  node_type: memory
  type: project
  originSessionId: 1d7ee4ca-f8c5-442e-971f-fa9f2c7f8e62
  modified: 2026-07-30T14:39:08.419Z
---

BME_3DFarm 站内通知系统（2026-07-30 落地）。三类需求：管理员公告、订单失败原因、订单成功后续（取件/发货）。后两者**外卖模式**——详情耦合订单（admin 填 fail_reason/completion_note），通知中心只放提醒卡片（点跳订单），订单是单一真相源。

**设计照搬 BME 训练营通知蓝本（系统 A）**：`BME_platform_flask/blueprints/notification.py` + `models.py` 的 `NotificationModel`。广播=写时扇出（每用户一行，无 broadcast 关联表，千级用户够）；已读=`is_read` 布尔挂行（每用户有自己的行，天然隔离）；业务点 `import create_notification()` 扇出。前端照搬 `BME_frontend` 的模块级单例 composable + 30s 轮询 + 乐观更新（`composables/useNotifications.js`）。

**3DFarm 实现**：
- 模型 `NotificationModel`（backend/models.py）：user_id / title / content / category(`system`|`order`) / source_type(`announcement`|`order_failed`|`order_completed`|`order_cancelled`|`order_refunded`) / source_id（订单=order_id）/ is_read；复合索引 `(user_id, is_read)`。
- 蓝图 `blueprints/notifications.py`：`create_notification` / `batch_create_notifications`（**只 add 不 commit**，由调用方同事务提交）+ 6 接口（list 带 unread_count / unread_count / mark_read / mark_all_read / delete 限删已读 / announce admin 发全员 customer 或指定）。
- 订单触发（admin.py）：`fail`（reason **必填**，写 fail_reason）、`complete`（completion_note 可选）、`cancel`（reason 可选）、`refund`（reason 可选）、**`delivery-note`**（补充交付说明，PRINT_COMPLETED/QC_PENDING/CLOSED 才允许——因 bambuddy 自动完成绕过 admin complete）——每个操作在 transition 同事务内 `create_notification`（失败回滚通知也回滚）。customer 自取消不发（自己操作）。**bambuddy 自动完成不发站内通知**（用户选择；仅保留既有邮件 mailer 现状）。
- 订单加 `fail_reason` / `completion_note`（Text），customer 和 admin 序列化都透出。
- customer 前端（Tailwind，非 BME DewUI）：api/notifications.js + composables/useNotifications.js（单例+30s 轮询）+ NotificationBell.vue（挂 AppHeader 右 cluster）+ NotificationsView.vue（/notifications，筛选+全部已读）+ OrderCard/OrdersView 展示 fail_reason/completion_note + 通知跳 `/orders?order=ID` 自动展开详情。
- admin 前端：AnnounceView.vue（/announce，全员/指定用户多选，复用 CreditGrantView 的搜索+chips 模式）+ OrdersView noteDialog（fail/cancel/delivery 走文本 Dialog，不再一键直发）+ amountDialog 加 note（complete/refund）+ AdminHeader 公告入口（Megaphone 图标）。

**DB 坑**：`notification` 表 `db.create_all()` 建（跑一次 `seed_pricing.py`，它含 create_all）；`print_order` 加 fail_reason/completion_note 两列要**手动 ALTER**（create_all 不给已存在表补列，见 [[bme-3dfarm-schema-drift]]）。dev 库 bme_3dfarm 已 ALTER。测试库每次 session drop+create 自动有新字段。

**关键取舍**：3DFarm 前端是 Tailwind + lucide-vue-next（非 BME_frontend 的 DewUI 玻璃），Bell/View **不能直接抄 BME** 的 DewPopover/el-icon/`<style scoped>`，要用 Tailwind 重写；但 composable 逻辑可照搬（改 api 入口 + 响应字段 `notifications`→`items`）。AnnounceView 没有抽取 UserMultiSelect 共享组件（CreditGrantView 已稳定提交，场景略异：发额度要余额、公告不要），各自内联多选。

**测试**：`tests/test_notifications.py`（8 例：公告扇出/指定/越权、list/unread/markread/delete、fail/complete+delivery/cancel/refund 触发）+ test_orders 回归（fail 调用要加 reason）。注意 conftest `_clean_tables` 要加 `NotificationModel` 清理（notification 外键引用 user，不清会导致跨测试 IntegrityError）。

相关：[[bme-3dfarm-project]]、[[bme-3dfarm-schema-drift]]、[[bme-reuse-over-rewrite]]。
