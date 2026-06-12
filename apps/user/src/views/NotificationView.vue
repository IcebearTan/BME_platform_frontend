<template>
  <div style="min-height: 100vh; background: linear-gradient(135deg, #f0f4ff 0%, #fdf2f8 50%, #f0fdf4 100%);">
    <div style="height: 60px;"></div>
    <MenuComponent />

    <div style="max-width: 960px; margin: 0 auto; padding: 24px 20px;">
      <!-- 页面标题栏 -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="display: inline-block; width: 4px; height: 20px; border-radius: 2px; background: linear-gradient(180deg, #3b82f6, #8b5cf6);"></span>
          <h1 style="font-size: 18px; font-weight: 600; color: #1f2937; margin: 0;">消息中心</h1>
        </div>
      </div>

      <!-- 统一通知列表组件（教师/学生共用） -->
      <NotificationListComponent />
    </div>
  </div>
</template>

<script setup>
import MenuComponent from '../components/MenuComponent.vue'
import NotificationListComponent from '../components/Notification/NotificationListComponent.vue'
</script>
