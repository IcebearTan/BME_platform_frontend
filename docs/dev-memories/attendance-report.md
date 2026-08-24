---
name: attendance-report
description: 每日 00:00 自动汇总昨日出勤发邮件的定时任务（Flask 后端）+ BME_backend 管理入口
metadata: 
  node_type: memory
  type: project
  originSessionId: 27b3c410-b280-4334-bac9-bd9c82e1c6c4
---

Flask 平台后端（BME_platform_flask）每日 00:00 自动汇总昨日全平台 CheckRecord 出勤明细，生成 HTML 正文 + CSV(UTF-8 BOM) 附件，发给**拥有 RBAC 权限 `attendance_report.recipient` 的用户**（复用 PermissionModel/UserPermissionModel，不新建表；增删收件人走 `/permissions/assign` 与 `/permissions/revoke`——**复数**，permissionACL 蓝图 url_prefix=`/permissions`；曾因前端写成单数 `/permission/` 导致 OPTIONS 预检 404、CORS 失败）。

**关键决策（非显然）：**
- 用 APScheduler `BackgroundScheduler` 进程内调度，**不是**外部 cron。`CronTrigger(hour=0, minute=0, Asia/Shanghai)`。
- gunicorn 生产 `workers=4`，每个 worker 会各启一份 scheduler → 用 **fcntl 非阻塞排他锁**（`log/.attendance_scheduler.lock`）保证只一个 worker 真正启动，worker 崩溃内核自动回收锁自愈。
- 聚合按 `user_id`：`SUM(duration)` / `MIN(check_in)` / `MAX(check_out)` / COUNT——一人一天可能多条 CheckRecord（上午+下午各一段，见 codecheck.py 写入逻辑），不能取 `.first()`。
- 时区全链路用 `datetime.now(ZoneInfo("Asia/Shanghai"))`，禁用 `date.today()`（防 UTC 服务器漂移）。
- 收件人复用 RBAC：注册权限 `attendance_report.recipient`（`ensure_recipient_permission` 在 app 启动时幂等创建，seed.py 也有定义），收件人 = UserPermissionModel 里拥有该权限的人。seed 默认给 admin/teacher 分配全部权限。`GET /attendance-report/recipients` 只读查看当前收件人。

**入口：**
- 自动：[[seat-feature-backend]] 的 CheckRecord 数据 → `blueprints/attendance_report.py` 的 `_scheduled_job`
- 手动：`POST /attendance-report/send_now`（admin，可选 body `{date:"YYYY-MM-DD"}` 补发），scheduler 与手动接口共用 `_build_and_send`
- 邮件发送复用 `notification.py` 的 `_send_email_async`（已扩展支持 html+附件，向后兼容）+ 新增 `send_report_emails`
- **前端管理入口**：[[seat-feature-backend]] 的 BME_backend `AttendanceReportManage.vue`（侧边栏「出勤报告」→ `/attendance-report/manage`），收件人增删（内部转 `/permissions/assign|revoke`）+ 发送测试（调 `send_now`）。用户列表来自 `/user/user_list`（注意：`/user/all_users` 是 NotificationManage 里的死代码，接口不存在）。

`.env` 只留 `ATTENDANCE_REPORT_ENABLED`（总开关）与 `ATTENDANCE_REPORT_TIMEZONE`，不再放收件人。部署后需给目标用户 assign 该权限（或重跑 seed 自动给 admin/teacher）。

**进度（2026-07-02）：** 后端 + 前端管理入口均完成并验证通过（`OPTIONS /permissions/assign` 预检 200、`/attendance-report/recipients` 401、admin_login 不再 500）。管理后台可增删收件人 + 发测试邮件。鉴权暂用 `user_mode=='admin'` 手动判断（抄 notification.py 风格），未用 `@check_permission+@audit_log` 装饰器，可选统一。

**运维坑（启动后端必读）：** (1) `start.sh` 不能用 `nohup python`——该 uv venv 的 `source activate` 在非交互 shell 不把 `.venv/bin` 加进 PATH（`which python` 找不到），已改为 `nohup "$DIR/.venv/bin/python"` 全路径。(2) 项目实际在 `~/开发/BME_platform/BME_platform_flask/`（原 `~/开发/BME_platform_flask/`，2026-07-29 迁入 BME_platform 归档），旧的 `~/工作/项目开发/` 已删；曾因旧路径僵尸进程（跑移动前旧代码 + 缺 email_validator）导致 admin_login 500。

参见 [[notification-system]] [[seat-feature-backend]]
