<template>
  <div>
    <!-- Tab 筛选栏 -->
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 16px;">
      <button
        v-for="tab in messageTabs"
        :key="tab.key"
        @click="switchTab(tab.key)"
        :style="{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '7px 16px', borderRadius: '20px', fontSize: '13px',
          cursor: 'pointer', border: '1px solid',
          transition: 'all 0.2s',
          background: activeTab === tab.key ? '#1f2937' : '#fff',
          color: activeTab === tab.key ? '#fff' : '#777',
          borderColor: activeTab === tab.key ? '#1f2937' : '#e5e7eb',
        }"
      >
        <component :is="tab.icon" style="width: 14px; height: 14px;" />
        <span>{{ tab.label }}</span>
        <span
          v-if="getUnreadCount(tab.key) > 0"
          :style="{
            minWidth: '18px', height: '18px', padding: '0 5px',
            borderRadius: '10px', fontSize: '11px', fontWeight: '500',
            lineHeight: '18px', textAlign: 'center',
            background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : '#fef2f2',
            color: activeTab === tab.key ? '#fff' : '#ef4444',
          }"
        >{{ getUnreadCount(tab.key) }}</span>
      </button>
    </div>

    <!-- 小组通知子分类 -->
    <div v-if="activeTab === 'group'" style="display: flex; align-items: center; gap: 4px; margin-bottom: 14px; padding-left: 4px;">
      <button
        v-for="sub in [{ key: 'all', label: '全部' }, ...groupSubTabs]"
        :key="sub.key"
        @click="switchGroupSubTab(sub.key)"
        :style="{
          padding: '5px 12px', borderRadius: '6px', fontSize: '12px',
          cursor: 'pointer', border: 'none', background: 'transparent',
          transition: 'all 0.15s',
          color: activeGroupSubTab === sub.key ? '#3b82f6' : '#999',
          fontWeight: activeGroupSubTab === sub.key ? '600' : '400',
        }"
      >{{ sub.label }}</button>
    </div>

    <!-- 消息列表容器 -->
    <div style="background: #fff; border-radius: 12px; border: 1px solid #f0f0f0; overflow: hidden;">
      <!-- 列表头 -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; borderBottom: '1px solid #fafafa';">
        <span style="font-size: 13px; color: #bbb;">{{ getCurrentTabLabel }} · {{ filteredMessages.length }} 条</span>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredMessages.length === 0" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 0; color: #ddd;">
        <svg style="width: 40px; height: 40px; margin-bottom: 10px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <span style="font-size: 14px;">暂无{{ getCurrentTabLabel }}消息</span>
      </div>

      <!-- 消息列表 -->
      <div v-else>
        <div
          v-for="message in paginatedMessages"
          :key="message.id"
          @click="handleMessageClick(message)"
          :style="{
            display: 'flex', alignItems: 'flex-start', gap: '14px',
            padding: '14px 20px', cursor: 'pointer',
            transition: 'background 0.15s',
            background: !message.is_read ? 'rgba(239,246,255,0.5)' : 'transparent',
            borderBottom: '1px solid #fafafa',
          }"
          @mouseenter="$event.currentTarget.style.background = '#f9fafb'"
          @mouseleave="$event.currentTarget.style.background = !message.is_read ? 'rgba(239,246,255,0.5)' : 'transparent'"
        >
          <!-- 图标 -->
          <div
            :style="{
              width: '36px', height: '36px', borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: '0', marginTop: '2px',
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
                  color: message.is_read ? '#666' : '#111',
                }"
              >{{ message.title }}</span>
              <span
                :style="{
                  flexShrink: '0', fontSize: '11px', padding: '1px 8px',
                  borderRadius: '10px', fontWeight: '500',
                  background: getMessageStyle(getMessageType(message)).bg,
                  color: getMessageStyle(getMessageType(message)).color,
                }"
              >{{ getMessageTypeLabel(getMessageType(message)) }}</span>
            </div>
            <p style="font-size: 13px; color: #999; line-height: 1.5; margin: 0 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              {{ message.content }}
            </p>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 12px; color: #ccc;">{{ formatTime(message.create_time) }}</span>
              <div style="display: flex; gap: 4px;">
                <button
                  v-if="!message.is_read"
                  @click.stop="markAsRead(message.id)"
                  style="font-size: 12px; color: #3b82f6; background: none; border: none; cursor: pointer; padding: 2px 6px; border-radius: 4px;"
                  @mouseenter="$event.target.style.background = '#eff6ff'"
                  @mouseleave="$event.target.style.background = 'none'"
                >标记已读</button>
                <button
                  @click.stop="handleMessageNavigation(message)"
                  style="font-size: 12px; color: #aaa; background: none; border: none; cursor: pointer; padding: 2px 6px; border-radius: 4px;"
                  @mouseenter="$event.target.style.background = '#f3f4f6'"
                  @mouseleave="$event.target.style.background = 'none'"
                >{{ getNavigationButtonText(message) }}</button>
              </div>
            </div>
          </div>

          <!-- 未读蓝点 -->
          <div
            v-if="!message.is_read"
            style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; flex-shrink: 0; margin-top: 8px;"
          ></div>
        </div>
      </div>

      <!-- 分页 -->
      <div
        v-if="filteredMessages.length > pageSize"
        style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 14px 0; border-top: 1px solid #fafafa;"
      >
        <button
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          :style="{
            padding: '6px 14px', fontSize: '13px', color: '#666', background: '#fff',
            border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer',
            opacity: currentPage === 1 ? '0.3' : '1',
          }"
        >上一页</button>
        <span style="font-size: 13px; color: #999;">{{ currentPage }} / {{ totalPages }}</span>
        <button
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          :style="{
            padding: '6px 14px', fontSize: '13px', color: '#666', background: '#fff',
            border: '1px solid #e5e7eb', borderRadius: '6px', cursor: 'pointer',
            opacity: currentPage === totalPages ? '0.3' : '1',
          }"
        >下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'
import { Bell, Document, User, Edit, Message, Setting, Star } from '@element-plus/icons-vue'
import api from '../../api'
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

const messageTabs = [
  { key: 'all', label: '全部', icon: Bell },
  { key: 'group', label: '小组通知', icon: User },
  { key: 'system', label: '系统', icon: Setting }
]

const groupSubTabs = [
  { key: 'task', label: '任务发布' },
  { key: 'homework', label: '作业批改' },
  { key: 'leave', label: '请假反馈' }
]

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
const groupMessages = computed(() =>
  (notifications.value.task || []).length + (notifications.value.homework || []).length + (notifications.value.leave || []).length
)

const switchTab = (tabKey) => { activeTab.value = tabKey; currentPage.value = 1; if (tabKey === 'group') activeGroupSubTab.value = 'all'; localStorage.setItem(ACTIVE_TAB_KEY, tabKey) }
const switchGroupSubTab = (subTabKey) => { activeGroupSubTab.value = subTabKey; currentPage.value = 1 }
const restoreActiveTab = () => { const s = localStorage.getItem(ACTIVE_TAB_KEY); if (s && messageTabs.some(t => t.key === s)) activeTab.value = s }

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
  task: { bg: '#eff6ff', color: '#3b82f6' },
  homework: { bg: '#ecfdf5', color: '#10b981' },
  leave: { bg: '#fffbeb', color: '#f59e0b' },
  system: { bg: '#f3f4f6', color: '#9ca3af' },
}[type] || { bg: '#f3f4f6', color: '#9ca3af' })
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
