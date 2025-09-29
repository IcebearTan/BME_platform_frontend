<template>
  <div
    ref="panelRef"
    class="live-checkin-panel"
    :class="{ 
      expanded: isExpanded,
      collapsed: !isExpanded,
      'theme-dark': isDarkMode,
      'theme-light': !isDarkMode
    }"
  >
    <!-- 展开/折叠专用按钮 -->
    <div class="panel-toggle-button" @click="togglePanel">
      <el-icon class="toggle-icon" :class="{ rotated: !isExpanded }">
        <ArrowDown />
      </el-icon>
    </div>

    <!-- 展开/折叠控制按钮 -->
    <!-- <div class="panel-header" >
      <h2>实时状态面板</h2>
      <el-icon class="toggle-icon" :class="{ rotated: isExpanded }">
        <ArrowDown />
      </el-icon>
    </div> -->

    <!-- 面板内容 -->
    <div class="panel-content" v-show="isExpanded">
      <div class="content-grid">
        <!-- 左侧：问候语、打卡状态和月度统计 -->
        <div class="left-section">
          <transition name="greeting-expand" appear>
            <UserGreeting 
              v-if="isExpanded"
              :user-info="userInfo"
              :show-stats="true"
              :study-stats="studyStats"
              :weather-info="weatherInfo"
              :is-dark-mode="isDarkMode"
              :is-collapsed="false"
              :show-checkin-status="true"
              :checkin-info="checkinInfo"
              @checkin="handleCheckinEvent"
              @checkout="handleCheckoutEvent"
              @request-checkin="showCheckinDialog"
              @request-checkout="showCheckoutDialog"
              @status-change="handleStatusChange"
              key="greeting-expanded"
            />
          </transition>
          
          <!-- 月度统计面板 -->
          <transition name="monthly-stats-expand" appear>
            <MonthlyStatsPanel 
              v-if="shouldShowMonthlyStats"
              :monthly-stats="monthlyStatsData"
              :is-dark-mode="isDarkMode"
              key="monthly-stats-expanded"
            />
          </transition>
        </div>

        <!-- 右侧：实时座位图 -->
        <div class="right-section">
          <!-- 房间标题和切换 -->
          <transition name="room-header-expand" appear>
            <div v-if="isExpanded" class="room-header">
              <transition name="online-stats-expand" appear>
                <div v-if="isExpanded" class="online-stats" 
                     v-show="currentRoom.available">
                  <span class="stats-label">在线</span>
                  <span class="stats-value">{{ onlineCount }}/{{ totalSeats }}</span>
                </div>
              </transition>
              
              <transition name="room-title-expand" appear>
                <h2 v-if="isExpanded" class="room-title">{{ currentRoom.name }}实况</h2>
              </transition>
              
              <transition name="room-switcher-expand" appear>
                <div v-if="isExpanded" class="room-switcher-container">
                  <div 
                    class="room-switcher-track"
                    @click="handleTrackClick"
                  >
                    <div 
                      class="room-switcher-slider"
                      :style="{ transform: `translateX(${currentRoom.id === '106' ? '0%' : '100%'})` }"
                    ></div>
                    <div class="room-switcher-options">
                      <div 
                        v-for="room in availableRooms"
                        :key="room.id"
                        class="room-option"
                        :class="{ 
                          active: currentRoom.id === room.id,
                          disabled: !room.available
                        }"
                      >
                        {{ room.name }}
                      </div>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </transition>
          
          <transition name="seatmap-expand" appear>
            <div v-if="isExpanded" key="seatmap-expanded">
              <SeatMap
                v-if="currentRoom.available"
                ref="seatMapRef"
                :octagon-size="seatMapConfig.size"
                :octagon-radius="seatMapConfig.radius"
                :octagon-corner-radius="8"
                :octagon-gap="seatMapConfig.gap"
                :is-dark-mode="isDarkMode"
                :show-layout-controls="false"
                :current-room-id="currentRoom.id"
                default-layout="octagon"
              />
              <div v-else class="room-unavailable">
                <div class="unavailable-content">
                  <el-icon class="unavailable-icon"><Refresh /></el-icon>
                  <h3>{{ currentRoom.name }}座位图</h3>
                  <p>功能开发中，敬请期待...</p>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 折叠状态的简化内容 -->
    <div class="panel-collapsed-content" v-show="!isExpanded">
      <div class="collapsed-grid">
        <!-- 左侧：保持与展开时相同的占比 -->
        <div class="collapsed-left-section">
          <transition name="greeting-collapse" appear>
            <UserGreeting 
              v-if="!isExpanded"
              :user-info="userInfo"
              :show-stats="false"
              :study-stats="studyStats"
              :weather-info="weatherInfo"
              :is-dark-mode="isDarkMode"
              :is-collapsed="true"
              :show-checkin-status="true"
              :checkin-info="checkinInfo"
              @checkin="handleCheckinEvent"
              @checkout="handleCheckoutEvent"
              @request-checkin="showCheckinDialog"
              @request-checkout="showCheckoutDialog"
              @status-change="handleStatusChange"
              key="greeting-collapsed"
            />
          </transition>
        </div>
        <!-- 右侧：保持占位，但内容简化或隐藏 -->
        <div class="collapsed-right-section">
          <transition-group name="placeholder-collapse" appear tag="div">
            <div v-if="!isExpanded" class="collapsed-placeholder" :key="`placeholder-collapsed-${isExpanded}`">
              <span class="placeholder-text">点击展开查看更多</span>
            </div>
          </transition-group>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useStore } from 'vuex'
import { ElIcon, ElTag, ElButton, ElDialog } from 'element-plus'
import { 
  ArrowDown, 
  Refresh
} from '@element-plus/icons-vue'
import SeatMap from './SeatMap.vue'
import UserGreeting from './UserGreeting.vue'
import CheckinStatus from './CheckinStatus.vue'
import MonthlyStatsPanel from './MonthlyStatsPanel.vue'

// Store
const store = useStore()

// Props
const props = defineProps({
  // 默认是否展开
  defaultExpanded: {
    type: Boolean,
    default: true
  },
  // 默认房间ID
  defaultRoomId: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits(['checkin', 'checkout', 'room-change'])

// 响应式数据
const isExpanded = ref(props.defaultExpanded)
const lastUpdateTime = ref('')
const checkinLoading = ref(false)
const checkoutLoading = ref(false)
const panelRef = ref(null)
const checkinStatusRef = ref(null)
const checkinStatusCollapsedRef = ref(null)
const seatMapRef = ref(null)
const checkinDialogVisible = ref(false)
const checkoutDialogVisible = ref(false)
const checkoutStudyDuration = ref('')
const onlineCount = ref(2)
const totalSeats = ref(5)

// 屏幕尺寸检测
const screenHeight = ref(window.innerHeight)
const screenWidth = ref(window.innerWidth)

// 白天黑夜模式 - 使用全局状态
const isDarkMode = computed(() => store.getters.isDarkMode)

// 用户信息
const userInfo = ref({
  id: 'user123',
  name: '张三',
  avatar: null,
  role: '学生'
})

// 学习统计数据
const studyStats = ref({
  todayHours: '2.5h',
  weekHours: '15.5h',
  totalDays: '7天'
})

// 天气信息
const weatherInfo = ref({
  description: '晴',
  temperature: 25
})

// 房间配置
const availableRooms = ref([
  { id: '106', name: '106', available: true },
  { id: '110', name: '110', available: true }
])

const currentRoom = ref(availableRooms.value[0])

// 座位图大小配置
const seatMapConfig = ref({
  size: 160,
  radius: 100,
  gap: 20
})

// 座位图大小预设
const seatMapPresets = {
  small: { size: 180, radius: 45, gap: 15 },
  medium: { size: 240, radius: 60, gap: 20 },
  large: { size: 400, radius: 100, gap: 25 }
}

// 切换座位图大小
const changeSeatMapSize = (preset) => {
  if (seatMapPresets[preset]) {
    seatMapConfig.value = { ...seatMapPresets[preset] }
  }
}

// 打卡信息 - 使用 store 中的状态
const checkinInfo = computed(() => store.getters.checkinInfo)

// 月度统计数据
const monthlyStatsData = ref({
  totalDays: 0,
  totalHours: 0,
  rank: null
})

// 计算属性
// 判断是否为小屏幕（16寸及以下笔记本，通常高度 <= 1100px）
const isSmallScreen = computed(() => {
  return screenHeight.value <= 900 // 调整阈值以包含16寸屏幕
})

// 判断用户是否正在打卡（已签到但未签退）- 使用 store 的 getter
const isCurrentlyCheckedIn = computed(() => store.getters.isCurrentlyCheckedIn)

// 判断是否应该显示月度统计面板
const shouldShowMonthlyStats = computed(() => {
  // 只有在展开状态下才考虑显示
  if (!isExpanded.value) return false
  
  // 如果是小屏幕且用户正在打卡，则不显示月度统计面板
  if (isSmallScreen.value && isCurrentlyCheckedIn.value) {
    return false
  }
  
  // 其他情况正常显示
  return true
})

// (已移除 checkinStatus，现在由 CheckinStatus 组件内部处理)

// 方法
function togglePanel() {
  isExpanded.value = !isExpanded.value
}

function updateLastUpdateTime() {
  const now = new Date()
  lastUpdateTime.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 更新屏幕尺寸
function updateScreenSize() {
  screenHeight.value = window.innerHeight
  screenWidth.value = window.innerWidth
}

function showCheckinDialog() {
  checkinDialogVisible.value = true
}

function showCheckoutDialog(data) {
  checkoutStudyDuration.value = data.studyDuration
  checkoutDialogVisible.value = true
}

async function handleCheckin() {
  checkinLoading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 根据面板状态调用对应子组件的签到方法
    if (isExpanded.value && checkinStatusRef.value) {
      checkinStatusRef.value.handleCheckin()
    } else if (!isExpanded.value && checkinStatusCollapsedRef.value) {
      checkinStatusCollapsedRef.value.handleCheckin()
    }
    
    checkinDialogVisible.value = false
  } catch (error) {
    // 签到失败处理
  } finally {
    checkinLoading.value = false
  }
}

async function handleCheckout() {
  checkoutLoading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 根据面板状态调用对应子组件的签退方法
    if (isExpanded.value && checkinStatusRef.value) {
      checkinStatusRef.value.handleCheckout()
    } else if (!isExpanded.value && checkinStatusCollapsedRef.value) {
      checkinStatusCollapsedRef.value.handleCheckout()
    }
    
    checkoutDialogVisible.value = false
  } catch (error) {
    // 签退失败处理
  } finally {
    checkoutLoading.value = false
  }
}

function handleCheckinEvent(checkinData) {
  // 更新 store 中的打卡状态
  store.commit('setCheckinInfo', checkinData)
  emit('checkin', checkinData)
}

function handleCheckoutEvent(checkoutData) {
  // 更新 store 中的打卡状态
  store.commit('setCheckinInfo', checkoutData)
  emit('checkout', checkoutData)
}

// 处理CheckinStatus状态变化
function handleStatusChange(checkinData) {
  // 更新 store 中的打卡状态
  store.commit('setCheckinInfo', checkinData)
}

// 房间切换方法
function switchRoom(roomId) {
  const room = availableRooms.value.find(r => r.id === roomId)
  
  if (room) {
    const oldRoom = currentRoom.value
    currentRoom.value = room
    emit('room-change', roomId)
  }
}

// 处理滑块轨道点击
function handleTrackClick() {
  // 找到另一个可用的房间
  const otherRoom = availableRooms.value.find(room => 
    room.id !== currentRoom.value.id && room.available
  )
  
  if (otherRoom) {
    switchRoom(otherRoom.id)
  }
}

function handleRoomChange(roomId) {
  emit('room-change', roomId)
}

// 获取月度统计数据
async function fetchMonthlyStats() {
  try {
    // 这里应该调用实际的API
    // const response = await fetch('/api/monthly_stats')
    // const data = await response.json()
    
    // 临时使用模拟数据
    const mockData = calculateMonthlyStatsFromRecords()
    monthlyStatsData.value = mockData
    
    return mockData
  } catch (error) {
    // 使用备用计算方法
    return calculateMonthlyStatsFromRecords()
  }
}

// 从现有记录计算月度统计（备用方法）
function calculateMonthlyStatsFromRecords() {
  // 模拟计算逻辑
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  // 这里应该基于实际的学习记录进行计算
  // 暂时返回模拟数据
  const mockStats = {
    totalDays: Math.floor(Math.random() * 20) + 5, // 5-25天
    totalHours: Math.floor(Math.random() * 50) + 20, // 20-70小时
    rank: Math.floor(Math.random() * 100) + 1 // 1-100排名
  }
  
  return mockStats
}

// 定时器
let updateTimer = null

// 生命周期
onMounted(() => {
  updateLastUpdateTime()
  
  // 获取月度统计数据
  fetchMonthlyStats()
  
  // 添加屏幕尺寸变化监听器
  window.addEventListener('resize', updateScreenSize)
  
  // 更新时间显示（30秒一次）
  updateTimer = setInterval(() => {
    updateLastUpdateTime()
  }, 30000)
})

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
  // 移除屏幕尺寸监听器
  window.removeEventListener('resize', updateScreenSize)
})

// 监听 SeatMap 的在线人数变化
watch(() => seatMapRef.value?.onlineCount, (newCount) => {
  if (newCount !== undefined) {
    onlineCount.value = newCount
  }
}, { immediate: true })

watch(() => seatMapRef.value?.totalSeats, (newTotal) => {
  if (newTotal !== undefined) {
    totalSeats.value = newTotal
  }
}, { immediate: true })

// 监听房间切换，确保在线人数正确更新
watch(() => currentRoom.value.id, (newRoomId) => {
  // 给Vue一点时间重新渲染SeatMap组件，然后更新统计
  setTimeout(() => {
    if (seatMapRef.value) {
      const stats = seatMapRef.value.getOnlineStats()
      if (stats) {
        onlineCount.value = stats.onlineCount
        totalSeats.value = stats.totalSeats
      }
    }
  }, 100)
}, { immediate: true })

// 监听在线人数变化（调试用）
watch([() => onlineCount.value, () => totalSeats.value], ([newOnline, newTotal]) => {
}, { immediate: true })

// 监听月度统计面板显示状态变化（用于调试）
watch(() => shouldShowMonthlyStats.value, (newValue, oldValue) => {
}, { immediate: true })

// 监听屏幕尺寸变化
watch(() => screenHeight.value, (newHeight) => {
}, { immediate: true })

// 监听打卡状态变化
watch(() => isCurrentlyCheckedIn.value, (newValue) => {
}, { immediate: true })

// 暴露给全局用于测试（在浏览器控制台中可以调用）
if (typeof window !== 'undefined') {
  window.changeSeatMapSize = changeSeatMapSize
  window.getSeatMapConfig = () => seatMapConfig.value
  window.seatMapPresets = seatMapPresets
  // 添加月度统计面板显示状态调试
  window.getScreenInfo = () => ({
    height: screenHeight.value,
    width: screenWidth.value,
    isSmallScreen: isSmallScreen.value,
    isCheckedIn: isCurrentlyCheckedIn.value,
    shouldShowMonthlyStats: shouldShowMonthlyStats.value,
    checkinInfo: checkinInfo.value
  })
  window.toggleCheckinStatus = () => {
    const currentCheckedIn = store.getters.checkinInfo.checkedIn
    const newCheckedIn = !currentCheckedIn
    
    // 更新 store 中的打卡状态
    if (newCheckedIn) {
      store.commit('setCheckinInfo', {
        checkedIn: true,
        checkedOut: false,
        checkinTime: new Date().toLocaleTimeString(),
        checkinTimestamp: Date.now()
      })
    } else {
      store.commit('setCheckinInfo', {
        checkedIn: false,
        checkedOut: false,
        checkinTime: null,
        checkinTimestamp: null
      })
    }
  }
  window.simulateSmallScreen = () => {
    screenHeight.value = 1000 // 模拟16寸以下屏幕
  }
  window.simulateLargeScreen = () => {
    screenHeight.value = 1400 // 模拟大屏幕
  }
  window.simulate16InchScreen = () => {
    screenHeight.value = 1080 // 模拟16寸笔记本 1920x1080
  }
  window.testFullScenario = () => {
    // 测试16寸屏幕 + 打卡状态
    window.simulate16InchScreen()
    if (!store.getters.checkinInfo.checkedIn) {
      window.toggleCheckinStatus()
    }
  }
  // 110教室座位图配置函数
  window.customize110SeatMap = (customConfig) => {
    if (seatMapRef.value) {
      seatMapRef.value.updateRoom110Config(customConfig)
    }
  }
  window.get110SeatConfig = () => {
    if (seatMapRef.value) {
      const config = seatMapRef.value.getRoom110Config()
      return config
    } else {
      return null
    }
  }
  window.regenerate110Seats = () => {
    if (seatMapRef.value) {
      seatMapRef.value.regenerateRoom110Seats()
    }
  }
  // 快速配置示例
  window.example110Configs = {
    // 示例1: 只禁用第一排的边缘座位
    config1: {
      disabledSeats: ['L1-1', 'L1-6', 'R1-1', 'R1-3']
    },
    // 示例2: 禁用多个座位模拟真实情况
    config2: {
      disabledSeats: [
        'L1-1', 'L1-6',    // 第1行边缘
        'L3-3', 'L3-4',    // 第3行中间有设备
        'R3-2',            // 第3行右侧
        'L5-1', 'L5-2',    // 第5行左侧有柱子
        'R5-3',            // 第5行右侧角落
        'L7-5', 'L7-6',    // 第7行右侧
      ]
    },
    // 示例3: 最小配置（只禁用几个关键位置）
    config3: {
      disabledSeats: ['L1-1', 'R7-3']
    }
  }
}
</script>

<style scoped>
.live-checkin-panel {
  width: 100%;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  backdrop-filter: blur(20px);
}

/* 折叠状态高度 */
.live-checkin-panel.collapsed {
  height: 380px;
  min-height: 380px;
}

/* 展开状态高度 */
.live-checkin-panel.expanded {
  height: calc(100vh - 80px);
  min-height: 500px;
  max-height: none;
}

/* 白天主题 - 温暖晴天配色 */
.live-checkin-panel.theme-light {
  background: linear-gradient(135deg, 
    #e0effe 0%,  /* 温暖的米黄色 */
    #ddfffb 20%, /* 浅橙白 */
    #edffc5 32%, /* 淡黄色 */
    #faeaff 48%, /* 温暖金色 */
    #ecfffa 80%, /* 柔和桃色 */
    #ffffff 100% /* 淡粉色 */
  );
  box-shadow: 0-10px 60px rgba(255, 223, 162, 0.25);
}

/* 黑夜主题 - 强烈黑色对比 */
.live-checkin-panel.theme-dark {
  background: linear-gradient(135deg, 
    #000000 0%, 
    #1a1a1a 20%, 
    #2d2d2d 40%, 
    #404040 60%, 
    #525252 80%, 
    #666666 100%
  );
  box-shadow: 0 -10px 60px rgba(199, 199, 199, 0.432);
}

/* 添加星空效果（黑夜模式） */
.live-checkin-panel.theme-dark::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(2px 2px at 20px 30px, #fff, transparent),
    radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 90px 40px, #fff, transparent),
    radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.6), transparent),
    radial-gradient(2px 2px at 160px 30px, #fff, transparent);
  background-repeat: repeat;
  background-size: 200px 100px;
  animation: twinkle 4s ease-in-out infinite alternate;
  opacity: 0.6;
  pointer-events: none;
}

@keyframes twinkle {
  0% { opacity: 0.4; }
  100% { opacity: 0.9; }
}

/* 添加温暖阳光效果（白天模式） */
.live-checkin-panel.theme-light::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.8) 0%, transparent 50%),
    radial-gradient(circle at 80% 30%, rgba(255, 228, 181, 0.6) 0%, transparent 40%),
    radial-gradient(circle at 40% 70%, rgba(255, 248, 220, 0.5) 0%, transparent 35%),
    radial-gradient(circle at 90% 80%, rgba(255, 239, 213, 0.4) 0%, transparent 30%);
  pointer-events: none;
  z-index: 1;
  border-radius: 24px;
  animation: sunlight-dance 20s ease-in-out infinite;
  opacity: 0.7;
}

/* 专用展开/收起按钮样式 */
.panel-toggle-button {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.theme-light .panel-toggle-button {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 4px 12px rgba(135, 206, 235, 0.15);
}

.theme-dark .panel-toggle-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.05);
}

.panel-toggle-button:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.theme-light .panel-toggle-button:hover {
  background: rgba(255, 255, 255, 0.35);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 0 6px 16px rgba(135, 206, 235, 0.2);
}

.theme-dark .panel-toggle-button:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 6px 16px rgba(255, 255, 255, 0.336);
}

.panel-toggle-button .toggle-icon {
  color: white;
  font-size: 16px;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-light .panel-toggle-button .toggle-icon {
  color: #1a365d;
}

.theme-dark .panel-toggle-button .toggle-icon {
  color: #ffffff;
}

.panel-toggle-button .toggle-icon.rotated {
  transform: rotate(180deg);
}

/* @keyframes sunlight-dance {
  0%, 100% { 
    opacity: 0.7;
    transform: scale(1) rotate(0deg);
  }
  25% { 
    opacity: 0.8;
    transform: scale(1.02) rotate(1deg);
  }
  50% { 
    opacity: 0.75;
    transform: scale(1.01) rotate(0deg);
  }
  75% { 
    opacity: 0.8;
    transform: scale(1.02) rotate(-1deg);
  }
} */

.panel-header {
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header:hover {
  background: rgba(255, 255, 255, 0.15);
}

.panel-header h2 {
  margin: 0;
  color: white;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.5px;
}

.toggle-icon {
  color: white;
  font-size: 18px;
  transition: transform 0.3s ease;
}

.toggle-icon.rotated {
  transform: rotate(180deg);
}

.panel-content {
  padding: 32px;
  position: relative;
  z-index: 2;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
  transform: scale(1);
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 32px;
  height: 100%;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 折叠状态的布局 */
.panel-collapsed-content {
  padding: 20px 24px;
  position: relative;
  z-index: 2;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
  transform: scale(1);
}

.collapsed-grid {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 24px;
  height: 100%;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* .collapsed-left-section, .collapsed-right-section {
  height: 100%;
  animation: collapse 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
} */
/* @keyframes collapse {
  0% {
    transform: scaleY(2)
  }
  100% {
    transform: scaleY(1)
  }
} */

.collapsed-placeholder {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  padding: 20px;
  height: auto;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.theme-light .collapsed-placeholder {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 8px 32px rgba(135, 206, 235, 0.15);
}

.theme-dark .collapsed-placeholder {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.03);
}

.placeholder-text {
  color: #666;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.7;
}

.theme-light .placeholder-text {
  color: #4a5568;
}

.theme-dark .placeholder-text {
  color: rgba(255, 255, 255, 0.6);
}

.left-section, .right-section {
  height: 100%;
}

.left-section {
  display: flex;
  flex-direction: column;
  gap: 24px; /* 为两个组件之间添加间距 */
}

/* 房间头部样式 */
.room-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  position: relative;
}

.theme-light .room-header {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 4px 16px rgba(135, 206, 235, 0.15);
}

.theme-dark .room-header {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.05);
}

.room-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  grid-column: 2;
}

.theme-light .room-title {
  background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.theme-dark .room-title {
  background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 在线人数统计样式（左侧固定位置） */
.online-stats {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border-radius: 12px;
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.online-stats:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(111, 218, 163, 0.2);
}

.theme-light .online-stats {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(135, 206, 235, 0.1);
}

.theme-dark .online-stats {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.05);
}

.online-stats .stats-label {
  font-weight: 500;
  opacity: 0.8;
  font-size: 13px;
}

.online-stats .stats-value {
  font-weight: 700;
  color: #6fdaa3;
  font-size: 16px;
}

.theme-dark .online-stats .stats-value {
  color: #ffffff;
}

/* 网格布局列定位 */
.online-stats {
  grid-column: 1;
  justify-self: start;
}

.room-switcher-container {
  grid-column: 3;
  justify-self: end;
}

.room-switcher-container {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  grid-column: 3;
  justify-self: end;
}

.room-switcher-track {
  position: relative;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 4px;
  width: 120px;
  height: 36px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.room-switcher-track:hover {
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15), 0 0 10px rgba(111, 218, 163, 0.3);
  border-color: rgba(255, 255, 255, 0.3);
}

.theme-light .room-switcher-track {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
}

.theme-dark .room-switcher-track {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.05);
}

.room-switcher-slider {
  position: absolute;
  top: 1px;
  left: 1px;
  width: calc(50% - 2px);
  height: calc(100% - 4px);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-light .room-switcher-slider {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.theme-dark .room-switcher-slider {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
}

.room-switcher-options {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  z-index: 2;
}

.room-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 16px;
  user-select: none;
  position: relative;
}

.room-option:not(.disabled):hover {
  /* background: rgba(255, 255, 255, 0.15); */
  transform: scale(1.02);
}

.room-option:not(.disabled):active {
  transform: scale(0.98);
}

.room-option.active {
  color: #333333;
  font-weight: 700;
}

.room-option.active {
  color: #1a365d;
  text-shadow: none;
}

.theme-light .room-option {
  color: rgba(26, 54, 93, 0.7);
}

.theme-dark .room-option {
  color: rgba(255, 255, 255, 0.7);
}

.theme-light .room-option.active {
  color: #1a365d;
}

.theme-dark .room-option.active {
  color: #ffffff;
}

.room-option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.room-option.disabled:hover {
  background: transparent;
}

/* 房间不可用状态样式 */
.room-unavailable {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.theme-light .room-unavailable {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 0 8px 32px rgba(135, 206, 235, 0.15);
}

.theme-dark .room-unavailable {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
}

.unavailable-content {
  text-align: center;
  color: #666;
}

.theme-light .unavailable-content {
  color: #4a5568;
}

.theme-dark .unavailable-content {
  color: rgba(255, 255, 255, 0.7);
}

.unavailable-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.unavailable-content h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.unavailable-content p {
  margin: 0;
  font-size: 14px;
  opacity: 0.8;
}

.greeting-card{
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  padding: 32px;
  max-height: 575px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  animation: expand 0.5s ease;
}

/* 移除了 seat-map-card 样式，现在由 SeatMap 组件自己处理 */

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.theme-light .card-header {
  border-bottom-color: rgba(26, 54, 93, 0.2);
}

.theme-dark .card-header {
  border-bottom-color: rgba(255, 255, 255, 0.15);
}

.card-header h4 {
  margin: 0;
  color: #1a365d;
  font-size: 16px;
  font-weight: 600;
}

.theme-light .card-header h4 {
  color: #1a365d;
}

.theme-dark .card-header h4 {
  color: #ffffff;
}

.last-update {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #666;
  font-size: 12px;
}

.theme-light .last-update {
  color: #333333;
}

.theme-dark .last-update {
  color: rgba(255, 255, 255, 0.7);
}

.dialog-content {
  text-align: center;
  padding: 20px 0;
}

.dialog-content p {
  margin: 8px 0;
  color: #333;
  font-size: 15px;
  line-height: 1.5;
}

/* 响应式设计 */

/* 小屏幕下的月度统计面板控制（16寸及以下笔记本） */
@media (max-height: 1100px) {
  /* 这个媒体查询作为JavaScript逻辑的补充，确保在极端情况下也能正确隐藏 */
  .left-section {
    /* 为月度统计面板预留空间，如果被JavaScript隐藏，空间会自动收缩 */
    flex-direction: column;
    gap: 20px;
  }
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  
  .collapsed-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .panel-content {
    padding: 24px;
  }
  
  .panel-collapsed-content {
    padding: 16px 20px;
  }
  
  .collapsed-placeholder {
    min-height: 120px;
  }
  
  /* 移动端下调整高度 */
  .live-checkin-panel.expanded {
    height: calc(100vh - 60px);
    min-height: 450px;
  }
}

@media (max-width: 768px) {
  .panel-header {
    padding: 16px 20px;
  }
  
  .panel-header h2 {
    font-size: 18px;
  }
  
  .collapsed-placeholder {
    padding: 16px;
    border-radius: 16px;
    min-height: 160px;
  }
  
  .panel-content {
    padding: 20px;
  }
  
  .panel-collapsed-content {
    padding: 14px 18px;
  }
  
  .collapsed-grid {
    gap: 16px;
  }
  
  /* 平板端高度调整 */
  .live-checkin-panel.collapsed {
    height: 350px;
    min-height: 350px;
  }
  
  .live-checkin-panel.expanded {
    height: calc(100vh - 50px);
    min-height: 400px;
  }
}

@media (max-width: 480px) {
  .panel-header {
    padding: 12px 16px;
  }
  
  .panel-content {
    padding: 16px;
  }
  
  .panel-collapsed-content {
    padding: 12px 16px;
  }
  
  .collapsed-grid {
    gap: 12px;
  }
  
  .collapsed-placeholder {
    padding: 14px;
    border-radius: 14px;
    min-height: 140px;
  }
  
  .placeholder-text {
    font-size: 13px;
  }
  
  /* 手机端高度调整 */
  .live-checkin-panel.collapsed {
    height: 320px;
    min-height: 320px;
  }
  
  .live-checkin-panel.expanded {
    height: calc(100vh - 30px);
    min-height: 350px;
  }
}

/* Vue 组件过渡动画 */

/* 折叠状态下组件的过渡动画 */
.greeting-collapse-enter-active {
  transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.1s;
}

.greeting-collapse-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(30px) rotateX(20deg);
}

/* 折叠状态下组件的过渡动画 */
.greeting-collapse-enter-active {
  transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.1s;
}

.greeting-collapse-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.placeholder-collapse-enter-active {
  transition: all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.5s;
}

.placeholder-collapse-enter-from {
  opacity: 0;
  transform: scale(0.7) translateX(50px) rotateY(15deg);
}

/* 展开状态下组件的过渡动画 */
.greeting-expand-enter-active {
  transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.1s;
}

.greeting-expand-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

.monthly-stats-expand-enter-active {
  transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.4s;
}

.monthly-stats-expand-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(30px);
}

.seatmap-expand-enter-active {
  transition: all 0.9s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.7s;
}

.seatmap-expand-enter-from {
  opacity: 0;
  transform: scale(0.85) translateX(40px) rotateY(-10deg);
}

/* 房间头部展开动画 */
.room-header-expand-enter-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.2s;
}

.room-header-expand-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-15px);
}

/* 在线人数统计动画 */
.online-stats-expand-enter-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.3s;
}

.online-stats-expand-enter-from {
  opacity: 0;
  transform: scale(0.8) translateX(-30px);
}

/* 房间标题动画 */
.room-title-expand-enter-active {
  transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.4s;
}

.room-title-expand-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}

/* 房间切换器动画 */
.room-switcher-expand-enter-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  transition-delay: 0.5s;
}

.room-switcher-expand-enter-from {
  opacity: 0;
  transform: scale(0.8) translateX(30px);
}
</style>
