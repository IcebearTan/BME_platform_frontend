<template>
  <div class="seat-map-container" :class="{ dark: isDarkMode }">
    <!-- 110教室座位图 -->
    <div v-if="currentRoomId === '110'" class="room-110-layout">
      <div class="room-110-seats">
        <div v-for="row in room110SeatConfig.rows" 
             :key="`row-${row}`" 
             class="seat-row">
          <!-- 左侧座位区域 -->
          <div class="row-left-section">
            <div v-for="seat in room110SeatsByRow[row].left" 
                 :key="seat.id"
                 class="seat-item-110"
                 :class="{ 
                   'seat-online': seat.status === 'occupied',
                   'seat-disabled': seat.status === 'disabled'
                 }"
                 :title="`${seat.status === 'disabled' ? '不可用' : seat.status === 'occupied' ? '占用' : '空闲'}`">
              <div class="seat-rectangle" :class="getSeatClass(seat)"></div>
            </div>
          </div>
          
          <!-- 中间走道 -->
          <div class="aisle"></div>
          
          <!-- 右侧座位区域 -->
          <div class="row-right-section">
            <div v-for="seat in room110SeatsByRow[row].right" 
                 :key="seat.id"
                 class="seat-item-110"
                 :class="{ 
                   'seat-online': seat.status === 'occupied',
                   'seat-disabled': seat.status === 'disabled'
                 }"
                 :title="`${seat.status === 'disabled' ? '不可用' : seat.status === 'occupied' ? '占用' : '空闲'}`">
              <div class="seat-rectangle" :class="getSeatClass(seat)"></div>
            </div>
          </div>
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

// 座位数据 - 左侧2个座位（106教室）
const leftSection = reactive([
  { id: 'L1', label: 'A1', status: 'available', occupant: null },
  { id: 'L2', label: 'A2', status: 'occupied', occupant: '张三' }
])

// 座位数据 - 右侧3个座位（106教室）
const rightSection = reactive([
  { id: 'R1', label: 'B1', status: 'available', occupant: null },
  { id: 'R2', label: 'B2', status: 'occupied', occupant: '李四' },
  { id: 'R3', label: 'B3', status: 'available', occupant: null }
])

// 110教室座位配置 - 7行，每行左6右3
const room110SeatConfig = {
  rows: 7,
  leftSeatsPerRow: 6,
  rightSeatsPerRow: 3,
  // 不可用座位配置 - 用户可以自定义
  disabledSeats: [
    // 示例：第1行左侧第1个和第6个座位不可用
    'L1-1', 'L1-6',
    // 第3行右侧第2个座位不可用
    'R3-2',
    // 第5行左侧第3、4个座位不可用
    'L5-3', 'L5-4',
    // 第7行右侧第1个座位不可用
    'R7-1'
  ]
}

// 生成110教室座位数据
const generateRoom110Seats = () => {
  const seats = []
  const { rows, leftSeatsPerRow, rightSeatsPerRow, disabledSeats } = room110SeatConfig
  
  // 生成左侧座位（每行6个）
  for (let row = 1; row <= rows; row++) {
    for (let seat = 1; seat <= leftSeatsPerRow; seat++) {
      const seatId = `L${row}-${seat}`
      const isDisabled = disabledSeats.includes(seatId)
      
      seats.push({
        id: seatId,
        label: `L${row}-${seat}`,
        row: row,
        column: seat,
        side: 'left',
        status: isDisabled ? 'disabled' : (Math.random() > 0.7 ? 'occupied' : 'available'),
        occupant: null,
        type: 'rectangle' // 使用圆角矩形
      })
    }
  }
  
  // 生成右侧座位（每行3个）
  for (let row = 1; row <= rows; row++) {
    for (let seat = 1; seat <= rightSeatsPerRow; seat++) {
      const seatId = `R${row}-${seat}`
      const isDisabled = disabledSeats.includes(seatId)
      
      seats.push({
        id: seatId,
        label: `R${row}-${seat}`,
        row: row,
        column: seat,
        side: 'right',
        status: isDisabled ? 'disabled' : (Math.random() > 0.8 ? 'occupied' : 'available'),
        occupant: null,
        type: 'rectangle' // 使用圆角矩形
      })
    }
  }
  
  return seats
}

// 110教室座位数据
const room110Seats = reactive(generateRoom110Seats())

// 获取110教室按行分组的座位数据
const room110SeatsByRow = computed(() => {
  const seatsByRow = {}
  
  for (let row = 1; row <= room110SeatConfig.rows; row++) {
    seatsByRow[row] = {
      left: room110Seats.filter(seat => seat.row === row && seat.side === 'left'),
      right: room110Seats.filter(seat => seat.row === row && seat.side === 'right')
    }
  }
  
  return seatsByRow
})

// 更新座位配置的方法
const updateRoom110Config = (newConfig) => {
  Object.assign(room110SeatConfig, newConfig)
  // 重新生成座位数据
  room110Seats.splice(0, room110Seats.length, ...generateRoom110Seats())
}

// 获取110教室座位的CSS类
const getSeatClass = (seat) => {
  const baseClass = 'seat-base'
  if (seat.status === 'disabled') {
    return `${baseClass} seat-disabled-style`
  } else if (seat.status === 'occupied') {
    return `${baseClass} seat-occupied-style`
  } else {
    return `${baseClass} seat-available-style`
  }
}

// 根据座位状态和主题获取颜色（若统一颜色则忽略状态）
const getSeatColors = (seat) => {
  if (props.octagonUniformColor) return [props.octagonUniformColor]
  
  if (seat.status === 'disabled') {
    // 不可用状态：深灰色
    return ['#9ca3af', '#6b7280']
  } else if (seat.status === 'available') {
    // 空闲状态：白天灰色，夜晚深灰色
    return props.isDarkMode ? ['#4a5568', '#6b7280'] : ['#e5e7eb', '#f3f4f6']
  } else {
    // 在线状态：白天带荧光黄的绿色，夜晚白色
    return props.isDarkMode ? ['#ffffff', '#ffffff'] : ['#6fdaa3', '#6fdaa3']
  }
}

// 计算在线人数和总座位数
const onlineCount = computed(() => {
  if (props.currentRoomId === '110') {
    return room110Seats.filter(seat => seat.status === 'occupied').length
  }
  const allSeats = [...leftSection, ...rightSection]
  return allSeats.filter(seat => seat.status === 'occupied').length
})

const totalSeats = computed(() => {
  if (props.currentRoomId === '110') {
    return room110Seats.filter(seat => seat.status !== 'disabled').length
  }
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
    if (props.currentRoomId === '110') {
      return room110Seats.find(seat => seat.id === id)
    }
    const allSeats = [...leftSection, ...rightSection]
    return allSeats.find(seat => seat.id === id)
  },
  updateSeatStatus: (id, status, occupant = null) => {
    // 更新座位状态
    let seat
    if (props.currentRoomId === '110') {
      seat = room110Seats.find(s => s.id === id)
    } else {
      const allSeats = [...leftSection, ...rightSection]
      seat = allSeats.find(s => s.id === id)
    }
    
    if (seat) {
      seat.status = status
      seat.occupant = occupant
      return true
    }
    return false
  },
  getAllSeats: () => {
    // 获取所有座位
    if (props.currentRoomId === '110') {
      return [...room110Seats]
    }
    return [...leftSection, ...rightSection]
  },
  getOnlineStats: () => {
    return {
      onlineCount: onlineCount.value,
      totalSeats: totalSeats.value
    }
  },
  // 110教室专用方法
  updateRoom110Config: updateRoom110Config,
  getRoom110Config: () => room110SeatConfig,
  regenerateRoom110Seats: () => {
    room110Seats.splice(0, room110Seats.length, ...generateRoom110Seats())
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

/* 110教室样式 */
.room-110-layout {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 50px 0 50px 0;
}

.room-110-seats {
  display: flex;
  flex-direction: column;
  gap: 50px;
  align-items: center;
  width: 100%;
  max-width: 800px;
}

.seat-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60px;
  width: 100%;
}

.row-left-section, .row-right-section {
  display: flex;
  gap: 16px;
}

.aisle {
  width: 60px;
  height: 0;
}

.seat-item-110 {
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.seat-item-110:hover:not(.seat-disabled) {
  transform: translateY(-2px) scale(1.1);
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.15));
}

.seat-map-container.dark .seat-item-110.seat-online {
  filter: drop-shadow(0 4px 12px rgba(255, 255, 255, 0.4));
}

.seat-rectangle {
  width: 48px;
  height: 16px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  cursor: pointer;
  /* border: 2px solid transparent; */
}

.seat-rectangle.seat-base.seat-available-style {
  background: #e5e7eb;
  border-color: #d1d5db;
}

.seat-rectangle.seat-base.seat-occupied-style {
  background: #6fdaa3;
  border-color: #34d399;
  box-shadow: 0 4px 12px rgba(109, 218, 163, 0.4);
}

.seat-rectangle.seat-base.seat-disabled-style {
  background: #9ca3af;
  border-color: #6b7280;
  cursor: not-allowed;
  opacity: 0.5;
}

.seat-map-container.dark .seat-rectangle.seat-base.seat-available-style {
  background: #4a5568;
  border-color: #6b7280;
}

.seat-map-container.dark .seat-rectangle.seat-base.seat-occupied-style {
  background: #ffffff;
  border-color: #e5e7eb;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
}

/* 响应式设计 - 110教室 */
@media (max-width: 768px) {
  .room-110-seats {
    gap: 16px;
    max-width: 600px;
  }
  
  .seat-row {
    gap: 40px;
  }
  
  .row-left-section, .row-right-section {
    gap: 12px;
  }
  
  .seat-rectangle {
    width: 40px;
    height: 30px;
  }
  
  .aisle {
    width: 40px;
  }
}

@media (max-width: 480px) {
  .room-110-seats {
    gap: 12px;
    max-width: 400px;
  }
  
  .seat-rectangle {
    width: 32px;
    height: 24px;
    border-radius: 6px;
  }
  
  .row-left-section, .row-right-section {
    gap: 8px;
  }
  
  .seat-row {
    gap: 30px;
  }
  
  .aisle {
    width: 30px;
  }
}
</style>