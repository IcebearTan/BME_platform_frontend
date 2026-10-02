<script setup>
// 工作台侧栏（W1）：今日/日历/任务/设置四入口（日报/统计待 F2 开放后解锁，
// 备忘录 E1 前隐藏）。移动端由 CSS 转横滑条（见 schedule-workspace.css）。
import { Clock, Calendar, List, Setting } from '@element-plus/icons-vue'

defineProps({
  active: { type: String, required: true },
  items: { type: Array, required: true }
})
const emit = defineEmits(['select'])
const ICONS = { today: Clock, calendar: Calendar, tasks: List, settings: Setting }
</script>

<template>
  <aside class="sw-sidebar">
    <div class="sw-sidebar-brand">我的日程</div>
    <button v-for="item in items" :key="item.value" class="sw-nav-item"
      :class="{ 'is-active': active === item.value }" @click="emit('select', item.value)">
      <el-icon><component :is="ICONS[item.value]" /></el-icon>{{ item.label }}
    </button>
    <div class="sw-sidebar-foot">私人日程 · 仅本人可见</div>
  </aside>
</template>
