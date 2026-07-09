<template>
  <div :class="['notification-view', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <div style="height: 60px;"></div>
    <MenuComponent />

    <div class="notification-wrap">
      <!-- 页面标题栏 -->
      <div class="page-header">
        <div class="page-title-row">
          <span class="title-accent"></span>
          <h1 class="page-title">消息中心</h1>
        </div>
      </div>

      <!-- 统一通知列表组件（教师/学生共用） -->
      <NotificationListComponent />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import MenuComponent from '../components/MenuComponent.vue'
import NotificationListComponent from '../components/Notification/NotificationListComponent.vue'

const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)
</script>

<style scoped>
/* 根容器：亮/暗双极光底（对齐 HomeView/CommunityView 规范），玻璃卡片靠它折射出彩 */
.notification-view {
  min-height: 100vh;
  background-attachment: fixed;
  transition: background 0.4s ease;
}

.theme-light.notification-view {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(96, 165, 250, 0.26), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(244, 114, 182, 0.24), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(52, 211, 153, 0.22), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(ellipse 50% 50% at 50% 50%, rgba(34, 211, 238, 0.10), transparent 70%),
    linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);
}

.theme-dark.notification-view {
  background:
    radial-gradient(ellipse 60% 50% at 12% 18%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(ellipse 55% 60% at 88% 12%, rgba(236, 72, 153, 0.15), transparent 55%),
    radial-gradient(ellipse 70% 55% at 82% 88%, rgba(16, 185, 129, 0.14), transparent 60%),
    radial-gradient(ellipse 55% 60% at 8% 92%, rgba(245, 158, 11, 0.12), transparent 55%),
    linear-gradient(160deg, #16161a 0%, #0f0f12 100%);
}

.notification-wrap {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 20px;
}

/* 页面标题栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-accent {
  display: inline-block;
  width: 4px;
  height: 20px;
  border-radius: 2px;
  background: linear-gradient(180deg, #3b82f6, #8b5cf6);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--dew-text-heading);
}
</style>
