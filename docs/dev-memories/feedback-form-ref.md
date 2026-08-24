---
name: feedback-form-ref
description: el-form 搭配自定义组件时 template ref 必须声明的教训
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e7acb084-49e6-4a42-a41b-42c1662872ea
---

**问题：** LoginComponent.vue 中 `ref="loginFormRef"` 在模板中使用了，但 `<script setup>` 中从未声明 `const loginFormRef = ref(null)`。导致失焦验证完全不工作（`undefined?.validateField()` 静默返回 undefined），点击登录也只有浏览器原生气泡提示。

**Why：** Vue 3 `<script setup>` 要求手动声明与模板 ref 同名的 ref 变量，不会自动创建。可选链 `?.` 让这个错误完全无报错，非常隐蔽。

**How to apply：** 遇到 el-form 验证不触发的 bug，第一反应检查 template ref 是否在 script 中声明了。对所有表单组件都执行这个检查。
