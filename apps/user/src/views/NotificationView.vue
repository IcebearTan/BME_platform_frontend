<template>
  <div :class="['notification-view', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <MenuComponent />
      </el-header>
      <el-main class="main-container">
        <div class="max-w-[960px] mx-auto px-[20px] py-[24px]">
          <!-- 页面标题栏 -->
          <div class="flex justify-between items-center mb-[20px]">
            <div class="flex items-center gap-[10px]">
              <span class="inline-block w-[4px] h-[20px] rounded-full bg-gradient-to-b from-blue-500 to-blue-400"></span>
              <h1 class="text-[18px] font-semibold text-gray-800 leading-none">消息中心</h1>
              <span
                v-if="totalUnread > 0"
                class="inline-flex items-center justify-center min-w-[20px] h-[20px] px-[6px]
                       text-[12px] font-medium text-white bg-red-500 rounded-full leading-none"
              >
                {{ totalUnread }}
              </span>
            </div>

            <div class="flex gap-[10px]">
              <button
                v-if="totalUnread > 0"
                @click="markAllAsRead"
                class="inline-flex items-center gap-[6px] px-[14px] py-[7px]
                       text-[13px] text-white bg-blue-500 rounded-[6px] cursor-pointer
                       hover:bg-blue-600 active:bg-blue-700 transition-colors"
              >
                <Check class="w-[14px] h-[14px]" />
                全部已读
              </button>
            </div>
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
      </el-main>
      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { Check, Refresh } from '@element-plus/icons-vue'
import api from '../api'
import MenuComponent from '../components/MenuComponent.vue'
import PageFooterComponent from '../components/PageFooterComponent.vue'
import TeacherNotificationComponent from '../components/Notification/TeacherNotificationComponent.vue'
import StudentNotificationComponent from '../components/Notification/StudentNotificationComponent.vue'
import { mockNotifications, calculateUnreadCount } from '../mock/notificationData.js'

const router = useRouter()
const store = useStore()
const isDarkMode = computed(() => store.state.isDarkMode)

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
const refreshing = ref(false) // 添加刷新状态

// 用户身份判断
const isTeacher = computed(() => {
  return store.state.user?.User_Mode === 'admin'
})

// 方法
const fetchNotifications = async () => {
  loading.value = true
  try {
    // 如果是教师，直接使用mock数据进行测试
    if (isTeacher.value) {
      // 使用mock数据
      notifications.value = mockNotifications
      totalUnread.value = calculateUnreadCount(mockNotifications)
      
      ElMessage.success('已加载小组管理测试数据')
    } else {
      // 学生端仍然使用API
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
  if (refreshing.value) return // 防止重复点击
  
  refreshing.value = true
  try {
    await fetchNotifications()
    ElMessage.success('消息已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  } finally {
    // 确保动画至少播放1秒，提供良好的视觉反馈
    setTimeout(() => {
      refreshing.value = false
    }, 1000)
  }
}

const markAsRead = async (messageId) => {
  try {
    await api.post('/information/reminder/read', { id: messageId })
    // 更新本地状态
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
    // 更新本地状态
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
  // 处理快速回复功能
  ElMessage.info('快速回复功能开发中...')
  console.log('快速回复消息:', message)
}

// 定时刷新消息
let refreshTimer = null

onMounted(() => {
  // 页面加载时添加loading状态
  loading.value = true
  
  fetchNotifications().finally(() => {
    // 确保有最小加载时间，避免闪烁
    setTimeout(() => {
      loading.value = false
    }, 200)
  })
  
  // 每30秒刷新一次消息
  refreshTimer = setInterval(fetchNotifications, 30000)
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
})
</script>

<style scoped>
.common-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.header-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  height: 60px;
}

.theme-light .header-container {
  border-bottom: solid 1px #e6e6e6;
  background-color: #ffffff;
}

.theme-dark .header-container {
  border-bottom: solid 1px #34495e;
  background-color: #2c3e50;
}

.main-container {
  padding: 20px;
  min-height: calc(100vh - 60px);
}

.theme-light .main-container {
  background-color: #f5f7fa;
}

.theme-dark .main-container {
  background-color: #1a1a2e;
}
</style>

<style>
.el-header {
  padding: 0;
}

.page-footer {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 10px;
  background-color: #252525;
  width: 100%;
  min-height: 400px;
  color: #ffffff;
}
</style>
