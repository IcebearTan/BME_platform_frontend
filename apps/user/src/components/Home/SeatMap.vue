<template>
  <div class="seat-map-container" :class="{ dark: isDarkMode }">
    <!-- 110教室暂未开发状态 -->
    <div v-if="currentRoomId === '110'" class="room-unavailable">
      <div class="unavailable-content">
        <div class="unavailable-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" fill="currentColor"/>
            <circle cx="20" cy="4" r="2" fill="#f59e0b"/>
          </svg>
        </div>
        <h3 class="unavailable-title">暂未开发</h3>
        <p class="unavailable-description">110教室功能正在开发中，敬请期待...</p>
        <div class="unavailable-progress">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: '30%' }"></div>
          </div>
          <span class="progress-text">开发进度 30%</span>
        </div>
      </div>
    </div>

    <!-- 106教室正常座位图 -->
    <div v-else class="seat-map-layout">
      <!-- 左侧区域：两个座位 -->
      <div class="left-section">
        <div class="seat-item" 
             v-for="(seat, index) in leftSection" 
             :key="`left-${index}`"
             :class="{ 'seat-online': seat.status === 'occupied' }">
          <OctagonShape
            :size="octagonSize"
            :radius="octagonRadius"
            :corner-radius="octagonCornerRadius"
            :count="8"
            :colors="getSeatColors(seat)"
            :gap="octagonGap"
            :uniform-color="octagonUniformColor || undefined"
          />
        </div>
      </div>

      <!-- 右侧区域：三个座位 -->
      <div class="right-section">
        <div class="seat-item" 
             v-for="(seat, index) in rightSection" 
             :key="`right-${index}`"
             :class="{ 'seat-online': seat.status === 'occupied' }">
          <OctagonShape
            :size="octagonSize"
            :radius="octagonRadius"
            :corner-radius="octagonCornerRadius"
            :count="8"
            :colors="getSeatColors(seat)"
            :gap="octagonGap"
            :uniform-color="octagonUniformColor || undefined"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue'
import OctagonShape from './OctagonShape.vue'

// Props 适配 LivePanel 的 octagon-* 传参
const props = defineProps({
  octagonSize: { type: Number, default: 320 },
  octagonRadius: { type: Number, default: 80 },
  octagonCornerRadius: { type: Number, default: 8 },
  octagonGap: { type: Number, default: 4 },
  octagonUniformColor: { type: String, default: '' },
  isDarkMode: { type: Boolean, default: false },
  showLayoutControls: { type: Boolean, default: false },
  defaultLayout: { type: String, default: '2-3' },
  currentRoomId: { type: String, default: '106' }
})

// 发出事件（仅保留布局变更）
const emit = defineEmits(['layout-change'])

// 选中的座位（移除相关功能但保留变量以避免模板错误）
const currentLayout = ref(props.defaultLayout)
watch(() => props.defaultLayout, v => currentLayout.value = v)

// 座位数据 - 左侧2个座位
const leftSection = reactive([
  { id: 'L1', label: 'A1', status: 'available', occupant: null },
  { id: 'L2', label: 'A2', status: 'occupied', occupant: '张三' }
])

// 座位数据 - 右侧3个座位
const rightSection = reactive([
  { id: 'R1', label: 'B1', status: 'available', occupant: null },
  { id: 'R2', label: 'B2', status: 'occupied', occupant: '李四' },
  { id: 'R3', label: 'B3', status: 'available', occupant: null }
])

// 根据座位状态和主题获取颜色（若统一颜色则忽略状态）
const getSeatColors = (seat) => {
  if (props.octagonUniformColor) return [props.octagonUniformColor]
  
  if (seat.status === 'available') {
    // 空闲状态：白天灰色，夜晚深灰色
    return props.isDarkMode ? ['#4a5568', '#6b7280'] : ['#e5e7eb', '#f3f4f6']
  } else {
    // 在线状态：白天带荧光黄的绿色，夜晚白色
    return props.isDarkMode ? ['#ffffff', '#ffffff'] : ['#6fdaa3', '#6fdaa3']
  }
}

// 计算在线人数和总座位数
const onlineCount = computed(() => {
  if (props.currentRoomId === '110') return 0
  const allSeats = [...leftSection, ...rightSection]
  return allSeats.filter(seat => seat.status === 'occupied').length
})

const totalSeats = computed(() => {
  if (props.currentRoomId === '110') return 0
  return leftSection.length + rightSection.length
})

function changeLayout(layout) {
  if (currentLayout.value !== layout) {
    currentLayout.value = layout
    emit('layout-change', layout)
  }
}

// 暴露方法给父组件
defineExpose({
  getSeatById: (id) => {
    // 查找并返回指定ID的座位
    const allSeats = [...leftSection, ...rightSection]
    return allSeats.find(seat => seat.id === id)
  },
  updateSeatStatus: (id, status, occupant = null) => {
    // 更新座位状态
    const allSeats = [...leftSection, ...rightSection]
    const seat = allSeats.find(s => s.id === id)
    if (seat) {
      seat.status = status
      seat.occupant = occupant
      return true
    }
    return false
  },
  getAllSeats: () => {
    // 获取所有座位
    return [...leftSection, ...rightSection]
  },
  getOnlineStats: () => {
    return {
      onlineCount: onlineCount.value,
      totalSeats: totalSeats.value
    }
  },
  onlineCount,
  totalSeats,
  changeLayout
})
</script>

<style scoped>
.seat-map-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-sizing: border-box;
}

.seat-map-container.dark {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
  color: #ffffff;
}

.seat-map-layout {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex: 1;
  height: 100%;
}

.left-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.right-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.seat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.3s ease;
}

/* 在线状态的座位阴影效果 */
.seat-item.seat-online {
  filter: drop-shadow(0 4px 8px rgba(113, 235, 199, 0.76));
}

.seat-map-container.dark .seat-item.seat-online {
  filter: drop-shadow(0 4px 12px rgba(255, 255, 255, 0.4));
}

.seat-label {
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  min-width: 20px;
  transition: color 0.3s ease;
}

.seat-map-container:not(.dark) .seat-label {
  color: #4a5568;
}

.seat-map-container.dark .seat-label {
  color: rgba(255, 255, 255, 0.8);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .seat-map-container {
    max-height: 350px;
    padding: 12px;
  }
  
  .seat-map-layout {
    flex-direction: column;
    gap: 16px;
  }
  
  .section-divider {
    width: 100%;
    height: 2px;
  }
  
  .seat-map-container:not(.dark) .section-divider {
    background: linear-gradient(to right, transparent, rgba(74, 85, 104, 0.3), transparent);
  }
  
  .seat-map-container.dark .section-divider {
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
  }
  
  .seat-group {
    gap: 6px;
  }
  
  .seat-item {
    padding: 6px;
  }
  
  .seat-map-header h3 {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .seat-map-container {
    max-height: 300px;
    padding: 10px;
  }
  
  .seat-legend {
    flex-direction: column;
    gap: 8px;
    align-items: center;
  }
  
  .seat-info {
    flex-direction: column;
    gap: 12px;
  }
  
  .seat-map-layout {
    gap: 12px;
  }
  
  .left-section,
  .right-section {
    gap: 12px;
  }
  
  .seat-map-header h3 {
    font-size: 18px;
  }
  
  .selected-seat-info {
    padding: 12px;
  }
}

/* 房间暂未开发状态样式 */
.room-unavailable {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  padding: 40px;
}

.unavailable-content {
  text-align: center;
  max-width: 400px;
}

.unavailable-icon {
  color: rgba(111, 218, 163, 0.6);
  margin-bottom: 20px;
  animation: pulse 2s ease-in-out infinite;
}

.seat-map-container.dark .unavailable-icon {
  color: rgba(255, 255, 255, 0.4);
}

.unavailable-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 16px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.seat-map-container.dark .unavailable-title {
  background: linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.unavailable-description {
  font-size: 16px;
  opacity: 0.7;
  margin: 0 0 32px 0;
  line-height: 1.5;
}

.unavailable-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  width: 200px;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.seat-map-container.dark .progress-bar {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6fdaa3 0%, #4ade80 100%);
  border-radius: 4px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  animation: shimmer 2s ease-in-out infinite;
}

.progress-text {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.6;
  color: #6fdaa3;
}

.seat-map-container.dark .progress-text {
  color: #ffffff;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

@keyframes shimmer {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
</style>