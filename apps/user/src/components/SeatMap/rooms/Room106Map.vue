<template>
  <div class="room-106" :class="{ dark: isDarkMode }">
    <!-- 在线人数：占用座位数 / 总座位数（5 八角形 × 8 三角形 = 40） -->
    <div class="room-106__head">
      <span class="room-106__dot"></span>
      <span class="room-106__count">
        在线 <strong>{{ onlineCount }}</strong><span class="room-106__sep">/</span>{{ totalSeats }}
      </span>
    </div>

    <div class="room-106__layout">
      <!-- 左侧 2 个八角形 -->
      <div class="room-106__col">
        <DewPopover
          v-for="oct in leftOctagons"
          :key="oct.id"
          trigger="hover"
          placement="top"
          :show-arrow="true"
        >
          <template #trigger>
            <div class="seat-item">
              <OctagonShape
                :size="octagonSize"
                :radius="octagonRadius"
                :corner-radius="octagonCornerRadius"
                :count="8"
                :colors="octColors(oct)"
                :gap="octagonGap"
                :uniform-color="octagonUniformColor || undefined"
                @triangle-hover="onTriHover(oct, $event.index)"
              />
            </div>
          </template>
          <SeatTip :seat="curSeat(oct)" :zone="oct.id" />
        </DewPopover>
      </div>

      <!-- 右侧 3 个八角形 -->
      <div class="room-106__col room-106__col--right">
        <DewPopover
          v-for="oct in rightOctagons"
          :key="oct.id"
          trigger="hover"
          placement="top"
          :show-arrow="true"
        >
          <template #trigger>
            <div class="seat-item">
              <OctagonShape
                :size="octagonSize"
                :radius="octagonRadius"
                :corner-radius="octagonCornerRadius"
                :count="8"
                :colors="octColors(oct)"
                :gap="octagonGap"
                :uniform-color="octagonUniformColor || undefined"
                @triangle-hover="onTriHover(oct, $event.index)"
              />
            </div>
          </template>
          <SeatTip :seat="curSeat(oct)" :zone="oct.id" />
        </DewPopover>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, h } from 'vue'
import OctagonShape from '../OctagonShape.vue'
import DewPopover from '../../ui/DewPopover.vue'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  // 八角形：size=SVG 画布，radius=外接圆半径（直径≈2×radius）；缩小调 radius，size 需 ≥ 2×radius
  octagonSize: { type: Number, default: 120 },
  octagonRadius: { type: Number, default: 56 },
  octagonCornerRadius: { type: Number, default: 8 },
  octagonGap: { type: Number, default: 4 },
  octagonUniformColor: { type: String, default: '' },
})

// 姓名池（mock）
const NAMES = ['张三','李四','王五','赵六','陈七','周八','吴九','郑十','孙杰','钱一','林冲','武松','宋江','鲁智深','燕青','史进','柴进','戴宗','李逵','时迁','刘备','关羽','张飞','马超','黄忠','魏延','赵云','孔明']
let nameIdx = 0
const nextName = () => NAMES[nameIdx++ % NAMES.length]

// 生成一个八角形的 8 个三角形座位（mock，~70% 占用）
function makeOctagon(id) {
  return {
    id,
    hoveredIndex: -1,
    seats: Array.from({ length: 8 }, (_, i) => {
      const occupied = Math.random() < 0.7
      return {
        id: `${id}${i + 1}`,
        label: `${id}${i + 1}`,
        status: occupied ? 'occupied' : 'available',
        occupant: occupied ? nextName() : null,
      }
    }),
  }
}

const leftOctagons = reactive([makeOctagon('A'), makeOctagon('B')])
const rightOctagons = reactive([makeOctagon('C'), makeOctagon('D'), makeOctagon('E')])

const allOctagons = computed(() => [...leftOctagons, ...rightOctagons])
const totalSeats = computed(() => allOctagons.value.reduce((n, o) => n + o.seats.length, 0))
const onlineCount = computed(() =>
  allOctagons.value.reduce((n, o) => n + o.seats.filter(s => s.status === 'occupied').length, 0)
)

// 每个三角形（座位）的状态色 → OctagonShape 的 colors 数组（一三角形一色）
function seatColor(status) {
  if (status === 'disabled') return props.isDarkMode ? '#6b7280' : '#9ca3af'
  if (status === 'occupied') return props.isDarkMode ? '#ffffff' : '#6fdaa3'
  return props.isDarkMode ? '#4a5568' : '#e5e7eb' // available
}
const octColors = (oct) => oct.seats.map(s => seatColor(s.status))

// 悬停到某个三角形
function onTriHover(oct, index) {
  oct.hoveredIndex = index
}
const curSeat = (oct) => (oct.hoveredIndex >= 0 ? oct.seats[oct.hoveredIndex] : null)

// 悬停提示（轻量函数式组件，左右两列共用）
// 注意：DewPopover 内容 Teleport 到 body，函数式组件 h() 渲染的节点不带 scoped 属性，
// 所以用内联样式 + var() 主题色（teleport 后仍能从 body 的 theme class 解析）
const PAD = 'padding:8px 12px;min-width:96px;'
const LABEL_ST = 'font-size:13px;font-weight:700;color:var(--dew-popover-text);margin-bottom:2px;'
const SeatTip = ({ seat, zone }) => {
  if (!seat) {
    return h('div', { style: PAD }, [
      h('div', { style: LABEL_ST }, `${zone} 区`),
      h('div', { style: 'font-size:12px;color:var(--dew-text-muted);' }, '悬停查看座位'),
    ])
  }
  const text = seat.status === 'occupied' ? (seat.occupant ? `${seat.occupant} 正在学习` : '占用中')
    : seat.status === 'disabled' ? '不可用' : '空闲'
  const sc = seat.status === 'occupied' ? '#10b981'
    : seat.status === 'disabled' ? '#9ca3af' : 'var(--dew-text-muted)'
  return h('div', { style: PAD }, [
    h('div', { style: LABEL_ST }, `${seat.label} 座位`),
    h('div', { style: `font-size:12px;color:${sc};` }, text),
  ])
}

defineExpose({
  getOnlineStats: () => ({ onlineCount: onlineCount.value, totalSeats: totalSeats.value }),
  onlineCount,
  totalSeats,
})
</script>

<style scoped>
.room-106 {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  overflow: hidden;
  box-sizing: border-box;
}
.room-106.dark {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
  color: #fff;
}

/* 在线人数头部 */
.room-106__head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-bottom: 10px;
  font-size: 14px;
  color: var(--dew-text-muted, #6b7280);
}
.room-106.dark .room-106__head {
  color: rgba(255, 255, 255, 0.7);
}
.room-106__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
  animation: room-pulse 2s infinite;
}
.room-106__count strong {
  font-size: 18px;
  font-weight: 800;
  color: var(--dew-text-heading, #1f2937);
  font-variant-numeric: tabular-nums;
}
.room-106.dark .room-106__count strong {
  color: #fff;
}
.room-106__sep {
  margin: 0 1px;
  opacity: 0.5;
}
@keyframes room-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.room-106__layout {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex: 1;
  min-height: 0;
}
.room-106__col {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  align-items: center;
  justify-content: center;
}
.room-106__col--right {
  gap: 12px;
}

.seat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 八角形整体悬停不上浮（按需求移除 translateY 交互） */
}

@media (max-width: 768px) {
  .room-106 { padding: 12px; }
  .room-106__layout { flex-direction: column; gap: 12px; }
}
</style>
