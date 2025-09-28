<template>
  <div class="checkin-status" :class="{ 'theme-dark': isDarkMode }">
    <!-- 统一的计时器显示 -->
    <div class="study-timer-expanded" v-if="checkinInfo.checkedIn && !checkinInfo.checkedOut">
      <div class="timer-display-expanded" :class="{ 'overtime-warning': checkinInfo.isOvertime }">
        <span class="timer-text" :class="{ 'overtime-text': checkinInfo.isOvertime }">
          {{ checkinInfo.isOvertime ? '⚠️ 学习超时' : '学习时长' }}
        </span>
        <div class="timer-value-expanded" :class="{ 'overtime-value': checkinInfo.isOvertime }">
          {{ currentStudyDuration }}
        </div>
        <div v-if="checkinInfo.isOvertime" class="overtime-message">
          请尽快签退并适当休息
        </div>
      </div>
    </div>

    <!-- 统一的打卡按钮区域 -->
    <div class="checkin-actions">
      <!-- 未开始学习时 -->
      <div
        v-if="!checkinInfo.checkedIn && !checkinInfo.checkedOut"
        class="status-display expanded-status"
        :class="{ 
          'status-jelly-hover': isHovering
        }"
        @click="requestCheckin()"
        @mouseenter="startHoverAnimation()"
        @mouseleave="endHoverAnimation()">
        <div class="status-content-wrapper">
          <div class="status-content content-switching">
            <!-- 提示文本 -->
            <div class="status-info" :class="{ 'info-hidden': isHovering }">
              <span class="status-text">点击开始</span>
              <span class="status-icon">▶</span>
            </div>
            <!-- 开始学习按钮显示 -->
            <div class="status-button" :class="{ 'button-visible': isHovering }">
              <span class="button-text">开始学习</span>
              <div class="button-icon">●</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 正在学习时 -->
      <div
        v-else-if="checkinInfo.checkedIn && !checkinInfo.checkedOut"
        class="status-display expanded-status danger-style"
        :class="{ 
          'status-jelly-hover': isHovering
        }"
        @click="requestCheckout()"
        @mouseenter="startHoverAnimation()"
        @mouseleave="endHoverAnimation()">
        <div class="status-content-wrapper">
          <div class="status-content content-switching">
            <!-- 提示文本 -->
            <div class="status-info" :class="{ 'info-hidden': isHovering }">
              <span class="status-text">正在学习中</span>
              <span class="status-icon">⏸</span>
            </div>
            <!-- 结束学习按钮显示 -->
            <div class="status-button" :class="{ 'button-visible': isHovering }">
              <span class="button-text">结束学习</span>
              <div class="button-icon">●</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 已完成学习时 -->
      <div
        v-else
        class="status-display expanded-status completed-style"
        :class="{ 
          'status-jelly-hover': completedHovering
        }"
        @click="requestCheckin()"
        @mouseenter="startCompletedHover()"
        @mouseleave="endCompletedHover()">
        <div class="status-content-wrapper">
          <div class="status-content content-switching">
            <!-- 累计时长显示 -->
            <div class="status-info" :class="{ 'info-hidden': completedHovering }">
              <span class="status-text" v-if="checkinInfo.totalDuration || checkinInfo.studyDuration">
                今日已累计：{{ checkinInfo.totalDuration || checkinInfo.studyDuration }}
              </span>
              <span class="status-text" v-else>
                今日还未打卡哦
              </span>
            </div>
            <!-- 开始学习按钮显示 -->
            <div class="status-button" :class="{ 'button-visible': completedHovering }">
              <span class="button-text">开始学习</span>
              <div class="button-icon">●</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElButton, ElDialog } from 'element-plus'

// Props
const props = defineProps({
  // 打卡信息
  checkinInfo: {
    type: Object,
    default: () => ({
      checkedIn: false,
      checkedOut: false,
      checkinTime: null,
      checkoutTime: null
    })
  },
  // 主题模式
  isDarkMode: {
    type: Boolean,
    default: false
  },
  // 折叠状态
  isCollapsed: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['checkin', 'checkout', 'request-checkin', 'request-checkout'])

// 响应式数据
const loading = ref(false)
const studyStartTime = ref(null)
const currentStudyDuration = ref('00:00:00')
const isHovering = ref(false)
const completedHovering = ref(false)

// 监视 checkinInfo 变化
watch(() => props.checkinInfo, (newInfo) => {
  // console.log('CheckinStatus received checkinInfo:', newInfo)
}, { deep: true, immediate: true })

// 动画控制方法
const startHoverAnimation = () => {
  isHovering.value = true
}

const endHoverAnimation = () => {
  isHovering.value = false
}

// 展开状态完成区域的hover控制
const startCompletedHover = () => {
  completedHovering.value = true
}

const endCompletedHover = () => {
  completedHovering.value = false
}

// 定时器
let studyTimer = null

// 计算学习时长
const updateStudyDuration = () => {
  if (!studyStartTime.value) return
  
  const now = new Date()
  const startTime = new Date(studyStartTime.value)
  
  // 直接在开始时间基础上减去5秒，让计时器从5秒开始
  const adjustedStartTime = new Date(startTime.getTime() - 5000)
  const diff = now - adjustedStartTime
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  currentStudyDuration.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// 方法
function requestCheckin() {
  emit('request-checkin')
}

function requestCheckout() {
  emit('request-checkout', { studyDuration: currentStudyDuration.value })
}

function handleCheckin() {
  loading.value = true
  
  const now = new Date()
  studyStartTime.value = now.toISOString()
  
  const checkinData = {
    ...props.checkinInfo,
    checkedIn: true,
    checkinTime: now.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }),
    checkinTimestamp: now.toISOString() // 存储完整的签到时间戳
  }
  
  // 开始计时
  studyTimer = setInterval(updateStudyDuration, 1000)
  
  emit('checkin', checkinData)
  loading.value = false
}

function handleCheckout() {
  loading.value = true
  
  const checkoutData = {
    ...props.checkinInfo,
    checkedOut: true,
    checkoutTime: new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    }),
    studyDuration: currentStudyDuration.value
  }
  
  // 停止计时
  if (studyTimer) {
    clearInterval(studyTimer)
    studyTimer = null
  }
  
  emit('checkout', checkoutData)
  loading.value = false
}

// 生命周期
onMounted(() => {
  // 如果已经签到但未签退，恢复计时
  if (props.checkinInfo.checkedIn && !props.checkinInfo.checkedOut) {
    // 优先使用完整的签到时间戳
    if (props.checkinInfo.checkinTimestamp) {
      studyStartTime.value = props.checkinInfo.checkinTimestamp
    } else if (props.checkinInfo.checkinTime) {
      // 回退到旧的构造方式（为了兼容性）
      const today = new Date().toDateString()
      const checkinTimeStr = `${today} ${props.checkinInfo.checkinTime}`
      studyStartTime.value = new Date(checkinTimeStr).toISOString()
    } else {
      // 如果没有具体的签到时间，使用当前时间作为开始时间
      studyStartTime.value = new Date().toISOString()
    }
    studyTimer = setInterval(updateStudyDuration, 1000)
    updateStudyDuration()
  }
})

// 监听checkinInfo变化
watch(() => props.checkinInfo, (newInfo) => {
  if (newInfo.checkedIn && !newInfo.checkedOut && !studyTimer) {
    // 优先使用完整的签到时间戳
    if (newInfo.checkinTimestamp) {
      studyStartTime.value = newInfo.checkinTimestamp
    } else if (newInfo.checkinTime) {
      // 回退到旧的构造方式（为了兼容性）
      const today = new Date().toDateString()
      const checkinTimeStr = `${today} ${newInfo.checkinTime}`
      studyStartTime.value = new Date(checkinTimeStr).toISOString()
    } else {
      studyStartTime.value = new Date().toISOString()
    }
    studyTimer = setInterval(updateStudyDuration, 1000)
    updateStudyDuration()
  } else if ((!newInfo.checkedIn || newInfo.checkedOut) && studyTimer) {
    // 停止计时
    clearInterval(studyTimer)
    studyTimer = null
  }
}, { deep: true })

onUnmounted(() => {
  if (studyTimer) {
    clearInterval(studyTimer)
  }
})

// 暴露方法给父组件
defineExpose({
  handleCheckin,
  handleCheckout
})
</script>

<style scoped>
/* =================== 基础容器样式 =================== */
.checkin-status {
  margin-top: 24px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  height: auto;
  min-height: 50px;
  transform-origin: top center;
  transform: scale(1);
}

/* =================== 计时器展示样式 =================== */
.study-timer-expanded {
  margin-bottom: 24px;
  text-align: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
  opacity: 1;
}

.timer-display-expanded {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  width: auto;
  min-width: 200px;
  max-width: 425px;
  margin: 0 auto;
  transform: scale(1);
  opacity: 1;
  padding: 16px 20px;
}

.timer-display-expanded .timer-text {
  display: block;
  font-size: 16px;
  color: #4a5568;
  margin-bottom: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.timer-value-expanded {
  font-size: clamp(24px, 4.5vw, 48px);
  font-weight: 300;
  color: #2d3748;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Mono', monospace;
  letter-spacing: clamp(1px, 0.2vw, 3px);
  line-height: 1.2;
  word-break: keep-all;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-dark .timer-display-expanded {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.theme-dark .timer-display-expanded .timer-text {
  color: rgba(255, 255, 255, 0.8);
}

.theme-dark .timer-value-expanded {
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

/* =================== 超时警告样式 =================== */
.timer-display-expanded.overtime-warning {
  border: 2px solid #e74c3c !important;
  background: linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%) !important;
  box-shadow: 0 8px 32px rgba(231, 76, 60, 0.2) !important;
  animation: overtime-pulse 2s infinite;
}

.theme-dark .timer-display-expanded.overtime-warning {
  background: linear-gradient(135deg, #2d1b1b 0%, #4a1f1f 100%) !important;
  border: 2px solid #e74c3c !important;
  box-shadow: 0 8px 32px rgba(231, 76, 60, 0.3) !important;
}

.timer-text.overtime-text {
  color: #e74c3c !important;
  font-weight: 700 !important;
}

.timer-value-expanded.overtime-value {
  color: #c0392b !important;
  font-weight: 600 !important;
}

.theme-dark .timer-value-expanded.overtime-value {
  color: #e74c3c !important;
}

.overtime-message {
  font-size: 14px;
  color: #e74c3c;
  font-weight: 500;
  margin-top: 8px;
  text-align: center;
  animation: overtime-blink 1.5s ease-in-out infinite alternate;
}

.theme-dark .overtime-message {
  color: #ec7063;
}

@keyframes overtime-pulse {
  0%, 100% {
    box-shadow: 0 8px 32px rgba(231, 76, 60, 0.2);
  }
  50% {
    box-shadow: 0 12px 40px rgba(231, 76, 60, 0.4);
  }
}

@keyframes overtime-blink {
  0% { opacity: 1; }
  100% { opacity: 0.6; }
}

/* =================== 打卡按钮区域样式 =================== */
.checkin-actions {
  display: flex;
  justify-content: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
  opacity: 1;
}

.status-display {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  min-width: 200px;
  width: auto;
  display: inline-block;
}

.status-jelly-hover {
  transform: scale(1.05) !important;
  border-radius: 20px !important;
  min-width: 220px !important;
  padding: 14px 20px !important;
  background: linear-gradient(135deg, #56e3a4 0%, #3ae9b4 100%) !important;
  box-shadow: 0 12px 40px rgba(92, 235, 235, 0.4) !important;
  animation: jellyBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes jellyBounce {
  0% { transform: scale(1); }
  25% { transform: scale(0.95) scaleX(1.1); }
  50% { transform: scale(1.02) scaleX(0.98); }
  75% { transform: scale(1.01) scaleX(1.02); }
  100% { transform: scale(1.05); }
}

/* 展开状态专用样式 */
.expanded-status {
  min-width: 200px !important;
  width: auto !important;
  height: 32px !important;
  border-radius: 20px !important;
  padding: 6px 20px !important;
  display: flex !important;
  align-items: center;
  justify-content: center !important;
}

.expanded-status .status-content-wrapper {
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 危险状态（正在学习中）的样式 */
.danger-style {
  background: linear-gradient(135deg, #ef4242 0%, #df3939 100%) !important;
  color: white !important;
}

.danger-style.status-jelly-hover {
  background: linear-gradient(135deg, #ef4242 0%, #df3939 100%) !important;
  border-color: rgba(197, 48, 48, 0.3) !important;
  box-shadow: 0 12px 40px rgba(229, 62, 62, 0.4) !important;
}

/* 完成状态的样式 */
.completed-style {
  background: rgba(255, 255, 255, 0.4) !important;
  color: #2d3748 !important;
}

.completed-style.status-jelly-hover {
  background: linear-gradient(135deg, #56e3a4 0%, #3ae9b4 100%) !important;
  color: white !important;
}

.status-content-wrapper {
  position: relative;
  width: 100%;
  height: 24px;
  overflow: hidden;
}

.status-content {
  position: relative;
  width: 100%;
  height: 100%;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
}

.status-info {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 1;
  transform: translateY(-50%) translateX(0);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-info.info-hidden {
  opacity: 0;
  transform: translateY(-50%) translateX(-20px);
}

.status-button {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transform: translateY(-50%) translateX(20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.status-button.button-visible {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

/* 文本和图标样式 */
.status-text {
  font-size: 18px;
  font-weight: 500;
  color: #2d3748;
  letter-spacing: 0.5px;
  transition: all 0.3s ease;
}

.status-icon {
  font-size: 12px;
  color: #4a5568;
  opacity: 0.8;
}

.button-text {
  font-size: 16px;
  font-weight: 600;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.button-icon {
  font-size: 8px;
  color: white;
  opacity: 0.8;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 0.4; }
}

/* =================== 主题适配 =================== */
.theme-dark .status-jelly-hover {
  background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  box-shadow: 0 12px 40px rgba(255, 255, 255, 0.3) !important;
}

.theme-dark .status-text {
  color: #ffffff;
}

.theme-dark .status-icon {
  color: rgba(255, 255, 255, 0.8);
}

.theme-dark .status-jelly-hover .button-text {
  color: #000000;
}

.theme-dark .status-display {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* =================== 响应式设计 =================== */
@media (max-width: 768px) {
  .checkin-status {
    margin-top: 20px;
  }
  
  .timer-display-expanded {
    padding: 20px 16px;
    max-width: 350px;
    min-width: 180px;
  }
  
  .timer-value-expanded {
    font-size: clamp(20px, 5vw, 40px);
    letter-spacing: clamp(1px, 0.3vw, 2px);
  }
  
  .timer-display-expanded .timer-text {
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .status-display {
    padding: 20px 16px;
    border-radius: 16px;
  }
  
  .status-jelly-hover {
    min-width: 200px !important;
    padding: 12px 16px !important;
  }
  
  .status-text, .button-text {
    font-size: 14px !important;
  }
  
  .status-icon {
    font-size: 11px !important;
  }
  
  .checkin-actions {
    width: 100%;
  }
  
  .expanded-status {
    width: 100% !important;
    min-width: auto !important;
    height: 48px !important;
    font-size: 15px !important;
  }
}

@media (max-width: 480px) {
  .timer-display-expanded {
    padding: 16px 12px;
    max-width: 300px;
    min-width: 160px;
  }
  
  .timer-value-expanded {
    font-size: clamp(18px, 6vw, 36px);
    letter-spacing: clamp(0.5px, 0.2vw, 1px);
  }
  
  .timer-display-expanded .timer-text {
    font-size: 13px;
    margin-bottom: 10px;
  }
  
  .status-display {
    padding: 18px 14px;
    border-radius: 14px;
  }
  
  .status-jelly-hover {
    min-width: 180px !important;
    padding: 10px 14px !important;
  }
  
  .status-text, .button-text {
    font-size: 13px !important;
  }
  
  .status-icon {
    font-size: 10px !important;
  }
  
  .expanded-status {
    height: 48px !important;
    font-size: 14px !important;
  }
}

/* =================== 以下为冗余的折叠状态代码（已停用）=================== */
/*
折叠状态下的计时器样式
.study-timer-collapsed {
  text-align: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.95);
  opacity: 0.95;
}

.study-timer {
  margin-bottom: 24px;
  text-align: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.study-status-collapsed {
  text-align: center;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.95);
  opacity: 0.95;
}

.timer-display {
  background: rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  padding: 24px 20px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.timer-collapsed {
  padding: 12px 16px !important;
  border-radius: 24px !important;
  min-width: 120px;
  width: auto;
  display: inline-block;
  transition: all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.timer-jelly-hover {
  transform: scale(1.05) !important;
  border-radius: 20px !important;
  min-width: 160px !important;
  padding: 14px 20px !important;
  background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%) !important;
  border: 1px solid rgba(229, 62, 62, 0.3) !important;
  box-shadow: 0 12px 40px rgba(229, 62, 62, 0.4) !important;
  animation: jellyBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.timer-content-wrapper {
  position: relative;
  width: 100%;
  height: 24px;
  overflow: hidden;
}

.timer-content {
  position: relative;
  width: 100%;
  height: 100%;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.timer-info {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 1;
  transform: translateX(0);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.timer-info.info-hidden {
  opacity: 0;
  transform: translateX(-20px);
}

.timer-button {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transform: translateX(20px);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.timer-button.button-visible {
  opacity: 1;
  transform: translateX(0);
}

.timer-button-text {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.5px;
  opacity: 0;
  animation: fadeInScale 0.4s ease-out 0.2s forwards;
}

.theme-dark .timer-button-text {
  color: #000000;
}

.timer-value, .timer-label {
  ...
}

*/
</style>
