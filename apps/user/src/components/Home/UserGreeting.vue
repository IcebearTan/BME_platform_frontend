<template>
  <!-- 展开状态容器 -->
  <div 
    v-if="!isCollapsed" 
    class="user-greeting-expanded" 
    :class="{ 'theme-dark': isDarkMode }"
  >
    <div class="expanded-content">
      <!-- 问候语头部 -->
      <div class="greeting-header">
        <h3>{{ greetingMessage }}</h3>
      </div>

      <!-- 当前时间日期 -->
      <div class="datetime-display" v-if="showDateTime">
        <div class="time">{{ currentTime }}</div>
        <div class="date-info">
          <span class="date">{{ currentDate }}</span>
          <span class="week">{{ currentWeek }}</span>
        </div>
        <div class="weather" v-if="weatherInfo">
          <span>{{ weatherInfo.description }} {{ weatherInfo.temperature }}°</span>
        </div>
        <div class="motivation" v-if="showMotivation && motivationText">
          <span>{{ motivationText }}</span>
        </div>
      </div>
    </div>

    <!-- 打卡状态组件 -->
    <CheckinStatus
      v-if="showCheckinStatus"
      :is-dark-mode="isDarkMode"
      :is-collapsed="false"
    />
  </div>

  <!-- 折叠状态容器 -->
  <div 
    v-if="isCollapsed" 
    class="user-greeting-collapsed" 
    :class="{ 'theme-dark': isDarkMode }"
  >
    <div class="collapsed-content">
      <!-- 折叠状态只显示问候语 -->
      <div class="greeting-header-collapsed">
        <h3>{{ greetingMessage }}</h3>
      </div>
      
      <!-- 折叠状态显示简化的日期信息 -->
      <div class="date-info-collapsed" v-if="showDateTime">
        <span class="date">{{ currentDate }}</span>
        <span class="week">{{ currentWeek }}</span>
      </div>
    </div>

    <!-- 打卡状态组件 -->
    <CheckinStatus
      v-if="showCheckinStatus"
      :is-dark-mode="isDarkMode"
      :is-collapsed="true"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import CheckinStatus from './CheckinStatus.vue'
import api from '../../api'

// Props
const props = defineProps({
  // 用户信息
  userInfo: {
    type: Object,
    required: true,
    default: () => ({
      id: '',
      name: '用户',
      avatar: null,
      role: null
    })
  },
  // 是否显示日期时间
  showDateTime: {
    type: Boolean,
    default: true
  },
  // 是否显示学习统计
  showStats: {
    type: Boolean,
    default: true
  },
  // 是否显示激励语句
  showMotivation: {
    type: Boolean,
    default: true
  },
  // 天气信息
  weatherInfo: {
    type: Object,
    default: null
  },
  // 学习统计数据
  studyStats: {
    type: Object,
    default: () => ({
      todayHours: '2.5h',
      weekHours: '15.5h',
      totalDays: '7天'
    })
  },
  // 主题模式
  isDarkMode: {
    type: Boolean,
    default: false
  },
  // 是否折叠状态
  isCollapsed: {
    type: Boolean,
    default: false
  },
  // 是否显示打卡状态
  showCheckinStatus: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['checkin', 'checkout', 'request-checkin', 'request-checkout'])

// 响应式数据
const currentTime = ref('')
const currentDate = ref('')
const currentWeek = ref('')
const nowTime = ref(new Date())

// 登录检查
const checkLogin = () => {
  const token = localStorage.getItem('token')
  return !!token
}

// 激励语句库
const motivationTexts = [
  '今天也要加油学习哦！',
  '每一次努力都是为了更好的自己',
  '学而时习之，不亦说乎',
  '知识就是力量，坚持就是胜利',
  '今日学习，明日收获',
  '积少成多，积沙成塔',
  '勤奋是成功的阶梯',
  '学习使人进步，努力成就梦想'
]

// 计算属性
const greetingMessage = computed(() => {
  const hour = new Date().getHours()
  
  if (hour < 6) return '深夜了，注意休息'
  if (hour < 9) return '早上好'
  if (hour < 12) return '上午好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  if (hour < 22) return '晚上好'
  return '夜深了，早点休息'
})

const motivationText = computed(() => {
  // 根据时间或随机选择激励语句
  const index = new Date().getDate() % motivationTexts.length
  return motivationTexts[index]
})

// 方法
function updateDateTime() {
  const now = new Date()
  
  // 更新时间
  currentTime.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  
  // 更新日期
  currentDate.value = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  
  // 更新星期
  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentWeek.value = weekdays[now.getDay()]
}

// 定时器
let timeTimer = null

// 生命周期
onMounted(async () => {
  if (props.showDateTime) {
    updateDateTime()
    timeTimer = setInterval(updateDateTime, 1000)
  }
})

onUnmounted(() => {
  if (timeTimer) {
    clearInterval(timeTimer)
  }
})
</script>

<style scoped>
/* =================== 展开状态样式 =================== */
.user-greeting-expanded {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  padding: 32px 32px 40px 32px;
  max-height: 575px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0) scale(1);
}

.user-greeting-expanded.theme-dark {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
}

.user-greeting-expanded.theme-light {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #1a365d;
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
}

.expanded-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  align-items: center;
}

/* =================== 折叠状态样式 =================== */
.user-greeting-collapsed {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  padding: 20px 20px 8px 20px;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 6px 24px rgba(135, 206, 250, 0.12);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0) scale(1);
}

.user-greeting-collapsed.theme-dark {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: white;
  box-shadow: 0 6px 24px rgba(255, 255, 255, 0.04);
}

.user-greeting-collapsed.theme-light {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #1a365d;
  box-shadow: 0 6px 24px rgba(135, 206, 235, 0.2);
}

.collapsed-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  align-items: center;
  text-align: center;
}

/* =================== 展开状态的具体元素样式 =================== */
.greeting-header h3 {
  width: 100%;
  margin: 0;
  font-size: 32px;
  font-weight: 300;
  color: #2d3748;
  text-align: center;
  letter-spacing: -0.8px;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center center;
}

.user-greeting-expanded.theme-dark .greeting-header h3 {
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 标题悬停效果 */
.greeting-header h3:hover {
  transform: scale(1.05);
  letter-spacing: 0px;
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.datetime-display {
  width: auto;
  min-width: 450px;
  max-width: 600px;
  text-align: center;
  padding: 32px 24px;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center center;
}

/* 时间显示组件悬停效果 */
.datetime-display:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 12px 40px rgba(135, 206, 250, 0.25);
  background: rgba(255, 255, 255, 0.4);
}

.datetime-display {
  width: auto;
  min-width: 450px;
  max-width: 600px;
  text-align: center;
  padding: 32px 24px;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center center;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  overflow: hidden;
  word-wrap: break-word;
}

/* 时间显示组件悬停效果 */
.datetime-display:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 12px 40px rgba(135, 206, 250, 0.25);
  background: rgba(255, 255, 255, 0.4);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.user-greeting-expanded.theme-dark .datetime-display {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
}

.time {
  font-size: clamp(36px, 8vw, 52px);
  font-weight: 100;
  color: #2d3748;
  margin-bottom: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: -2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  max-width: 100%;
}

.user-greeting-expanded.theme-dark .time {
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.date-info {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  width: 100%;
  max-width: 100%;
}

.date {
  font-size: 16px;
  color: #4a5568;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.user-greeting-expanded.theme-dark .date {
  color: rgba(255, 255, 255, 0.8);
}

.week {
  font-size: 16px;
  color: #4a5568;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.user-greeting-expanded.theme-dark .week {
  color: rgba(255, 255, 255, 0.8);
}

.weather {
  font-size: 15px;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 12px;
}

.user-greeting-expanded.theme-dark .weather {
  color: #ffffff;
}

.motivation {
  padding: 14px 20px;
  border-radius: 16px;
  color: #6a7383;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-greeting-expanded.theme-dark .motivation {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

/* =================== 折叠状态的具体元素样式 =================== */
.greeting-header-collapsed h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 300;
  color: #2d3748;
  text-align: center;
  letter-spacing: -0.5px;
}

.user-greeting-collapsed.theme-dark .greeting-header-collapsed h3 {
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.date-info-collapsed {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.date-info-collapsed .date,
.date-info-collapsed .week {
  font-size: 14px;
  color: #4a5568;
  font-weight: 500;
}

.user-greeting-collapsed.theme-dark .date-info-collapsed .date,
.user-greeting-collapsed.theme-dark .date-info-collapsed .week {
  color: rgba(255, 255, 255, 0.8);
}

/* =================== 增强动画系统 =================== */

/* 展开状态动画 - 华丽绽放效果 */
@keyframes expand-bloom {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.85) rotateX(15deg);
    filter: blur(8px);
  }
  30% {
    opacity: 0.3;
    transform: translateY(-10px) scale(0.92) rotateX(8deg);
    filter: blur(4px);
  }
  60% {
    opacity: 0.7;
    transform: translateY(5px) scale(1.02) rotateX(-2deg);
    filter: blur(1px);
  }
  80% {
    opacity: 0.9;
    transform: translateY(-2px) scale(1.01) rotateX(1deg);
    filter: blur(0px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateX(0deg);
    filter: blur(0px);
  }
}

/* 折叠状态动画 - 优雅收缩效果 */
@keyframes collapse-gentle {
  0% {
    opacity: 0;
    transform: translateY(20px) scale(1.08) rotateY(-8deg);
    filter: blur(6px);
  }
  25% {
    opacity: 0.4;
    transform: translateY(15px) scale(1.04) rotateY(-4deg);
    filter: blur(3px);
  }
  50% {
    opacity: 0.7;
    transform: translateY(8px) scale(0.98) rotateY(2deg);
    filter: blur(1px);
  }
  75% {
    opacity: 0.9;
    transform: translateY(2px) scale(0.99) rotateY(-1deg);
    filter: blur(0px);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateY(0deg);
    filter: blur(0px);
  }
}

/* 内容元素动画 - 展开时的级联效果 */
@keyframes content-cascade-in {
  0% {
    opacity: 0;
    transform: translateY(25px) scale(0.9);
  }
  40% {
    opacity: 0;
    transform: translateY(15px) scale(0.95);
  }
  70% {
    opacity: 0.8;
    transform: translateY(-3px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* 内容元素动画 - 折叠时的汇聚效果 */
@keyframes content-gather {
  0% {
    opacity: 0;
    transform: translateX(-15px) scale(0.92) rotateZ(-2deg);
  }
  50% {
    opacity: 0.6;
    transform: translateX(3px) scale(1.01) rotateZ(1deg);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1) rotateZ(0deg);
  }
}

/* 应用动画到组件 */
.user-greeting-expanded {
  animation: expand-bloom 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  transform-origin: center center;
  perspective: 1000px;
}

.user-greeting-collapsed {
  animation: collapse-gentle 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  transform-origin: center top;
  perspective: 800px;
}

/* 展开状态内容的级联动画 */
.user-greeting-expanded .expanded-content > * {
  animation: content-cascade-in 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.user-greeting-expanded .expanded-content > *:nth-child(1) {
  animation-delay: 0.3s;
}

.user-greeting-expanded .expanded-content > *:nth-child(2) {
  animation-delay: 0.4s;
}

.user-greeting-expanded .expanded-content > *:nth-child(3) {
  animation-delay: 0.5s;
}

.user-greeting-expanded .expanded-content > *:nth-child(4) {
  animation-delay: 0.6s;
}

/* 折叠状态内容的汇聚动画 */
.user-greeting-collapsed .collapsed-content > * {
  animation: content-gather 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

.user-greeting-collapsed .collapsed-content > *:nth-child(1) {
  animation-delay: 0.2s;
}

.user-greeting-collapsed .collapsed-content > *:nth-child(2) {
  animation-delay: 0.3s;
}

/* 主题切换时的平滑过渡 */
.user-greeting-expanded,
.user-greeting-collapsed {
  transition: background 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.6s cubic-bezier(0.4, 0, 0.2, 1),
              color 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 悬停效果增强 */
.user-greeting-expanded:hover {
  transform: scale(1.01);
  box-shadow: 0 12px 40px rgba(135, 206, 250, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-greeting-collapsed:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 28px rgba(135, 206, 250, 0.2);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.user-greeting-expanded.theme-dark:hover {
  box-shadow: 0 12px 40px rgba(255, 255, 255, 0.1);
}

.user-greeting-collapsed.theme-dark:hover {
  box-shadow: 0 8px 28px rgba(255, 255, 255, 0.08);
}

.user-greeting.collapsed .date-info {
  margin-bottom: 12px;
  transform: translateY(-2px);
}

.user-greeting.collapsed .motivation {
  padding: 12px 20px;
  font-size: 13px;
  transform: scale(0.96);
  opacity: 0.9;
}

.greeting-header h3 {
  width: 100%;
  margin: 0;
  font-size: 32px;
  font-weight: 300;
  color: #2d3748;
  text-align: center;
  letter-spacing: -0.8px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
}

.theme-dark .greeting-header h3 {
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.datetime-display {
  width: auto; /* 改为自适应宽度 */
  min-width: 450px; /* 设置最小宽度保持美观 */
  max-width: 600px; /* 设置最大宽度防止过宽 */
  text-align: center;
  padding: 32px 24px;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  transform: scale(1);
  opacity: 1;
  overflow: hidden; /* 防止内容溢出 */
  word-wrap: break-word; /* 长单词换行 */
  display: flex; /* 使用flexbox布局 */
  flex-direction: column; /* 垂直排列 */
  align-items: center; /* 居中对齐 */
  box-sizing: border-box; /* 包含padding和border在内的盒模型 */
}

.theme-dark .datetime-display {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
}

.time {
  font-size: clamp(36px, 8vw, 52px); /* 响应式字体大小 */
  font-weight: 100;
  color: #2d3748;
  margin-bottom: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: -2px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
  white-space: nowrap; /* 防止时间换行 */
  overflow: hidden; /* 隐藏溢出部分 */
  text-overflow: ellipsis; /* 溢出时显示省略号 */
  width: 100%; /* 使用全部可用宽度 */
  max-width: 100%; /* 限制最大宽度 */
  flex-shrink: 0; /* 防止被压缩 */
}

.theme-dark .time {
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.date-info {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateY(0);
  flex-wrap: wrap; /* 允许换行 */
  width: 100%; /* 使用全部可用宽度 */
  max-width: 100%; /* 限制最大宽度 */
  flex-shrink: 0; /* 防止被压缩 */
}

.date {
  font-size: 16px;
  color: #4a5568;
  font-weight: 500;
  transition: color 0.3s ease;
  white-space: nowrap; /* 防止换行 */
  overflow: hidden; /* 隐藏溢出 */
  text-overflow: ellipsis; /* 溢出时显示省略号 */
  max-width: 200px; /* 限制最大宽度 */
}

.theme-dark .date {
  color: rgba(255, 255, 255, 0.8);
}

.week {
  font-size: 16px;
  color: #4a5568;
  font-weight: 500;
  transition: color 0.3s ease;
  white-space: nowrap; /* 防止换行 */
  overflow: hidden; /* 隐藏溢出 */
  text-overflow: ellipsis; /* 溢出时显示省略号 */
  max-width: 100px; /* 限制最大宽度 */
}

.theme-dark .week {
  color: rgba(255, 255, 255, 0.8);
}

.weather {
  font-size: 15px;
  color: #2d3748;
  font-weight: 600;
  margin-bottom: 12px;
  transition: color 0.3s ease;
}

.theme-dark .weather {
  color: #ffffff;
}

.motivation {
  padding: 14px 20px;
  /* background: rgba(255, 255, 255, 0.4); */
  border-radius: 16px;
  /* border: 1px solid rgba(255, 255, 255, 0.5); */
  color: #6a7383;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.5;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
  opacity: 1;
}

.theme-dark .motivation {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.daily-total-time {
  margin-top: 12px;
}

.total-time-display {
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  padding: 12px 20px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  text-align: center;
  transition: all 0.3s ease;
}

.theme-dark .total-time-display {
  background: rgba(129, 140, 248, 0.15);
  border: 1px solid rgba(129, 140, 248, 0.3);
}

.total-time-label {
  display: block;
  font-size: 14px;
  color: #6366f1;
  margin-bottom: 4px;
  font-weight: 500;
}

.theme-dark .total-time-label {
  color: #818cf8;
}

.total-time-value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #4f46e5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
}

.theme-dark .total-time-value {
  color: #6366f1;
}

.study-stats {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.theme-dark .study-stats {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 20px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  transition: all 0.3s ease;
  backdrop-filter: blur(20px);
}

.theme-dark .stat-item {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  letter-spacing: -0.5px;
  transition: color 0.3s ease;
}

.theme-dark .stat-value {
  color: #ffffff;
}

.stat-label {
  font-size: 12px;
  color: #86868b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: color 0.3s ease;
}

.theme-dark .stat-label {
  color: rgba(255, 255, 255, 0.6);
}

/* =================== 新的响应式设计 =================== */
@media (max-width: 768px) {
  .user-greeting-expanded {
    padding: 24px;
    border-radius: 20px;
  }
  
  .user-greeting-collapsed {
    padding: 16px;
    border-radius: 16px;
    min-height: 140px;
  }
  
  .greeting-header h3 {
    font-size: 28px;
  }
  
  .greeting-header-collapsed h3 {
    font-size: 20px;
  }
  
  .datetime-display {
    min-width: 320px;
    max-width: 400px;
    padding: 28px 20px;
    border-radius: 20px;
  }
}

@media (max-width: 480px) {
  .user-greeting-expanded {
    gap: 20px;
    padding: 20px;
    border-radius: 16px;
  }
  
  .user-greeting-collapsed {
    gap: 12px;
    padding: 14px;
    border-radius: 14px;
    min-height: 120px;
  }
  
  .greeting-header h3 {
    font-size: 24px;
  }
  
  .greeting-header-collapsed h3 {
    font-size: 18px;
  }
  
  .datetime-display {
    min-width: 280px;
    max-width: 350px;
    padding: 24px 16px;
    border-radius: 16px;
  }
  
  .motivation {
    padding: 14px 20px;
    font-size: 13px;
    border-radius: 12px;
  }
}

/* 扁平风格弹窗样式 */
:global(.glass-messagebox) {
  background: #ffffff !important;
  backdrop-filter: none !important;
  border: none !important;
  border-radius: 16px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
}

:global(.glass-messagebox.verification-modal) {
  min-width: 420px !important;
}

:global(.glass-messagebox .el-message-box__header) {
  background: transparent !important;
  border-bottom: none !important;
  padding: 32px 24px 8px !important;
  text-align: center !important;
}

:global(.glass-messagebox .el-message-box__title) {
  color: #2c3e50 !important;
  font-weight: 600 !important;
  font-size: 24px !important;
  text-align: center !important;
}

:global(.glass-messagebox .el-message-box__content) {
  padding: 8px 24px 32px !important;
  background: transparent !important;
  text-align: center !important;
}

:global(.glass-messagebox .el-message-box__message) {
  color: transparent !important;
  margin: 0 !important;
  padding: 0 !important;
  text-align: center !important;
}

:global(.glass-messagebox .el-message-box__btns) {
  display: none !important;
}

/* 验证码输入框容器 */
:global(.verification-code-container) {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 16px !important;
  padding: 24px 0 !important;
}

/* 验证码单个数字输入框 */
:global(.verification-digit-input) {
  width: 40px !important;
  height: 50px !important;
  text-align: center !important;
  font-size: 24px !important;
  font-weight: 600 !important;
  color: #2c3e50 !important;
  background: #f8f9fa !important;
  border: 2px solid #e9ecef !important;
  border-radius: 10px !important;
  outline: none !important;
  transition: all 0.3s ease !important;
  letter-spacing: 0px !important;
}

:global(.verification-digit-input:focus) {
  border-color: #3498db !important;
  background: #ffffff !important;
  transform: scale(1.05) !important;
  box-shadow: 0 0 0 4px rgba(52, 152, 219, 0.2) !important;
}

/* 输入完成状态 */
:global(.verification-digit-input.input-filled) {
  border-color: #27ae60 !important;
  background: #ffffff !important;
  color: #27ae60 !important;
}

/* 输入错误状态 */
:global(.verification-digit-input.input-error) {
  border-color: #e74c3c !important;
  background: #ffffff !important;
  color: #e74c3c !important;
  animation: shake 0.5s ease-in-out !important;
}

/* 成功动画 */
:global(.verification-digit-input.input-success) {
  border-color: #27ae60 !important;
  background: #ffffff !important;
  color: #27ae60 !important;
  animation: pulse-success 0.6s ease-in-out !important;
}

/* 抖动动画（错误反馈） */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
  20%, 40%, 60%, 80% { transform: translateX(8px); }
}

/* 脉冲动画（成功反馈） */
@keyframes pulse-success {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); box-shadow: 0 0 0 8px rgba(39, 174, 96, 0.3); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(39, 174, 96, 0); }
}

/* 容器成功动画 */
:global(.verification-code-container.all-filled) {
  animation: container-success 0.8s ease-in-out !important;
}

@keyframes container-success {
  0% { transform: scale(1); }
  30% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

/* 遮罩层样式 */
:global(.el-overlay) {
  background: rgba(0, 0, 0, 0.3) !important;
  backdrop-filter: none !important;
}

/* 响应式适配 */
@media (max-width: 768px) {
  :global(.glass-messagebox.verification-modal) {
    min-width: 350px !important;
    margin: 20px !important;
  }
  
  :global(.verification-code-container) {
    gap: 12px !important;
    padding: 20px 0 !important;
  }
  
  :global(.verification-digit-input) {
    width: 36px !important;
    height: 46px !important;
    font-size: 22px !important;
  }
}

@media (max-width: 480px) {
  :global(.glass-messagebox.verification-modal) {
    min-width: 320px !important;
    margin: 16px !important;
  }
  
  :global(.verification-code-container) {
    gap: 8px !important;
    padding: 16px 0 !important;
  }
  
  :global(.verification-digit-input) {
    width: 34px !important;
    height: 44px !important;
    font-size: 20px !important;
  }
}
</style>
