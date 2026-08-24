---
name: notification-system
description: 通知中心前后端统一方案：独立 notification 表、service/composable 架构、邮件推送
metadata: 
  node_type: memory
  type: project
  originSessionId: 9318e6e6-c205-4ebd-b849-0fd71a0884b9
---

# 通知中心系统

**完成日期：** 2026-06-12

## 架构

- **后端**：独立 `NotificationModel` 表（不与 `information` 混用），7 个 RESTful 端点在 `blueprints/notification.py`
- **前端**：`src/services/notificationService.js`（API 层）+ `src/composables/useNotifications.js`（共享状态，铃铛和列表共用同一份数据）
- **后台管理**：`BME_backend/src/components/NotificationManage.vue`，可发送系统通知（全体/指定用户）
- **邮件推送**：`batch_create` 时异步 Thread 发送，`flask_mail` + QQ SMTP

## 关键文件

- 后端：`BME_platform_flask/models.py`（NotificationModel）、`blueprints/notification.py`
- 前端：`BME_frontend/src/services/notificationService.js`、`src/composables/useNotifications.js`
- 后台：`BME_backend/src/components/NotificationManage.vue`
- Mock 数据：`BME_frontend/src/mock/notificationData.js`（`VITE_USE_MOCK=false` 时走真实 API）

## 已知问题 & 待办

- `information` 表后续需要弃用，leave/task/notice/homework 各自独立建表
- 当前只有 system 通知，group/course 类别预留但前端未展示
- 后台铃铛 badge 硬编码 value=3，需要动态对接 `/notification/unread_count`
- seed.py 已包含 `UserPermissionModel` 分配（RBAC）和通知测试数据

## 踩过的坑

- Flask 改了代码必须重启进程才能加载新蓝图
- `BME_backend/.env.development` API 端口需与 Flask 实际端口一致（5001）
- `admin_login` 端点检查 `UserPermissionModel`，seed 必须给 admin/teacher 分配权限
- DewInput 中文输入吞字：需用 `composing` ref + `compositionstart/end` 事件，组合期间不强制 `:value` 覆盖
