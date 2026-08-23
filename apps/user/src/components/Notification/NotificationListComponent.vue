<template>
  <div>
    <!-- 筛选栏 -->
    <DewButtonBar :items="filterItems" v-model="activeFilter" />

    <!-- 统计 + 全部已读 -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 16px;">
      <div style="display: flex; gap: 16px;">
        <div style="font-size: 13px; color: var(--dew-text-muted);">
          共 <span style="font-weight: 600; color: var(--dew-text-heading);">{{ total }}</span> 条通知
        </div>
        <div v-if="unreadCount > 0" style="font-size: 13px; color: var(--color-primary);">
          <span style="font-weight: 600;">{{ unreadCount }}</span> 条未读
        </div>
      </div>
      <DewButton v-if="unreadCount > 0" type="ghost" size="sm" @click="handleMarkAllAsRead">
        全部已读
      </DewButton>
    </div>

    <!-- 通知列表 -->
    <DewCard style="margin-top: 12px;" size="lg" :no-hover="true">
      <!-- 加载中：通知卡骨架 -->
      <div v-if="loading" style="display: flex; flex-direction: column; gap: 6px;">
        <DewCard
          v-for="n in 4"
          :key="'nt-sk-' + n"
          variant="inset"
          size="sm"
          :no-hover="true"
        >
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <DewSkeleton variant="rect" width="36" height="36" rounded="10px" />
            <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
              <DewSkeleton variant="text" width="50%" />
              <DewSkeleton variant="text" width="85%" />
              <DewSkeleton variant="text" width="25%" />
            </div>
          </div>
        </DewCard>
      </div>

      <!-- 空状态 -->
      <div v-else-if="pagedList.length === 0" class="empty-state">
        <svg style="width: 40px; height: 40px; margin-bottom: 10px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <span style="font-size: 14px;">暂无通知</span>
      </div>

      <!-- 通知卡片列表 -->
      <div v-else style="display: flex; flex-direction: column; gap: 6px;">
        <DewCard
          v-for="item in pagedList"
          :key="item.id"
          :interactive="true"
          variant="inset"
          size="sm"
          @click="handleClick(item)"
        >
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <!-- 图标 -->
            <div class="notification-icon">
              <component :is="Bell" style="width: 18px; height: 18px; color: var(--dew-text-faint);" />
            </div>

            <!-- 内容 -->
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span
                  :style="{
                    fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: item.is_read ? '500' : '600',
                    color: item.is_read ? 'var(--dew-text-muted)' : 'var(--dew-text-heading)',
                  }"
                >{{ item.title }}</span>
                <DewTag v-if="item.is_important" type="danger" size="sm" :round="true">重要</DewTag>
              </div>
              <p class="notification-content">{{ item.content }}</p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 12px; color: var(--dew-text-faint);">{{ formatRelativeTime(item.created_at) }}</span>
                <DewButton v-if="!item.is_read" type="ghost" size="sm" @click.stop="markAsRead(item.id)">
                  标记已读
                </DewButton>
              </div>
            </div>

            <!-- 未读蓝点 -->
            <div v-if="!item.is_read" class="unread-dot"></div>
          </div>
        </DewCard>
      </div>

      <!-- 分页 -->
      <div v-if="pagedList.length > 0 && total > pageSize" class="pagination">
        <DewButton size="sm" :disabled="currentPage === 1" @click="currentPage--">上一页</DewButton>
        <span style="font-size: 13px; color: var(--dew-text-faint);">{{ currentPage }} / {{ totalPages }}</span>
        <DewButton size="sm" :disabled="currentPage === totalPages" @click="currentPage++">下一页</DewButton>
      </div>
    </DewCard>

    <!-- 系统通知详情弹窗 -->
    <DewDialog v-model="detailVisible" title="通知详情" :width="600">
      <div v-if="selectedNotice" class="notice-detail">
        <div class="detail-row--title">
          <span class="detail-value-title">{{ selectedNotice.title }}</span>
          <DewTag v-if="selectedNotice.is_important" type="danger" size="sm" :round="true">重要</DewTag>
        </div>
        <p class="detail-content">{{ selectedNotice.content }}</p>
        <div class="detail-meta">
          <span class="detail-cat">{{ selectedNotice.category === 'camp' ? '营期通知' : '系统通知' }}</span>
          <span class="detail-time">{{ formatRelativeTime(selectedNotice.created_at) }}</span>
        </div>
      </div>
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Bell } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { DewButton, DewButtonBar, DewCard, DewTag, DewDialog, DewSkeleton } from '../ui'
import { useNotifications, formatRelativeTime } from '../../composables/useNotifications'

const router = useRouter()

// 系统通知详情弹窗
const detailVisible = ref(false)
const selectedNotice = ref(null)

// 共享状态（与 NotificationBell 共用同一份数据）
const {
  notificationList,
  unreadCount,
  totalCount,
  loading,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
} = useNotifications()

const activeFilter = ref('all')
const currentPage = ref(1)
const pageSize = 20

// 统计
const total = computed(() => filteredList.value.length)

// 筛选栏选项
const filterItems = computed(() => [
  { value: 'all', label: '全部', icon: Bell },
  { value: 'system', label: '系统', icon: Bell },
  { value: 'camp', label: '营期', icon: Bell },
  { value: 'unread', label: '未读', icon: Bell, badge: unreadCount.value || undefined },
])

// 筛选 + 分页
const filteredList = computed(() => {
  let list = notificationList.value
  if (activeFilter.value === 'system') {
    list = list.filter(n => n.category === 'system')
  } else if (activeFilter.value === 'camp') {
    list = list.filter(n => n.category === 'camp')
  } else if (activeFilter.value === 'unread') {
    list = list.filter(n => !n.is_read)
  }
  return list
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredList.value.length / pageSize)))
const pagedList = computed(() =>
  filteredList.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
)

watch(activeFilter, () => { currentPage.value = 1 })

// 交互
function handleClick(item) {
  if (!item.is_read) markAsRead(item.id)
  // 系统通知：弹详情，不跳转
  if (item.category === 'system') {
    selectedNotice.value = item
    detailVisible.value = true
    return
  }
  // 营期通知：按 source_type 跳转到对应处理页
  if (item.category === 'camp') {
    const sid = item.camp_session_id
    switch (item.source_type) {
      case 'leave':
        router.push({ path: '/camp', query: { tab: 'leave', sid } })
        break
      case 'join_request':
        router.push('/camp')
        break
      case 'reward':
        router.push('/medal/user-medal')
        break
      case 'mentor_selection':
        router.push({ path: '/camp', query: { tab: 'ms', sid } })
        break
      default:
        router.push('/camp')
    }
  }
}

function handleMarkAllAsRead() {
  // 在分类 tab 下只标记该分类，避免把营期/系统通知一起标掉
  const cat = (activeFilter.value === 'camp' || activeFilter.value === 'system') ? activeFilter.value : null
  markAllAsRead(cat)
  ElMessage.success(cat ? `已将「${cat === 'camp' ? '营期' : '系统'}」通知标记为已读` : '已全部标记为已读')
}

// 初始化：拉取数据
onMounted(() => fetchNotifications())
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: var(--dew-text-faint);
}

.notification-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(156, 163, 175, 0.1);
}

.notification-content {
  font-size: 13px;
  color: var(--dew-text-muted);
  line-height: 1.5;
  margin: 0 0 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  flex-shrink: 0;
  margin-top: 8px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--dew-card-divider);
}

/* 通知详情弹窗 */
.notice-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.detail-row--title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.detail-value-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--dew-text-heading);
}
.detail-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--dew-text);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
.detail-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--dew-card-divider);
}
.detail-cat {
  font-size: 12px;
  color: var(--dew-text-muted);
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(156, 163, 175, 0.12);
}
.detail-time {
  font-size: 12px;
  color: var(--dew-text-faint);
}
</style>
