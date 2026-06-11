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
          <DewBadge v-if="totalUnread > 0" :value="totalUnread" type="danger" />
        </div>

        <DewButton v-if="totalUnread > 0" size="sm" @click="markAllAsRead">
          <Check style="width: 14px; height: 14px;" />
          全部已读
        </DewButton>
      </div>

      <!-- 根据用户身份加载对应的组件 -->
      <TeacherNotificationComponent
        v-if="isTeacher"
        :notifications="notifications"
        :total-unread="totalUnread"
        @mark-read="markAsRead"
        @mark-all-read="markAllAsRead"
        @refresh="refreshMessages"
        @quick-reply="handleQuickReply"
      />

      <StudentNotificationComponent
        v-else
        @refresh="refreshMessages"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { Check, Refresh } from '@element-plus/icons-vue'
import api from '../api'
import MenuComponent from '../components/MenuComponent.vue'
import TeacherNotificationComponent from '../components/Notification/TeacherNotificationComponent.vue'
import StudentNotificationComponent from '../components/Notification/StudentNotificationComponent.vue'
import { DewButton, DewBadge } from '../components/ui'
import { mockNotifications, calculateUnreadCount } from '../mock/notificationData.js'

const router = useRouter()
const store = useStore()

// 响应式数据
const notifications = ref({
  task: [],
  homework: [],
  leave: [],
  notice: [],
  error: [],
  teaching: [],
  student_management: [],
  analytics: [],
  system: [],
  other: []
})

const totalUnread = ref(0)
const loading = ref(false)
const refreshing = ref(false)

// 用户身份判断
const isTeacher = computed(() => {
  return store.state.user?.User_Mode === 'admin'
})

// 方法
const fetchNotifications = async () => {
  loading.value = true
  try {
    if (isTeacher.value) {
      notifications.value = mockNotifications
      totalUnread.value = calculateUnreadCount(mockNotifications)
      ElMessage.success('已加载小组管理测试数据')
    } else {
      const response = await api.get('/information/reminder/query')
      if (response.data.code === 200) {
        notifications.value = response.data.data.reminders
        totalUnread.value = response.data.data.total_unread
      }
    }
  } catch (error) {
    console.error('获取消息失败:', error)
    ElMessage.error('获取消息失败')
  } finally {
    loading.value = false
  }
}

const refreshMessages = async () => {
  if (refreshing.value) return
  refreshing.value = true
  try {
    await fetchNotifications()
    ElMessage.success('消息已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    setTimeout(() => { refreshing.value = false }, 1000)
  }
}

const markAsRead = async (messageId) => {
  try {
    await api.post('/information/reminder/read', { id: messageId })
    Object.values(notifications.value).forEach(msgList => {
      const msg = msgList.find(m => m.id === messageId)
      if (msg) {
        msg.is_read = true
        totalUnread.value = Math.max(0, totalUnread.value - 1)
      }
    })
    ElMessage.success('已标记为已读')
  } catch (error) {
    console.error('标记消息已读失败:', error)
    ElMessage.error('操作失败')
  }
}

const markAllAsRead = async () => {
  try {
    await api.post('/information/reminder/read_all')
    Object.values(notifications.value).forEach(msgList => {
      msgList.forEach(msg => msg.is_read = true)
    })
    totalUnread.value = 0
    ElMessage.success('已标记全部消息为已读')
  } catch (error) {
    console.error('全部标记已读失败:', error)
    ElMessage.error('操作失败')
  }
}

const handleQuickReply = (message) => {
  ElMessage.info('快速回复功能开发中...')
  console.log('快速回复消息:', message)
}

// 定时刷新消息
let refreshTimer = null

onMounted(() => {
  loading.value = true
  fetchNotifications().finally(() => {
    setTimeout(() => { loading.value = false }, 200)
  })
  refreshTimer = setInterval(fetchNotifications, 30000)
})

onUnmounted(() => {
  if (refreshTimer) { clearInterval(refreshTimer) }
})
</script>
