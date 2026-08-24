---
name: order-dispatch-refactor-plan
description: 订单/下发流重构（已实现并 push，11c5ebc）
metadata: 
  node_type: memory
  type: project
  originSessionId: 4dd4981a-b083-41b7-a2f8-da3b4a84b21c
---

订单/下发流重构**已由用户在另一台机器实现并 push**（commit `004c3c0` 订单与下发流重构 + `73f7525` 预览图），本机已 pull 到 `11c5ebc`（2026-07-14）。

已实现内容（对照原方案 docs/重构方案-订单与下发流.md）：
- `services/gcode_parser.py` 扩展：解析 filament type/color/used_g + nozzle 映射 + ams 期望。
- `services/ams_matcher.py`（新）：match_ams 纯函数，期望料盘 vs 打印机 AMS 对比，优先级 exact>color>type>none，颜色归一化。
- `services/pricing.py`：加 surcharge（manual_slice_surcharge 配置项，.3mf 手工切片路径）。
- `blueprints/orders.py`：新 `POST /orders/preview`（解析+报价不落库）；create_order 删 material 必填、按文件类型分支（.gcode.3mf 全自动 / .3mf 走 QUOTING 待切片）。
- `blueprints/admin.py`：upload-sliced 用扩展 parser + surcharge；dispatch/preview 接口 + dispatch 透传 ams_mapping。
- `tasks/dispatch.py`：`_do_dispatch(order_id, printer_id, ams_mapping=None)` 透传 + 持久化到 job。
- `bambuddy_adapter.add_to_queue`：改 `plate_id` + 透传 ams_mapping。
- models：PrintOrderModel 加 parsed_filaments/parsed_nozzles/is_manual_slice_path；BambuddyJobModel 加 ams_mapping。3 个新迁移。
- 前端：NewOrderView 两段式（preview 卡）；OrdersView 下发 dialog 打印机下拉 + AMS 对比表；PreviewImage 组件（从 gcode.3mf 抽 PNG）。
- 测试：test_ams_matcher（新）+ test_dispatch/test_pricing 扩展。

本机环境**仍跑旧代码**（backend/celery 未重启），要用新代码需：跑 3 个新迁移 + 重启 backend/celery/前端。

相关：[[morning-iteration-bugs]] [[bambuddy-real-printer]] [[dev-mac-env]]
