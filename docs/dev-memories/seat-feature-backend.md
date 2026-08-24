---
name: seat-feature-backend
description: 座位图+打卡后端打通计划、多仓架构、关键路径与当前进度
metadata: 
  node_type: memory
  type: project
  originSessionId: 12208ec5-e453-47f7-85b9-3e10ac80e86c
---

# 座位图 / 打卡 后端打通

**目标**：首页「在线看板」座位图 + 打卡胶囊接真实数据。座位模型 = 每用户绑定固定座位，座位「亮」= 绑定用户有 `check_out IS NULL` 的 CheckRecord（复用现成打卡数据，不另搞实时系统）。

## 三仓架构（关键认知）
- **`BME_platform_flask`** = 唯一后端（Flask + SQLAlchemy + MySQL `sysu_bme`@3306，HTTP 5001）。所有模型/端点都在这。`db.create_all()` 建表（**无 alembic**）。
- **`BME_backend`** = **Vue3 admin 前端**（不是后端！），axios 调 Flask 5001。base `/admin/`。CRUD 页在 `src/components/*.vue`，路由 `router.js`，侧边栏菜单+标题映射在 `views/HomeView.vue`。照 `UserManage.vue` 模式加页（el-table + el-dialog）。
- **`BME_frontend`** = 用户端（本仓）。SeatMap 已是 mock 组件库结构（`components/SeatMap/`：SeatBoard + RoomRegistry + rooms/Room106Map）。

## 打卡后端 = 已完整就绪（白捡）
- 模型 `CheckRecord`（`models.py:598`）：id/user_id/check_in/check_out/duration/date。open session = check_out IS NULL。
- 端点全在 `blueprints/codecheck.py`（url_prefix 空）：`/lateset_checktime`、`/records`、`/records/my_stats`、`/records_top10`、`/check`(打卡码签到签退)。
- **Step 0 已完成**：LivePanel un-mock（初始值改真实默认 + onMounted 接 getLatestCheckStatus/fetchMonthlyStats/calculateTodayTotalDuration），首页打卡胶囊接真数据。

## 座位后端 = greenfield（正在做 Step 1）
- 需新建 `RoomModel`（name 如 '106'）+ `SeatModel`（room_id, label 如 'A1', bound_user_id FK user.id）在 `models.py`。
- 新建 `blueprints/seat.py`（bp url_prefix='/seat'）：admin CRUD（check_permission('seat_management')）+ 对外 `GET /seat/rooms/<id>/seats` 返回 [{label, bound_user_id, bound_user_name, occupied}]，occupied 由 CheckRecord join 算。
- 注册：`blueprints/__init__.py` 加 `from .seat import bp as seat_bp` + `__all__`（约 300/318 行）；`app.py` 加 `app.register_blueprint(seat_bp)`（约 48 行后）。
- 端点模式照 `blueprints/medal.py`：装饰器顺序 `@bp.route` → `@jwt_required()` → `@check_permission('xxx')` → `@audit_log(...)`；响应 `{code:200, message}`。check_permission/audit_log 在 `blueprints/__init__.py`，admin 角色直接放行。

## 前端座位图布局（决定 label 方案）
- Room106Map = **5 个八角形 × 8 三角形 = 40 座**（= 容量）。座位 label 用 A1-E8（字母=八角形，数字=三角形索引）。后端只存 label 字符串，前端解析 label 定位到哪个八角形的哪个三角。

## 计划进度
- ✅ Step 0：LivePanel un-mock 打卡（前端）
- ✅ Step 1：Flask RoomModel/SeatModel + seat.py + 注册 + 建表 + 灌 106/40 座
- ✅ Step 2：BME_backend SeatManage.vue（房间选择/座位表/绑定用户/解绑/删除/新建房间/批量生成A1-E8）+ router + HomeView 菜单(座位管理)+标题
- ✅ Step 3：BME_frontend Room106Map 接 GET /seat/rooms/106/seats，三角形颜色按 Occupied，悬停提示跟随光标(OctagonShape emit clientX/Y)
- 端到端：admin 绑定用户→用户打卡→首页在线看板座位亮起（occupied=check_out IS NULL 的 CheckRecord join）

参见 [[dew-ui-progress]] [[refactoring-progress]]
