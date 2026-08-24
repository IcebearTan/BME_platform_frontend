---
name: bme-3dfarm-ams-fields
description: Bambuddy AMS tray 字段（tray_color 无颜色名要 hex 推断）、订单→打印机关联路径（经 BambuddyJob）、进度字段在订单本身
metadata: 
  node_type: memory
  type: reference
  originSessionId: e2c5be74-07d6-4de5-bff7-e972839cdfc1
  modified: 2026-07-30T13:55:23.096Z
---

3DFarm 接入 Bambuddy AMS 耗材与订单进度时摸清的字段。adapter `get_printer_status` **原样透传** Bambuddy API，结果存在 `printer.status_detail`（JSON 列）。

**AMS tray 字段**（`status_detail.ams[0].tray[]`，P1S 单 AMS = 4 槽）：
- `tray_color`：RGB hex 字符串，**无 `#` 前缀**，可能 8 位（统一 `slice(0,6)`）
- `tray_type`：材质 `PLA`/`PETG`/`ABS`（确定有）
- `tray_sub_brands`：子系列 `Basic`/`Matte`/`HF`（确定有，admin 在用）
- `tray_brand`：品牌 `Bambu`/`Generic`（**试探取**，admin 没用过、不确定 Bambuddy 是否必返，无则不显示）
- `remain`：余量 0-100，**空槽/未知为负值**（后端归一为 None，前端按空槽处理）
- `id`：料槽序号 0-3

**关键坑：Bambu 协议只有 hex、没有颜色名**（"红""蓝"那种）。要显示颜色名得自己从 hex 推断——`PrinterGrid.vue` 的 `colorName()` 用 14 个参考色做 RGB 最近邻匹配，常见色准、过渡色近似。

**订单 → 所在打印机关联**：`PrintOrderModel` 没有直接 printer 字段，要经 `BambuddyJobModel`（`order_id` + `bambuddy_printer_id`）跳到 `PrinterModel.public_name`。列表批量预取（`orders.py` 的 `_order_printer_names(order_ids)`）避免 N+1；同 order 多 job 取 `id` 最大（最新）那个。单订单场景 `_order_to_dict` 在 PRINTING 时自查。

**进度字段在订单本身**（不在打印机）：`public_progress`(0-100) + `remaining_seconds`，由 `tasks/poller.py` 的 `sync_active_orders` 实时写。customer `/orders` 返回这两个 + `printer_name`，进行中订单卡片显示「在 X 打印 · N% · 剩 NhNm」。

**BambuddyJob 由 dispatch 自动建**：`admin.dispatch_order` → `tasks.dispatch._do_dispatch` 自动 upload + queue + 关联 printer/archive/ams_mapping，正常下发即建好 job。早期 `bind_bambuddy` 手动绑定是 Phase 2 回溯手段，dispatch 重构后冗余——admin 订单详情的前端绑定 UI 已移除（后端接口仍保留备用）。判断"绑定功能还要不要"时别再纠结，就是冗余。

**用户昵称**：`UserModel` 没有 nickname 字段，`username` 即昵称（admin 订单页已展示 username + #id）。

**前端 AMS 展示（2026-07-30 两端统一）**：用户端 `frontend/customer/src/components/PrinterGrid.vue` 是 AMS 视觉**真相源**——四格 `grid-cols-4` 模拟物理 AMS、色点带 `ring`（空槽=虚线圆）、余量进度条+百分比（<20% 琥珀预警）、hover 提示（`colorName` 颜色名 + `fullName` 全名 + #hex + 余量）。辅助函数 `trayHex`/`COLOR_REF`(14 参考色)/`colorName`(RGB 最近邻)/`fullName` 都在这文件里。管理端 `frontend/admin/src/views/PrintersView.vue` 已**完全照搬**这套视觉——但因后端给两端序列化的结构不同（customer 归一化 `p.ams[]` 的 `{color,type,subtype,brand,remain,slot}` vs admin 原始 `status_detail.ams[0].tray[]` 的 `{tray_color,tray_type,tray_sub_brands,remain,id}`），管理端用 `normTray()` 把原始字段映射成用户端格式后复用同一套模板（缺失色不再 fallback 实心灰 `#ccc`，改用用户端的虚线空槽；负余量归一为 null 显 `—`）。**改 AMS 视觉要两端同步，用户端 PrinterGrid 为准。** 注意：两前端都是 Tailwind（非 BME_frontend 的 DewUI 玻璃），且两端只渲染第一个 AMS 单元（`ams[0]`，P1S 单 AMS=4 槽），多 AMS 未处理。

相关：[[bme-3dfarm-project]]、[[bme-3dfarm-local-stack]]。
