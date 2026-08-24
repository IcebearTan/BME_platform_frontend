---
name: bme-3dfarm-schema-drift
description: BME_3DFarm dev 库(bme_3dfarm)模型加列后必须手动 ALTER；db.create_all() 不会给已存在的表补列，flask db upgrade 因迁移 drift 也不可靠
metadata: 
  node_type: memory
  type: project
  originSessionId: ded9c2df-1e43-4a77-9458-bef0dba1228b
---

BME_3DFarm 的 dev 库 `bme_3dfarm`（MySQL 3300）有模型/迁移 drift：改 `models.py` 加列后，运行时报 `(1054, "Unknown column 'xxx' in 'field list'")` 500。

**Why:** 项目历史上 dev 库是 `db.create_all()` 从旧模型建的，而 `create_all()` 对已存在的表是幂等的——只跳过建表，**不会给已存在的表 ADD COLUMN**。`flask db upgrade` 也不可靠（alembic_version 与 baseline 对不上）。

**How to apply:** 每次给 `models.py` 加列后，直接用 pymysql 连 dev 库 `ALTER TABLE ... ADD COLUMN` 补列（先查 INFORMATION_SCHEMA 按需补，别 drop_all 丢数据）。例：2026-07-12 订单/下发重构加 print_order.parsed_filaments/parsed_nozzles/is_manual_slice_path + bambuddy_job.ams_mapping，都是手动 ALTER 补的。测试库 `bme_3dfarm_test` 不受影响（conftest 每次从模型 create_all 重建）。改后端代码另见 [[bme-flask-restart-trap]]。
