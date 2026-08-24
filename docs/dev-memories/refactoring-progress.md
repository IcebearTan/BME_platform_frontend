---
name: refactoring-progress
description: BME 前端重构当前进度与关键决策记录
metadata: 
  node_type: memory
  type: project
  originSessionId: 372e6348-529e-4682-9fc9-f1214d7286cc
---

# BME 前端重构进度

**详细进度文档：** `docs/重构进度.md`

## 当前阶段
- P0 ✅ 完成
- P1 🔨 进行中（NotificationView 已重构）
- P2/P3 ⏳ 未开始

## 关键决策
- **Tailwind CSS v4** 替代 SCSS，preflight 关闭（`preflight(false)`）避免与 Element Plus 冲突
- **flexible.js 已移除** — 项目用 px 单位，不再用 rem 缩放
- **渐进式策略：** 页面壳子用 el 布局保持一致，内部内容组件用 Tailwind/inline style 重写
- **组件库方向：** 在 `src/components/ui/` 封装 Dew UI 控件，逐步替代 Element Plus

## Dew UI 组件库踩坑记录
- **el-form template ref 必须在 script setup 中声明**：`const xxxRef = ref(null)`，否则 validateField 不执行且无报错 — [[feedback-form-ref]]
- **el-form + DewInput 需要 `novalidate`**：禁用浏览器原生验证，否则原生气泡抢先于 el-form JS 验证
- **浏览器 :invalid 红色虚线**：`<input type="email">` 的原生 :invalid 伪类样式需在全局 CSS 重置（main.css），scoped CSS 覆盖力不够
- **DewInput 通过 MutationObserver** 监听父级 `.el-form-item.is-error` 自动同步错误样式

## 后端环境
- Flask 后端在 `/BME_platform_flask`，Icebear_develop 分支
- MySQL `sysu_bme` 数据库已创建，端口 3306，密码 123456
- seed.py 可用，测试账号见 seed 输出
- Redis 已安装启动
- 后端端口改为 **5001**（避免 macOS AirPlay 占用 5000）

## 注意事项
- Element Plus 图标组件（如 Document、Bell 等）可在 template 中直接用，不需要 el-icon 包裹
- inline style 中的 px 值不受 Tailwind preflight 影响
- `vue-persistedstate` 可删（误装的），`gsap` 不要删（AboutUsComponent 在用）
