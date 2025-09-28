<template>
  <div
    ref="panelRef"
    class="live-checkin-panel"
    :class="{ 
      expanded: isExpanded,
      'theme-dark': isDarkMode,
      'theme-light': !isDarkMode
    }"
    :style="{ height: isExpanded ? dynamicHeight : '380px' }"
  >
    <!-- 展开/折叠专用按钮 -->
    <div class="panel-toggle-button" @click="togglePanel">
      <el-icon class="toggle-icon" :class="{ rotated: !isExpanded }">
        <ArrowDown />
      </el-icon>
    </div>

    <!-- 主题调试按钮 -->
    <div class="theme-debug-button" @click="toggleThemeDebug" title="点击切换主题（调试用）">
      <el-icon class="theme-icon">
        <component :is="isDarkMode ? 'Sunny' : 'Moon'" />
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
              key="greeting-expanded"
            />
          </transition>
          
          <!-- 月度统计面板 -->
          <transition name="monthly-stats-expand" appear>
            <MonthlyStatsPanel 
              v-if="isExpanded"
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
                     :class="{ 'invisible-placeholder': currentRoom.id === '110' }" 
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

    <!-- 签到确认弹框 -->
    <el-dialog
      v-model="checkinDialogVisible"
      title="开始学习"
      width="320px"
      center
      append-to-body
    >
      <div class="dialog-content">
        <p>确认开始今日的学习吗？</p>
      </div>
      <template #footer>
        <el-button @click="checkinDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCheckin" :loading="checkinLoading">
          确认签到
        </el-button>
      </template>
    </el-dialog>

    <!-- 签退确认弹框 -->
    <el-dialog
      v-model="checkoutDialogVisible"
      title="结束学习"
      width="320px"
      center
      append-to-body
    >
      <div class="dialog-content">
        <p>本次学习时长：{{ checkoutStudyDuration }}</p>
        <p>确认结束今日的学习吗？</p>
      </div>
      <template #footer>
        <el-button @click="checkoutDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="handleCheckout" :loading="checkoutLoading">
          确认签退
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ElIcon, ElTag, ElButton, ElDialog } from 'element-plus'
import { 
  ArrowDown, 
  Refresh,
  Sunny,
  Moon
} from '@element-plus/icons-vue'
import SeatMap from './SeatMap.vue'
import UserGreeting from './UserGreeting.vue'
import CheckinStatus from './CheckinStatus.vue'
import MonthlyStatsPanel from './MonthlyStatsPanel.vue'

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
const dynamicHeight = ref('300px')
const checkinDialogVisible = ref(false)
const checkoutDialogVisible = ref(false)
const checkoutStudyDuration = ref('')
const onlineCount = ref(2)
const totalSeats = ref(5)

// 白天黑夜模式
const isDarkMode = ref(false)

// 检查当前时间来决定主题
const checkTimeTheme = () => {
  const now = new Date()
  const hour = now.getHours()
  
  // 6点到18点为白天模式，其他时间为黑夜模式
  const isDay = hour >= 6 && hour < 18
  isDarkMode.value = !isDay
  
  // 输出当前时间和模式（便于调试）
  console.log(`当前时间: ${hour}:${now.getMinutes().toString().padStart(2, '0')}, 模式: ${isDarkMode.value ? '夜间' : '白天'}`)
}

// 测试不同时间的主题（开发调试用）
const testThemeAtTime = (hour) => {
  const isDay = hour >= 6 && hour < 18
  isDarkMode.value = !isDay
  console.log(`测试时间: ${hour}:00, 模式: ${isDarkMode.value ? '夜间' : '白天'}`)
}

// 计算动态高度
const calculateExpandedHeight = () => {
  if (!panelRef.value) return
  
  nextTick(() => {
    const panel = panelRef.value
    const rect = panel.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    
    // 计算面板顶部到视口顶部的距离
    const topOffset = rect.top
    
    // 预留底部边距 (可根据实际情况调整)
    const bottomMargin = 20
    
    // 计算可用高度
    const availableHeight = viewportHeight - topOffset - bottomMargin
    
    dynamicHeight.value = `${Math.max(availableHeight, 500)}px`
  })
}

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
    console.log(`🗺️ 座位图大小已调整为: ${preset}`, seatMapConfig.value)
  }
}

// 打卡信息
const checkinInfo = ref({
  checkedIn: false,
  checkedOut: false,
  checkinTime: null,
  checkinTimestamp: null,
  checkoutTime: null,
  location: null,
  studyDuration: null
})

// 月度统计数据
const monthlyStatsData = ref({
  totalDays: 0,
  totalHours: 0,
  rank: null
})

// 计算属性
// (已移除 checkinStatus，现在由 CheckinStatus 组件内部处理)

// 方法
function togglePanel() {
  isExpanded.value = !isExpanded.value
  if (isExpanded.value) {
    calculateExpandedHeight()
  }
}

function updateLastUpdateTime() {
  const now = new Date()
  lastUpdateTime.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
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
    console.error('签到失败:', error)
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
    console.error('签退失败:', error)
  } finally {
    checkoutLoading.value = false
  }
}

function handleCheckinEvent(checkinData) {
  checkinInfo.value = checkinData
  emit('checkin', checkinData)
}

function handleCheckoutEvent(checkoutData) {
  checkinInfo.value = checkoutData
  emit('checkout', checkoutData)
}

// 房间切换方法
function switchRoom(roomId) {
  console.log(`🔄 switchRoom 被调用，roomId: ${roomId}`)
  
  const room = availableRooms.value.find(r => r.id === roomId)
  console.log('找到的房间:', room)
  
  if (room) {
    const oldRoom = currentRoom.value
    currentRoom.value = room
    console.log(`🏠 切换成功: ${oldRoom.name} → ${room.name}`)
    emit('room-change', roomId)
  } else {
    console.log('❌ 房间切换失败: 房间不存在')
  }
}

// 处理滑块轨道点击
function handleTrackClick() {
  console.log('🖱️ 滑块被点击了')
  console.log('当前房间:', currentRoom.value)
  console.log('可用房间:', availableRooms.value)
  
  // 找到另一个可用的房间
  const otherRoom = availableRooms.value.find(room => 
    room.id !== currentRoom.value.id && room.available
  )
  
  console.log('找到的其他房间:', otherRoom)
  
  if (otherRoom) {
    console.log(`准备切换到房间: ${otherRoom.name}`)
    switchRoom(otherRoom.id)
  } else {
    console.log('没有找到其他可用房间')
  }
}

function handleRoomChange(roomId) {
  emit('room-change', roomId)
}

// 主题调试切换方法
function toggleThemeDebug() {
  isDarkMode.value = !isDarkMode.value
  console.log(`🎨 手动切换主题: ${isDarkMode.value ? '🌙 夜间模式' : '☀️ 白天模式'}`)
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
    
    console.log('📊 月度统计数据已更新:', monthlyStatsData.value)
    return mockData
  } catch (error) {
    console.error('❌ 获取月度统计数据失败:', error)
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
let themeTimer = null

// 生命周期
onMounted(() => {
  updateLastUpdateTime()
  checkTimeTheme() // 初始化主题
  
  // 获取月度统计数据
  fetchMonthlyStats()
  
  // 更新时间显示（30秒一次）
  updateTimer = setInterval(() => {
    updateLastUpdateTime()
  }, 30000)
  
  // 检查主题切换（每分钟检查一次，确保在6点和18点及时切换）
  themeTimer = setInterval(() => {
    checkTimeTheme()
  }, 60000) // 1分钟检查一次主题
  
  // 监听窗口大小变化
  window.addEventListener('resize', calculateExpandedHeight)
  
  // 初始计算高度
  if (isExpanded.value) {
    calculateExpandedHeight()
  }
})

onUnmounted(() => {
  if (updateTimer) {
    clearInterval(updateTimer)
  }
  if (themeTimer) {
    clearInterval(themeTimer)
  }
  window.removeEventListener('resize', calculateExpandedHeight)
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

// 暴露给全局用于测试（在浏览器控制台中可以调用）
if (typeof window !== 'undefined') {
  window.testTheme = testThemeAtTime
  window.resetTheme = checkTimeTheme
  window.changeSeatMapSize = changeSeatMapSize
  window.getSeatMapConfig = () => seatMapConfig.value
  window.seatMapPresets = seatMapPresets
}
</script>

<style scoped>
.live-checkin-panel {
  width: 100%;
  height: 500px;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  backdrop-filter: blur(20px);
  /* margin-top: 5px */
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
  box-shadow: 0 20px 60px rgba(255, 223, 162, 0.25);
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
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
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

/* 主题调试按钮样式 */
.theme-debug-button {
  position: absolute;
  top: 20px;
  right: 70px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.theme-light .theme-debug-button {
  background: linear-gradient(135deg, #ffd700, #ffa500);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.theme-dark .theme-debug-button {
  background: linear-gradient(135deg, #4a5568, #2d3748);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.theme-debug-button:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.theme-light .theme-debug-button:hover {
  box-shadow: 0 4px 16px rgba(255, 215, 0, 0.4);
}

.theme-dark .theme-debug-button:hover {
  box-shadow: 0 4px 16px rgba(255, 255, 255, 0.2);
}

.theme-debug-button .theme-icon {
  font-size: 18px;
  transition: all 0.3s ease;
}

.theme-light .theme-debug-button .theme-icon {
  color: #fff;
}

.theme-dark .theme-debug-button .theme-icon {
  color: #ffd700;
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

.collapsed-left-section, .collapsed-right-section {
  height: 100%;
  animation: collapse 0.5s ease;
}
@keyframes collapse {
  0% {
    transform: scaleY(2)
  }
  100% {
    transform: scaleY(1)
  }
}

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

/* 不可见占位符样式 - 保持布局但隐藏内容 */
.online-stats.invisible-placeholder {
  opacity: 0;
  pointer-events: none;
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
