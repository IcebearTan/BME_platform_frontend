---
name: bme-rbac-roles
description: BME 平台 RBAC 四级角色体系(super_admin/teacher/mentor/student)——判角色/权限怎么看
metadata: 
  node_type: memory
  type: project
  originSessionId: e3f91290-e208-4e1e-890e-f28a19fa710e
---

BME 平台 RBAC 已从旧的 `{user_mode: user|admin}` 升级为**四级角色**（2026-07-09 Phase A 落地）。

**角色四级**（`UserModel.role` String(20)，默认 `student`）：`super_admin(4) / teacher(3) / mentor(2) / student(1)`，等级见 `UserModel.ROLE_RANK`。helper：`role_rank`、`has_role_at_least(r)`、`is_staff()`(≥mentor，可进管理端)、`is_admin_like()`(仅 super_admin)。

**双写保留 `user_mode`**（有意为之）：super_admin/teacher 仍 `user_mode='admin'`，mentor/student 为 `'user'`。全站 ~30 处裸 `user_mode == 'admin'` 判断因此对 teacher/super_admin 自动放行、对 mentor/student 自动拒绝，**恰好符合四级语义，无需逐个改**。

**权限装饰器**（`blueprints/__init__.py`）：
- `check_permission(name)`：super_admin 直通；其余查 ACL（`UserPermission` 表）。**旧的「任何 admin 直通一切」已废弃**。权限名一律**下划线**（`course_management` 等）；`camp_management / camp_attendance_view / camp_leave_approve / camp_reward_issue / camp_seat_assign` 为营期专用。
- `camp_role(*roles)`：营期端点按全局角色门控（如 `@camp_role('teacher','super_admin')`）。
- 营期**团队级收敛**（导生只看本团队）用 `camp_team_scoped`（Phase C 引入，依赖 CampMember）。

**登录返回**：`/auth/login` 与 `/auth/admin_login` 都返回 `role`/`role_rank`/`permissions[]`；`admin_login` 准入 = `is_staff()`。前端 Vuex store 有 getter `role`/`permissions`/`can(perm)`（`can` = super_admin 或含该权限）。

**Why:** 甲方要营期体系，需 老师(汇总全营)/导生(管本团队)/学生 区分，旧两级不够。登录态真相源(localStorage token)见 [[bme-auth-token-source]]，本记忆讲角色/权限层。

**How to apply:** 新端点按需挂 `@check_permission`（系统管理类/ACL）或 `@camp_role`/`@camp_team_scoped`（营期类）；前端用 `store.getters.role`/`can(perm)` 门控 UI；判角色用 `user.role`/`is_staff()`，别再用 `user_mode`（除维护旧兼容）。营期系统进展见 [[bme-camp-system]]，schema 管理见 [[bme-local-dev-env]]。
