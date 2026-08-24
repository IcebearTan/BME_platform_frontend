---
name: bme-3dfarm-project
description: "独立的 3D 打印农场项目 BME_3DFarm,与 BME 同栈,credit 制,Bambuddy 底座"
metadata: 
  node_type: memory
  type: project
  originSessionId: a08f9566-4c2d-47ab-ae75-f02a1efa61fd
---

BME_3DFarm 是独立于 BME 训练营的 3D 打印农场项目,位于 `d:\My Projects\Education_platform\BME_3DFarm\`。定位:仅内网、credit 预付制(无支付,管理员/活动发放)、7 台 P1S 打印机、底层用 Bambuddy 管理打印机。

技术栈与 BME 同栈:Flask + MySQL + Redis + Vue,但后台任务用 **Celery**(非 APScheduler),打印机出口是 `BambuddyAdapter`(httpx)。角色两级 admin/customer(简化自 BME 四级)。后端端口 **5002**,复用 BME 的 MySQL 3300(root/root)和 Redis 6379。

完整实施方案在 `BME_3DFarm/docs/打印农场-实施方案.md`(已含 7 项产品决策),架构参考在 `docs/reference/`(从 BME 复制的 3 份 Bambuddy 文档)。阶段 Phase 0-4,Phase 0 的 Gate 是 Bambuddy 写入 API 实测。BambuPrinterGateway 已降级为诊断工具(它验证了局域网 IP+SN+授权码可连打印机,这套凭据 Bambuddy 也用)。

后端骨架已搭好并验证可启动(2026-07-11):9 张表、register/login/JWT/RBAC 全通。**Phase 0 全通过(2026-07-11)**:Bambuddy 实地端到端打印验证(Mac,温度/AMS/监控/打印任务全正常) + BambuddyAdapter API 打通(health/list_printers/list_queue/list_archives 四个只读方法全 OK) + 548 端点确认写入档(queue/archives POST)齐全 → 产品形态不降级。已 git commit cf46c63 + 推 GitHub。待办:API Key(生产认证,开发期 disabled 跳过)、printers.yaml 填实(等 Bambuddy 部署到农场机拿 bambuddy_printer_id)。

**Phase 1 进行中(2026-07-11)**:CreditService 心脏已完成并验证——`backend/services/credit_service.py` 6 方法(grant/freeze/capture/release/refund/adjust),双余额+流水+`SELECT FOR UPDATE`+幂等键。关键设计:`_commit_change` 通用骨架 + `compute_delta` 回调把业务校验放锁内(避 TOCTOU);`IntegrityError` 兜底并发同幂等键。蓝图也接通:credit.py(GET /credit/me + /me/transactions)、internal.py(POST /internal/credit/grant,训练营预留,X-Internal-Key 鉴权,request_id 幂等)、auth.py(register 即 ensure_account)。已 commit 9817570。

OrderStateMachine 也已完成(`backend/services/order_state.py`,§5.3 转换表 17 状态 + §5.4 脱敏 + transition 写 PrintEventModel 日志;18 测试全过含主线/非法拒绝/重打循环/终态/CANCELLED 可达性/打印中不可取消;状态机纯管状态,credit 联动留给订单蓝图)。conftest 清表补 PrintEventModel+BambuddyJob(FK 链)。services/__init__ 导出 CreditService+OrderStateMachine。整套 38 测试全过。本轮 OrderStateMachine 改动未 commit。

**下一步:订单蓝图**(`backend/blueprints/orders.py`,下单/上传文件/审核报价/确认/标记完成/取消)——组合 OrderStateMachine.transition + CreditService,关键难点是 credit 操作与状态转换的事务原子性(CreditService 自己 commit、transition 也 commit,中间失败会不一致,蓝图层得协调——可能要拆 CreditService 的 commit 给蓝图统一提交,或用 SAVEPOINT)。订单接口必带 user_id 过滤(多租户隔离 §8)。然后 MinIO 文件上传 → 前端。

关联:[[bme-no-auto-commit]] [[python-uv-toolchain]]
