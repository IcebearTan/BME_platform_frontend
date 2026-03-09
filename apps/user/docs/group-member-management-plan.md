# 小组成员管理完整设计与分阶段实施方案

更新时间：2026-03-09
适用项目：`BME_frontend`

## 1. 目标与约束

本方案目标是将「成员管理」升级为可运营、可追踪、可扩展的管理中心，同时避免一次性重构带来的风险。

设计原则：

1. 先稳定现有功能，再逐步增强。
2. 保持接口向后兼容，前端通过适配层消化字段差异。
3. 成员页展示“管理决策所需的摘要信息”，详细学习数据下钻到抽屉/二级页。
4. 每个阶段都可独立上线并可回滚。

## 2. 现状对齐（基于当前代码）

当前项目已具备成员管理基础能力，可作为 Phase 0 起点：

1. 成员列表和加入申请双 Tab 已存在，见 `src/components/Group/GroupMembers.vue`。
2. 加入申请审批流程已有接口调用：
   - `GET /course-groups/{groupId}/join-requests?status=pending`
   - `POST /course-groups/{groupId}/join-requests/{requestId}/approve`
   - `POST /course-groups/{groupId}/join-requests/{requestId}/reject`
3. 加入小组入口已在卡片页和概览页实现：
   - `src/components/Group/GroupCards.vue`
   - `src/components/Group/GroupOverview.vue`
4. 请求基础规范：Bearer Token + `code` 判定，见 `src/api.js`。

现存缺口：

1. 成员列表字段较少，仅姓名/学号/加入时间，缺少角色、状态、进度摘要、活跃度。
2. 单人操作和批量操作未闭环（部分按钮为占位）。
3. 学习进度与成员管理未形成分层（列表摘要 + 下钻详情）。
4. 缺少统一的数据模型和接口契约文档。

## 3. 目标页面信息架构

成员管理页建议保持两层结构：

1. 顶部摘要区：成员总数、待审核申请、近7天活跃率、任务完成率、风险成员数。
2. 主内容区：
   - Tab1：成员列表
   - Tab2：加入申请

成员列表每行展示字段（摘要层）：

1. 基础身份：头像、姓名、学号。
2. 组织属性：角色（组长/成员/助教）、成员状态（正常/禁言/暂停）。
3. 学习摘要：完成率、逾期任务数。
4. 行为摘要：最近活跃时间。
5. 操作区：查看详情、改角色、催办、移出。

成员详情（右侧抽屉）展示字段（下钻层）：

1. 任务完成趋势（近4周）。
2. 逾期任务明细。
3. 最近提交记录。
4. 考勤摘要（如启用考勤）。
5. 管理动作（私信提醒、调整角色、移出）。

加入申请页展示字段：

1. 申请人信息（姓名、学号、专业年级）。
2. 申请理由。
3. 申请时间。
4. 操作（通过/拒绝），拒绝需填写原因。

## 4. 角色与权限矩阵

1. 教师（Owner）：查看全部、审批申请、改角色、移出成员、批量操作。
2. 助教（Manager，可选）：查看全部、催办、部分批量操作，不可删除小组。
3. 学生（Member）：仅查看成员公开信息，不可审批、不可改角色。

权限建议由后端返回 `allowed_actions`，前端仅按权限渲染按钮，避免硬编码。

## 5. 关键状态机

加入申请状态：

1. `pending`：待审核
2. `approved`：已通过
3. `rejected`：已拒绝
4. `canceled`：用户撤销（可选）
5. `expired`：超时失效（可选）

成员状态：

1. `active`：正常
2. `muted`：禁言（可选）
3. `suspended`：暂停（可选）
4. `removed`：已移出

## 6. 分阶段实施计划（避免一次性重构）

## Phase 0：基线稳定（1个迭代）

目标：不改交互框架，先把现有能力跑稳并标准化数据结构。

交付：

1. 新增前端适配层（字段映射）。
2. 统一日期处理（字符串/时间戳兼容）。
3. 明确接口错误处理与空态。
4. 完成成员页基础埋点（加载成功率、审批成功率）。

依赖接口：使用现有接口即可。

验收：

1. 成员列表稳定加载。
2. 加入申请审批通过/拒绝可用。
3. 异常时有明确提示，不出现空白页。

## Phase 1：成员管理闭环（1个迭代）

目标：补齐高频管理动作。

交付：

1. 成员行新增字段：角色、状态、最近活跃、完成率。
2. 单人操作闭环：改角色、移出成员、查看详情。
3. 搜索/筛选/排序可用。

新增接口：

1. `PATCH /course-groups/{groupId}/members/{memberId}/role`
2. `PATCH /course-groups/{groupId}/members/{memberId}/status`
3. `DELETE /course-groups/{groupId}/members/{memberId}`

验收：

1. 管理动作成功后列表即时刷新。
2. 权限不足时按钮不可见或后端拒绝并提示。

## Phase 2：申请中心与批量操作（1个迭代）

目标：降低教师处理成本。

交付：

1. 加入申请支持“拒绝理由”。
2. 成员列表支持批量选择。
3. 批量动作：催办、移出、改状态（按你们业务优先级选2个先做）。

新增接口：

1. `POST /course-groups/{groupId}/members/batch-actions`
2. `POST /course-groups/{groupId}/join-requests/{requestId}/reject` 支持 `review_note`

验收：

1. 50 人规模下批量操作响应可接受。
2. 所有批量动作记录审计日志。

## Phase 3：进度下钻与风险识别（1个迭代）

目标：让成员管理具备“教学运营”价值。

交付：

1. 成员列表展示风险标记（如逾期>=2）。
2. 成员详情抽屉展示学习进度、逾期明细、最近提交。
3. 支持“催办”并形成通知回路。

新增接口：

1. `GET /course-groups/{groupId}/members/{memberId}/progress`
2. `POST /course-groups/{groupId}/members/{memberId}/reminders`

验收：

1. 风险成员识别准确。
2. 抽屉详情加载时间可控，失败可重试。

## Phase 4：性能与治理（0.5-1个迭代）

目标：可持续维护。

交付：

1. 分页/虚拟列表（大规模成员）。
2. 审批和成员变更日志查询。
3. 指标看板（审批时效、活跃率趋势）。

新增接口：

1. `GET /course-groups/{groupId}/audit-logs`
2. `GET /course-groups/{groupId}/member-stats`

验收：

1. 200+ 成员列表滚动流畅。
2. 关键管理操作可追溯。

## 7. 接口清单（建议契约）

统一响应建议：

```json
{
  "code": 200,
  "message": "ok",
  "data": {},
  "request_id": "trace-xxx"
}
```

分页对象建议：

```json
{
  "page": 1,
  "page_size": 20,
  "total": 120
}
```

## 7.1 成员列表

`GET /course-groups/{groupId}/members`

Query：

`page` `page_size` `keyword` `role` `status` `sort_by` `sort_order` `include_progress`

Response `data` 示例：

```json
{
  "summary": {
    "total_members": 45,
    "active_rate_7d": 0.82,
    "pending_requests": 6,
    "risk_members": 5
  },
  "items": [
    {
      "member_id": 1001,
      "user_id": 88,
      "name": "张三",
      "avatar_url": "",
      "student_id": "20230001",
      "role": "member",
      "member_status": "active",
      "joined_at": "2026-03-01T10:00:00Z",
      "last_active_at": "2026-03-09T08:30:00Z",
      "progress": {
        "completion_rate": 0.75,
        "completed_tasks": 9,
        "total_tasks": 12,
        "overdue_tasks": 1
      },
      "tags": ["core"],
      "allowed_actions": ["view", "change_role", "remove", "remind"]
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 45
  }
}
```

## 7.2 加入申请列表

`GET /course-groups/{groupId}/join-requests?status=pending&page=1&page_size=20`

Response `data.items` 关键字段：

`request_id` `user_id` `student_name` `student_id` `apply_reason` `created_at` `allowed_actions`

## 7.3 审批加入申请

`POST /course-groups/{groupId}/join-requests/{requestId}/approve`

Body：

```json
{
  "review_note": "欢迎加入"
}
```

`POST /course-groups/{groupId}/join-requests/{requestId}/reject`

Body：

```json
{
  "review_note": "当前人数已满"
}
```

## 7.4 成员操作

`PATCH /course-groups/{groupId}/members/{memberId}/role`

Body：

```json
{
  "role": "leader",
  "reason": "表现优秀"
}
```

`PATCH /course-groups/{groupId}/members/{memberId}/status`

Body：

```json
{
  "member_status": "active",
  "reason": "解除限制"
}
```

`DELETE /course-groups/{groupId}/members/{memberId}`

Body（可选）：

```json
{
  "reason": "违反小组规范"
}
```

## 7.5 批量操作

`POST /course-groups/{groupId}/members/batch-actions`

Body：

```json
{
  "action": "remove",
  "member_ids": [1001, 1002, 1003],
  "reason": "长期不活跃"
}
```

## 7.6 成员进度下钻

`GET /course-groups/{groupId}/members/{memberId}/progress?range=30d`

Response `data` 关键字段：

`trend` `task_records` `overdue_tasks` `attendance_summary`

## 8. 前后端实现分工建议

前端：

1. 新建 `groupMemberService` 统一所有成员与申请接口调用。
2. 在 `GroupMembers.vue` 中拆分“列表渲染”和“操作逻辑”。
3. 增加字段适配函数，兼容 `snake_case -> camelCase`。
4. 引入列表查询状态（`queryState`）统一分页/筛选/排序。

后端：

1. 提供统一分页查询与筛选能力。
2. 所有写操作返回最新成员摘要，减少前端二次请求。
3. 加强权限校验并返回可读错误码（如 `40301`）。
4. 写操作落审计日志（含操作人、目标、时间、原因）。

## 9. 测试与验收清单

功能测试：

1. 成员列表加载、搜索、筛选、排序。
2. 申请通过/拒绝流程及计数联动。
3. 改角色、移出、批量操作正确生效。
4. 进度抽屉数据与任务中心一致。

异常测试：

1. 无权限操作。
2. 重复审批。
3. 人数已满后审批。
4. 网络超时和服务端 5xx。

性能测试：

1. 100-200 成员下列表响应与滚动流畅度。
2. 批量操作 50 条以内的响应时延。

## 10. 上线与回滚策略

1. 开关控制：通过前端特性开关分阶段开启新能力。
2. 灰度上线：先教师小组灰度，再全量。
3. 快速回滚：保留旧列表渲染路径和旧接口兼容。

---

如果你确认这份方案，我建议直接从 Phase 0 开始落地，我可以按该文档继续产出：

1. 前端任务拆分 Issue 列表（可直接进 Jira/Tapd）
2. 接口联调清单（按优先级）
3. 第一阶段代码改造 PR（只改最小范围）
