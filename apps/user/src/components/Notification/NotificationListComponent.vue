<template>
  <div>
    <!-- 统计 + 全部已读（分类 tab 条已上移至 NotificationInbox 顶部，横贯列表与详情两栏） -->
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <div style="display: flex; gap: 16px;">
        <div style="font-size: 13px; color: var(--dew-text-muted);">
          共 <span style="font-weight: 600; color: var(--dew-text-heading);">{{ total }}</span> {{ totalLabel }}
        </div>
        <div v-if="currentUnread > 0" style="font-size: 13px; color: var(--color-primary);">
          <span style="font-weight: 600;">{{ currentUnread }}</span> 条未读
        </div>
      </div>
      <DewButton v-if="activeFilter !== 'message' && unreadCount > 0" type="ghost" size="sm" @click="handleMarkAllAsRead">
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
        <span style="font-size: 14px;">{{ emptyText }}</span>
      </div>

      <!-- 通知卡片列表 -->
      <div v-else-if="activeFilter !== 'message'" style="display: flex; flex-direction: column; gap: 6px;">
        <DewCard
          v-for="item in pagedList"
          :key="item.id"
          :class="{ 'list-item--selected': item.id === selectedId }"
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

      <!-- 感谢信卡片列表（导生侧） -->
      <div v-else style="display: flex; flex-direction: column; gap: 6px;">
        <DewCard
          v-for="letter in pagedList"
          :key="letter.id"
          :class="{ 'list-item--selected': letter.id === selectedId }"
          :interactive="true"
          variant="inset"
          size="sm"
          @click="handleLetterClick(letter)"
        >
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <!-- 图标 -->
            <div class="notification-icon notification-icon--letter">
              <component :is="ChatDotRound" style="width: 18px; height: 18px; color: var(--color-success);" />
            </div>

            <!-- 内容 -->
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span
                  :style="{
                    fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: letter.is_read ? '500' : '600',
                    color: letter.is_read ? 'var(--dew-text-muted)' : 'var(--dew-text-heading)',
                  }"
                >{{ letter.sender?.username }} 的感谢信</span>
              </div>
              <p class="notification-content">{{ letter.content }}</p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 12px; color: var(--dew-text-faint);">{{ formatRelativeTime(letter.created_at) }}</span>
              </div>
            </div>

            <!-- 未读蓝点 -->
            <div v-if="!letter.is_read" class="unread-dot"></div>
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
          <span class="detail-cat">{{ categoryLabel(selectedNotice.category) }}</span>
          <span class="detail-time">{{ formatRelativeTime(selectedNotice.created_at) }}</span>
        </div>
      </div>
    </DewDialog>

    <!-- 感谢信详情弹窗（仅移动端单栏时使用） -->
    <DewDialog v-model="letterDetailVisible" title="感谢信" :width="520">
      <GratitudeLetterDetail v-if="mobileLetter" :letter="mobileLetter" />
    </DewDialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Bell, ChatDotRound } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { DewButton, DewCard, DewTag, DewDialog, DewSkeleton } from '@bme/dew-ui'
import { useNotifications, formatRelativeTime } from '../../composables/useNotifications'
import { useNotificationTabs } from '../../composables/useNotificationTabs'
import { notificationTarget } from '../../composables/notificationTarget'
import { useGratitude } from '../../composables/useGratitude'
import GratitudeLetterDetail from '../Gratitude/GratitudeLetterDetail.vue'

const props = defineProps({
  /** 当前筛选 tab（受控：由 NotificationInbox 持有并同步到 URL；tab 条在容器顶部） */
  tab: { type: String, default: 'all' },
  /** 右栏当前选中的通知/信件 id（用于左栏选中高亮） */
  selectedId: { type: [Number, String], default: null },
})

const emit = defineEmits(['update:tab', 'select', 'select-letter'])

const router = useRouter()

// 导生身份（私信 tab 可见性 + 信件预载）：与容器共享单例探测，不重复请求
const { isMentor, detectMentor } = useNotificationTabs()

// 系统通知详情弹窗（仅移动端 <900px 使用；桌面端走右栏详情）
const detailVisible = ref(false)
const selectedNotice = ref(null)

// 感谢信详情弹窗（同上，移动端回退）
const letterDetailVisible = ref(false)
const mobileLetter = ref(null)

// 移动端判定：分栏折叠为单栏后，system 通知回退弹窗交互
const isMobile = ref(false)
let mediaQuery = null
const handleMediaChange = (e) => { isMobile.value = e.matches }

// 共享状态（与 NotificationBell 共用同一份数据；未读数为服务端口径）
const {
  notificationList,
  unreadCount,
  totalCount,
  loading,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
} = useNotifications()

// 感谢信共享状态（unreadCount 重命名避免与通知的冲突）
const { letters, unreadCount: letterUnread, fetchLetters, markLetterRead } = useGratitude()

const activeFilter = computed({
  get: () => props.tab,
  set: (v) => { emit('update:tab', v) },
})
const currentPage = ref(1)
const pageSize = 20

// 统计
const total = computed(() => filteredList.value.length)
const totalLabel = computed(() => (activeFilter.value === 'message' ? '封信' : '条通知'))
const currentUnread = computed(() => (activeFilter.value === 'message' ? letterUnread.value : unreadCount.value))
const emptyText = computed(() => (activeFilter.value === 'message' ? '暂无私信' : '暂无通知'))

// 详情弹窗分类文案（查表，新业务域只加一行）
const CATEGORY_LABELS = { system: '系统通知', camp: '营期通知', community: '社区通知', message: '私信' }
const categoryLabel = (c) => CATEGORY_LABELS[c] || '系统通知'

// 筛选 + 分页（message tab 数据源切换为信件表——私信是富内容+独立已读态，不走通知过滤）
const filteredList = computed(() => {
  if (activeFilter.value === 'message') return letters.value
  let list = notificationList.value
  if (activeFilter.value === 'system') {
    list = list.filter(n => n.category === 'system')
  } else if (activeFilter.value === 'camp') {
    list = list.filter(n => n.category === 'camp')
  } else if (activeFilter.value === 'community') {
    list = list.filter(n => n.category === 'community')
  }
  return list
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredList.value.length / pageSize)))
const pagedList = computed(() =>
  filteredList.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize)
)

watch(activeFilter, (tab) => {
  currentPage.value = 1
  // 进入感谢信 tab 时刷新信箱（通知轮询不覆盖信件数据）
  if (tab === 'message' && isMentor.value) fetchLetters()
})

// 交互
function handleClick(item) {
  if (!item.is_read) markAsRead(item.id)
  // 私信域提醒（新行 category=message，存量行 gratitude）：切到私信 tab 并选中对应信件
  if (item.category === 'message' || item.category === 'gratitude') {
    emit('update:tab', 'message')
    const letter = letters.value.find(l => l.id === item.source_id)
    if (letter) emit('select-letter', letter)
    return
  }
  // 系统通知：桌面端右栏展示详情，移动端（单栏）回退弹窗
  if (item.category === 'system') {
    if (isMobile.value) {
      selectedNotice.value = item
      detailVisible.value = true
    } else {
      emit('select', item)
    }
    return
  }
  // 营期通知：按 source_type 深链直达业务对象（映射与铃铛共用 notificationTarget）
  if (item.category === 'camp') {
    router.push(notificationTarget(item))
  }
}

// 信件点击：桌面端右栏展示，移动端回退弹窗（打开即已读由 GratitudeLetterDetail 处理）
function handleLetterClick(letter) {
  if (isMobile.value) {
    mobileLetter.value = letter
    letterDetailVisible.value = true
  } else {
    emit('select-letter', letter)
  }
}

function handleMarkAllAsRead() {
  // 在分类 tab 下只标记该分类，避免把营期/系统通知一起标掉
  const cat = (activeFilter.value === 'camp' || activeFilter.value === 'system') ? activeFilter.value : null
  markAllAsRead(cat)
  ElMessage.success(cat ? `已将「${cat === 'camp' ? '营期' : '系统'}」通知标记为已读` : '已全部标记为已读')
}

// 初始化：拉取数据 + 导生判定并预载信件（供私信域通知点击时定位信件） + 移动端断点监听
onMounted(() => {
  fetchNotifications()
  detectMentor()
  mediaQuery = window.matchMedia('(max-width: 900px)')
  isMobile.value = mediaQuery.matches
  mediaQuery.addEventListener('change', handleMediaChange)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', handleMediaChange)
})
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

/* 感谢信：语义成功色轻底 */
.notification-icon--letter {
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
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

/* 选中态：主色描边 + 轻底色（与右栏详情联动） */
.list-item--selected {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-primary) 55%, transparent);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
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
