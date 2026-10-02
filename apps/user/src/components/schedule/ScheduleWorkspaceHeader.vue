<script setup>
// 工作台顶栏（W1）：返回平台 + 标题 + AI 助手入口（录入进行中出蓝点）+
// 真实通知铃铛（复用平台 NotificationBell 轮询与深链）。替代平台大导航，
// 避免与工作台顶栏堆叠（计划 §4.1）。
import { ArrowLeft } from '@element-plus/icons-vue'
import NotificationBell from '../Notification/NotificationBell.vue'

defineProps({
  title: { type: String, default: '我的日程' },
  assistantLive: { type: Boolean, default: false }
})
const emit = defineEmits(['open-assistant', 'back'])
</script>

<template>
  <header class="sw-header">
    <button class="sw-back" @click="emit('back')">
      <el-icon><ArrowLeft /></el-icon>返回平台
    </button>
    <div>
      <h1 class="sw-header-title">我的日程</h1>
    </div>
    <span class="sw-header-sub">{{ title }}</span>
    <div class="sw-header-actions">
      <button class="sw-assistant-btn" :class="{ 'is-live': assistantLive }"
        @click="emit('open-assistant')">AI 助手</button>
      <NotificationBell />
    </div>
  </header>
</template>
