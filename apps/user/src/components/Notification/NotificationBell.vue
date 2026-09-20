<template>
  <DewPopover trigger="hover" placement="bottom" :width="300" :offset="4" :show-arrow="true" @show="onPanelShow">
    <template #trigger>
      <div class="notification-trigger" :class="{ 'has-unread': unreadCount > 0 }">
        <el-icon :size="20" class="notification-icon">
          <Bell />
        </el-icon>
        <span v-if="unreadCount > 0" class="notification-badge">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>
      </div>
    </template>

    <div class="notification-panel">
      <!-- 头部 -->
      <div class="panel-head">
        <span class="panel-title">通知</span>
        <span v-if="unreadCount > 0" class="panel-unread">{{ unreadCount }} 条未读</span>
      </div>

      <!-- 预览列表 -->
      <div v-if="previewList.length > 0" class="preview-list">
        <div
          v-for="item in previewList"
          :key="item.id"
          class="preview-item"
          :class="{ 'is-unread': !item.is_read }"
          @click="goToNotification(item)"
        >
          <span v-if="!item.is_read" class="preview-dot"></span>
          <div class="preview-body">
            <span class="preview-title">{{ item.title }}</span>
            <span class="preview-time">{{ formatRelativeTime(item.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="preview-empty">
        <div class="empty-ring">
          <el-icon :size="22"><Bell /></el-icon>
        </div>
        <span class="empty-text">暂无新通知</span>
      </div>

      <!-- 底部跳转 -->
      <div class="panel-footer" @click="goInbox">
        查看全部通知
        <el-icon :size="13" class="footer-arrow"><ArrowRight /></el-icon>
      </div>
    </div>
  </DewPopover>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, ArrowRight } from '@element-plus/icons-vue'
import DewPopover from '@bme/dew-ui/DewPopover.vue'
import { useNotifications, formatRelativeTime } from '../../composables/useNotifications'
import { notificationTarget } from '../../composables/notificationTarget'

const router = useRouter()

// 未读数走服务端轻量接口轮询；最近摘要展开时懒加载（方案 §8.1）
const { previewList, unreadCount, fetchPreview, markAsRead, startPolling, stopPolling } = useNotifications()

// 展开铃铛时拉最近摘要（轻量 per_page=8，不再每 30s 全量拉 100 条）
const onPanelShow = () => { fetchPreview() }

// 点击一条通知：未读先置已读，再直达业务对象（与收件箱共用同一深链映射）
const goToNotification = (item) => {
  if (item && !item.is_read) markAsRead(item.id)
  router.push(notificationTarget(item))
}

const goInbox = () => { router.push('/notifications') }

onMounted(() => startPolling(30000))
onBeforeUnmount(() => stopPolling())
</script>

<style scoped>
/* ── 触发器（铃铛） ──
 * 不自带背景：悬停底色交给外层 .notification-menu-item 提供，
 * 这里只做图标颜色 / 轻微上浮，避免和菜单项 hover 叠两层底色。
 */
.notification-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--dew-text-muted);
  transition: color 0.25s var(--dew-bounce), transform 0.25s var(--dew-bounce);
}

.notification-trigger:hover {
  color: var(--color-primary);
  transform: translateY(-1px);
}

.notification-icon {
  transition: transform 0.25s var(--dew-bounce);
}
.notification-trigger:hover .notification-icon {
  transform: scale(1.12);
}

/* 未读徽标 */
.notification-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--radius-full);
  background: var(--color-danger);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}

/* ── 面板内容（浮层本体由 DewPopover 提供：bg / 圆角 / 阴影 / 箭头） ── */
.notification-panel {
  font-family: var(--dew-font, inherit);
  color: var(--dew-popover-text, var(--dew-text));
}

/* 头部 */
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 10px;
}
.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--dew-text-heading);
}
.panel-unread {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

/* 预览列表 */
.preview-list {
  max-height: 280px;
  overflow-y: auto;
  padding: 0 6px;
}
.preview-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.2s ease;
}
.preview-item:hover {
  background: var(--dew-ghost-hover-bg);
}
.preview-dot {
  flex-shrink: 0;
  margin-top: 6px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary);
}
.preview-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.preview-title {
  font-size: 13px;
  color: var(--dew-text);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-item.is-unread .preview-title {
  font-weight: 600;
  color: var(--dew-text-heading);
}
.preview-time {
  font-size: 11px;
  color: var(--dew-text-faint);
}

/* 空状态 */
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 16px;
}
.empty-ring {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  color: var(--dew-text-faint);
  background: var(--dew-ghost-hover-bg);
}
.empty-text {
  font-size: 13px;
  color: var(--dew-text-faint);
}

/* 底部跳转 */
.panel-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-primary);
  border-top: 1px solid var(--dew-card-divider);
  cursor: pointer;
  transition: background 0.2s ease;
}
.panel-footer:hover {
  background: var(--dew-ghost-hover-bg);
}
.footer-arrow {
  transition: transform 0.2s var(--dew-bounce);
}
.panel-footer:hover .footer-arrow {
  transform: translateX(2px);
}
</style>
