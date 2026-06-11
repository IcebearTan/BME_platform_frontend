<template>
  <div>
    <!-- Tab 筛选栏 -->
    <DewButtonBar :items="messageTabItems" v-model="activeTab" />

    <!-- 小组通知子分类 -->
    <div v-if="activeTab === 'group'" style="margin-top: 12px;">
      <DewButtonBar :items="groupSubTabItems" v-model="activeGroupSubTab" size="sm" />
    </div>

    <!-- 消息列表 -->
    <DewCard style="margin-top: 16px;" size="lg" :no-hover="true">
      <!-- 列表头 -->
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 13px; color: #9ca3af;">{{ getCurrentTabLabel }} · {{ filteredMessages.length }} 条</span>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredMessages.length === 0" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 0; color: #d1d5db;">
        <svg style="width: 40px; height: 40px; margin-bottom: 10px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <span style="font-size: 14px;">暂无{{ getCurrentTabLabel }}消息</span>
      </div>

      <!-- 消息列表 -->
      <div v-else style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">
        <DewCard
          v-for="message in paginatedMessages"
          :key="message.id"
          :interactive="true"
          variant="inset"
          size="sm"
          @click="handleMessageClick(message)"
        >
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <!-- 图标 -->
            <div
              :style="{
                width: '36px', height: '36px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: '0',
                background: getMessageStyle(getMessageType(message)).bg,
              }"
            >
              <component
                :is="getMessageIcon(getMessageType(message))"
                :style="{ width: '18px', height: '18px', color: getMessageStyle(getMessageType(message)).color }"
              />
            </div>

            <!-- 内容 -->
            <div style="flex: 1; min-width: 0;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span
                  :style="{
                    fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: message.is_read ? '500' : '600',
                    color: message.is_read ? '#6b7280' : '#1f2937',
                  }"
                >{{ message.title }}</span>
                <DewTag :type="getMessageTagType(getMessageType(message))" size="sm" :round="true">
                  {{ getMessageTypeLabel(getMessageType(message)) }}
                </DewTag>
              </div>
              <p style="font-size: 13px; color: #9ca3af; line-height: 1.5; margin: 0 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                {{ message.content }}
              </p>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span style="font-size: 12px; color: #d1d5db;">{{ formatTime(message.create_time) }}</span>
                <div style="display: flex; gap: 6px;">
                  <DewButton v-if="!message.is_read" type="ghost" size="sm" @click.stop="markAsRead(message.id)">
                    标记已读
                  </DewButton>
                  <DewButton type="ghost" size="sm" @click.stop="handleMessageNavigation(message)">
                    {{ getNavigationButtonText(message) }}
                  </DewButton>
                </div>
              </div>
            </div>

            <!-- 未读蓝点 -->
            <div
              v-if="!message.is_read"
              style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; margin-top: 8px;"
            ></div>
          </div>
        </DewCard>
      </div>

      <!-- 分页 -->
      <div
        v-if="filteredMessages.length > pageSize"
        style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.04);"
      >
        <DewButton size="sm" :disabled="currentPage === 1" @click="currentPage = Math.max(1, currentPage - 1)">上一页</DewButton>
        <span style="font-size: 13px; color: #9ca3af;">{{ currentPage }} / {{ totalPages }}</span>
        <DewButton size="sm" :disabled="currentPage === totalPages" @click="currentPage = Math.min(totalPages, currentPage + 1)">下一页</DewButton>
      </div>
    </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { Bell, Document, User, Edit, Message, Setting, Star } from '@element-plus/icons-vue'
import api from '../../api'
import { DewButton, DewButtonBar, DewCard, DewTag } from '../ui'
import { mockNotifications, mockNotificationApiResponses, calculateUnreadCount } from '../../mock/notificationData'
import { mockApiRequest } from '../../mock/config'

const notifications = ref({})
const totalUnread = ref(0)
const isLoading = ref(true)

const router = useRouter()
const store = useStore()

const activeTab = ref('all')
const activeGroupSubTab = ref('all')
const currentPage = ref(1)
const pageSize = 20

// DewButtonBar 选项数据
const messageTabs = [
  { key: 'all', label: '全部', icon: Bell },
  { key: 'group', label: '小组通知', icon: User },
  { key: 'system', label: '系统', icon: Setting }
]

const messageTabItems = computed(() =>
  messageTabs.map(tab => ({
    value: tab.key,
    label: tab.label,
    icon: tab.icon,
    badge: getUnreadCount(tab.key) || undefined,
  }))
)

const groupSubTabs = [
  { key: 'all', label: '全部' },
  { key: 'task', label: '任务发布' },
  { key: 'homework', label: '作业批改' },
  { key: 'leave', label: '请假反馈' },
]

const groupSubTabItems = computed(() =>
  groupSubTabs.map(sub => ({
    value: sub.key,
    label: sub.label,
    badge: sub.key !== 'all' ? getUnreadCount(sub.key) || undefined : undefined,
  }))
)

const ACTIVE_TAB_KEY = 'student-notification-active-tab'

const allMessages = computed(() =>
  Object.values(notifications.value).flat().sort((a, b) => new Date(b.create_time) - new Date(a.create_time))
)

const getCurrentMessages = computed(() => {
  if (activeTab.value === 'all') return allMessages.value
  if (activeTab.value === 'group') {
    if (activeGroupSubTab.value === 'all') {
      return [...(notifications.value.task || []), ...(notifications.value.homework || []), ...(notifications.value.leave || [])]
        .sort((a, b) => new Date(b.create_time) - new Date(a.create_time))
    }
    return notifications.value[activeGroupSubTab.value] || []
  }
  return notifications.value[activeTab.value] || []
})

const getCurrentTabLabel = computed(() => messageTabs.find(t => t.key === activeTab.value)?.label || '')
const filteredMessages = computed(() => getCurrentMessages.value)
const totalPages = computed(() => Math.ceil(filteredMessages.value.length / pageSize))
const paginatedMessages = computed(() => filteredMessages.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))

const switchTab = (tabKey) => {
  // DewButtonBar emits the value directly via v-model
}
const switchGroupSubTab = (subTabKey) => {
  // handled by v-model
}

const restoreActiveTab = () => {
  const s = localStorage.getItem(ACTIVE_TAB_KEY)
  if (s && messageTabs.some(t => t.key === s)) activeTab.value = s
}

// 当 tab 切换时重置分页
import { watch } from 'vue'
watch(activeTab, () => { currentPage.value = 1 })
watch(activeGroupSubTab, () => { currentPage.value = 1 })

const getUnreadCount = (type) => {
  if (type === 'all') return totalUnread.value
  if (type === 'group') return ['task', 'homework', 'leave'].reduce((sum, k) => sum + (notifications.value[k] || []).filter(m => !m.is_read).length, 0)
  return notifications.value[type]?.filter(m => !m.is_read).length || 0
}

const getMessageType = (message) => {
  for (const [type, msgs] of Object.entries(notifications.value)) { if (msgs.some(m => m.id === message.id)) return type }
  return 'other'
}

const getMessageIcon = (type) => ({ task: Document, homework: Edit, leave: Message, system: Setting }[type] || Document)
const getMessageStyle = (type) => ({
  task: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  homework: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  leave: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  system: { bg: 'rgba(156,163,175,0.1)', color: '#9ca3af' },
}[type] || { bg: 'rgba(156,163,175,0.1)', color: '#9ca3af' })

// 将消息类型映射到 DewTag 的 type
const getMessageTagType = (type) => ({
  task: 'primary',
  homework: 'success',
  leave: 'warning',
  system: 'neutral',
}[type] || 'neutral')

const getMessageTypeLabel = (type) => ({ task: '任务', homework: '作业', leave: '请假', system: '系统' }[type] || '其他')

const handleMessageClick = async (message) => {
  if (!message.is_read) await markAsRead(message.id)
  handleMessageNavigation(message)
}

const markAsRead = async (messageId) => {
  try {
    await mockApiRequest(() => api.post(`/notification/mark-read`, { messageId }), () => mockNotificationApiResponses.markAsRead(messageId))
    Object.values(notifications.value).forEach(msgs => { if (Array.isArray(msgs)) { const m = msgs.find(m => m.id === messageId); if (m) m.is_read = true } })
    totalUnread.value = calculateUnreadCount(notifications.value)
  } catch (e) { console.error('标记已读失败:', e) }
}

const handleMessageNavigation = async (message) => {
  const { source_type, related_info_id, group_id, task_id, group_name } = message
  try {
    if (source_type === '2') {
      if (group_id && group_id !== '0') { router.push({ name: 'study-group-details', params: { groupId: group_id }, query: { group_name: group_name || '未知小组', taskId: related_info_id, tab: 'tasks' } }); return }
      const r = await mockApiRequest(() => api.get(`/task/detail?id=${related_info_id}`), () => mockNotificationApiResponses.getTaskDetail(related_info_id))
      r.code === 200 && r.data ? router.push({ name: 'study-group-details', params: { groupId: r.data.group_id }, query: { group_name: r.data.group_name || '未知小组', taskId: related_info_id, tab: 'tasks' } }) : router.push({ name: 'study-groups' })
    } else if (source_type === '1') {
      if (group_id && group_id !== '0' && task_id) { router.push({ name: 'study-group-details', params: { groupId: group_id }, query: { group_name: group_name || '未知小组', taskId: task_id, homeworkId: related_info_id, tab: 'tasks' } }); return }
      const r = await mockApiRequest(() => api.get(`/homework/detail?id=${related_info_id}`), () => mockNotificationApiResponses.getHomeworkDetail(related_info_id))
      r.code === 200 && r.data ? router.push({ name: 'study-group-details', params: { groupId: r.data.group_id }, query: { group_name: r.data.group_name || '未知小组', taskId: r.data.task_id, homeworkId: related_info_id, tab: 'tasks' } }) : router.push({ name: 'study-groups' })
    } else if (source_type === '8') {
      group_id && group_id !== '0' ? router.push({ name: 'study-group-details', params: { groupId: group_id }, query: { group_name: group_name || '未知小组', tab: 'leave' } }) : router.push({ name: 'study-groups', query: { highlight: 'leave' } })
    } else if (source_type === '9') {
      router.push({ name: 'user-info' })
    } else { router.push({ name: 'user-center' }) }
  } catch (e) { console.error('跳转失败:', e); router.push({ name: 'study-groups' }) }
}

const getNavigationButtonText = (message) => ({ '2': '查看任务', '1': '查看作业', '8': '查看请假', '9': '查看详情' }[message.source_type] || '查看详情')

const formatTime = (timeStr) => {
  const diff = Date.now() - new Date(timeStr).getTime()
  const d = Math.floor(diff / 86400000), h = Math.floor(diff / 3600000), m = Math.floor(diff / 60000)
  return d > 0 ? `${d}天前` : h > 0 ? `${h}小时前` : m > 0 ? `${m}分钟前` : '刚刚'
}

const loadNotifications = async () => {
  try {
    isLoading.value = true
    const r = await mockApiRequest(async () => { const res = await api.get('/notifications'); return res.data }, () => mockNotificationApiResponses.getAllNotifications())
    if (r.code === 200) { notifications.value = r.data.notifications; totalUnread.value = r.data.total_unread }
    else throw new Error('API错误')
  } catch (e) {
    console.error('加载失败:', e)
    notifications.value = mockNotifications
    totalUnread.value = calculateUnreadCount(mockNotifications)
  } finally { isLoading.value = false }
}

onMounted(async () => { restoreActiveTab(); await loadNotifications() })
</script>
