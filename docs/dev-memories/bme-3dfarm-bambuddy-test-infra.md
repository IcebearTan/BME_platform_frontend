---
name: bme-3dfarm-bambuddy-test-infra
description: 3DFarm Bambuddy 测试工具链——录制/回放代理 + 生命周期驱动（webhook/poller 秒级走完状态机）+ prod 只读 canary
metadata: 
  node_type: memory
  type: project
  originSessionId: e29667af-1769-4b6b-b881-207ee61b6f92
  modified: 2026-07-31T13:37:38.270Z
---

3DFarm 的 Bambuddy 集成测试工具链（2026-07-31 落地，Phase 1-3 + Phase 4 生产采集完成）。解决"dev 只测得出 200、生产才有 bug；真打印 3-10 分钟"的鸿沟。

**2026-07-31 重大进展**：dev 开发机**可直接直连生产 Bambuddy NAT 端点 `http://172.25.56.19:18000`**（不用再上 .83 采集）。已直接从 dev 完成生产采集 → `tests/fixtures/bambuddy/prod/`（生产 v1.2.5.1 真实数据：4 台真机 BME-112-B/C/D/E、id 1-4；14 个料盘分配含 weight_used；9 条真实队列项）。契约测试对 prod 全绿；canary 对生产 13 checks exit 0。**生产 Bambuddy v1.2.5.1 vs 本地 dev Docker v0.2.4.9**——版本差巨大但 adapter 完全兼容。BME-112-C 真实 state=FAILED 且 hms_errors=[] → 映射 IDLE（"FAILED 假象"真实案例）。

**核心洞察**：3DFarm 状态机两个输入（poller 拉 + webhook 推）收敛到 `services/bambuddy_sync.py::apply_event`，合成事件可瞬时驱动完整状态机 + credit 联动，无需物理打印。Bambuddy 虚拟打印机**不**模拟打印进度（`mc_percent=0`、不自完成），唯一 debug 钩子是 `POST /printers/{id}/debug/simulate-print-complete`（需 printer 行 + archive）。

**工具**（都在 `backend/tools/`）：
- `bambuddy_recorder.py` —— record/replay/fault/sequence 四模式代理。路径规范化把数字 id 段模板化为 `{id}`，dev(VP id 1) 与 prod(P1S id 2) 采集通用。pytest 用 conftest 的 `replay_proxy` fixture（函数级、port=0、teardown 还原 `BAMBUDDY_BASE_URL`）。
- `bambuddy_schema.py` —— 校验 poller/dispatch/webhook 消费的字段 + `logical_path()` 路径规范化。
- `capture_bambuddy.py` —— 只读 GET 采集 CLI（本地 dev → `live/`；dev 直连生产 → `prod/`，命令 `--base-url http://172.25.56.19:18000 --printer-id <真机id> --out tests/fixtures/bambuddy/prod`）。
- `canary.py` —— 生产只读冒烟，GET-only 守卫，退出码驱动告警（对生产已验证 13 checks OK）。
- fixture corpus：`tests/fixtures/bambuddy/{live,prod,seq_print,seq_printers_sync}/`。
- 测试：`test_bambuddy_fixtures.py`（契约）、`test_lifecycle_webhook.py`（合成事件走真实核心）、`test_lifecycle_poller.py`（replay 喂序列，4 次 `_do_sync` 走完 READY_TO_PRINT→PRINT_COMPLETED + capture；AMS 克数富化；500 注入不崩）。

**关键坑**：
- webhook 幂等 key 含 timestamp，驱动序列每步必须唯一 timestamp，否则 `replayed` 不推进。
- READY_TO_PRINT 不能直接转 PRINT_FAILED（状态机约束），失败分支要先 `print_started`。
- 拉取 fbde0c2 后 `test_sync_printers_real_and_virtual` 过期（新 poller 逐台调 get_printer_status），已加 get_printer_status mock 修复（2026-07-31）。
- `BambuddyAdapter(base_url=...)` 在 api_key 空时仍读 `current_app.config` → 需 app context（测试里包 `app.app_context()`）。
- 代理回放：fixture body 存的是已解析 JSON（list 也是），回放必须按 `body_encoding=="json"` 重新 `json.dumps`，不能 `str()`（会变 Python repr，非法 JSON）。

**Why**：dev 与 prod 唯一实质差异是 Bambuddy 环节；目标是不碰生产写入也能拿生产形态数据。
**How to apply**：改 adapter/poller/dispatch 后跑 `test_bambuddy_fixtures.py` + `test_lifecycle_poller.py` + `test_lifecycle_webhook.py`；Bambuddy 换版本 → 重采集 live/prod corpus（dev 直连即可，无需上 .83）。剩余待办：① canary 定时部署（Windows 任务计划，15 分钟，退出码告警，部署在 dev 或 .83 均可）；② 可选极小真打印采集完整生命周期 + 真实 webhook payload（**需用户授权在生产启动一次打印**，未做）；③ `print_start` 映射修复待决策（Bambuddy 发 `print_start` 但 `EVENT_STATE_MAP` 没有 → 纯 webhook 路径订单卡 READY_TO_PRINT，一行+测试）。

相关：[[bme-3dfarm-project]] [[bme-3dfarm-local-stack]] [[bme-3dfarm-schema-drift]] [[bme-3dfarm-ams-fields]] [[bme-no-auto-commit]]
