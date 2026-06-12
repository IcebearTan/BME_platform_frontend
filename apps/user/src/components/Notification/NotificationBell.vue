<template>
  <div
    class="notification-container"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <!-- 铃铛图标 + 未读徽标 -->
    <div class="notification-trigger">
      <el-icon :size="20" class="notification-icon">
        <Bell />
      </el-icon>
      <el-badge
        v-if="unreadCount > 0"
        :value="unreadCount > 99 ? '99+' : unreadCount"
        class="notification-badge"
      />
    </div>

    <!-- 悬停下拉面板 -->
    <transition name="slide">
      <div v-if="isHovering" class="notification-panel">
        <!-- 最近通知预览 -->
        <div v-if="recentNotifications.length > 0" class="preview-list">
          <div
            v-for="item in recentNotifications"
            :key="item.id"
            class="preview-item"
            :class="{ 'is-unread': !item.is_read }"
            @click="goToNotifications"
          >
            <span class="preview-title">{{ item.title }}</span>
            <span class="preview-time">{{ formatRelativeTime(item.created_at) }}</span>
          </div>
        </div>
        <div v-else class="preview-empty">暂无通知</div>

        <!-- 底部跳转 -->
        <div class="panel-footer" @click="goToNotifications">
          查看全部通知
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Bell } from '@element-plus/icons-vue'
import { useNotifications, formatRelativeTime } from '../../composables/useNotifications'

const router = useRouter()

// 共享状态（与 NotificationListComponent 共用同一份数据）
const { notificationList, unreadCount, startPolling, stopPolling } = useNotifications()

const isHovering = ref(false)
const recentNotifications = computed(() => notificationList.value.slice(0, 5))

const goToNotifications = () => {
  isHovering.value = false
  router.push('/notifications')
}

onMounted(() => startPolling(30000))
onBeforeUnmount(() => stopPolling())
</script>

<style scoped>
.notification-container {
  position: relative;
  display: inline-block;
}

.notification-trigger {
  position: relative;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
}

.notification-trigger:hover {
  background: linear-gradient(135deg, #f0f9ff 0%, #e1f3ff 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.notification-icon {
  color: #606266;
  transition: all 0.3s ease;
}

.notification-trigger:hover .notification-icon {
  color: #409EFF;
  transform: scale(1.1);
}

.notification-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  transform: scale(0.8);
  z-index: 10;
}

/* ── 下拉面板 ── */
.notification-panel {
  position: absolute;
  top: 100%;
  right: 0;
  width: 280px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  z-index: 2000;
  overflow: hidden;
  margin-top: 6px;
}

.notification-panel::before {
  content: '';
  position: absolute;
  top: -6px;
  left: 0;
  right: 0;
  height: 6px;
  background: transparent;
}

/* 过渡动画 */
.slide-enter-active { transition: all 0.2s ease-out; }
.slide-leave-active { transition: all 0.15s ease-in; }
.slide-enter-from, .slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── 预览列表 ── */
.preview-list {
  max-height: 240px;
  overflow-y: auto;
}

.preview-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid #f5f5f5;
}

.preview-item:last-child { border-bottom: none; }

.preview-item:hover {
  background: #f8f9fa;
}

.preview-item.is-unread .preview-title {
  font-weight: 600;
  color: #303133;
}

.preview-title {
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-time {
  font-size: 11px;
  color: #c0c4cc;
}

.preview-empty {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: #c0c4cc;
}

/* ── 底部 ── */
.panel-footer {
  padding: 10px;
  text-align: center;
  font-size: 13px;
  color: #409EFF;
  cursor: pointer;
  border-top: 1px solid #f0f0f0;
  transition: background 0.2s ease;
}

.panel-footer:hover {
  background: #f5f7fa;
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .notification-panel {
    width: 240px;
  }
}
</style>
