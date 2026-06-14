<template>
  <div class="room-106" :class="{ dark: isDarkMode }">
    <!-- 在线人数（真实数据） -->
    <div class="room-106__head">
      <span class="room-106__dot"></span>
      <span class="room-106__count">
        在线 <strong>{{ online }}</strong><span class="room-106__sep">/</span>{{ total }}
      </span>
    </div>

    <div v-if="loading" class="room-106__status">加载中…</div>
    <div v-else-if="error" class="room-106__status room-106__status--err">{{ error }}</div>

    <div v-else class="room-106__layout">
      <!-- 左侧八角形：A、B -->
      <div class="room-106__col">
        <div v-for="oct in leftOctagons" :key="oct.letter" class="seat-item">
          <OctagonShape
            :size="octagonSize"
            :radius="octagonRadius"
            :corner-radius="octagonCornerRadius"
            :count="8"
            :colors="octColors(oct.seats)"
            :gap="octagonGap"
            :uniform-color="octagonUniformColor || undefined"
            @triangle-hover="onTriHover(oct.letter, $event)"
            @triangle-leave="onTriLeave"
          />
        </div>
      </div>

      <!-- 右侧八角形：C、D、E -->
      <div class="room-106__col room-106__col--right">
        <div v-for="oct in rightOctagons" :key="oct.letter" class="seat-item">
          <OctagonShape
            :size="octagonSize"
            :radius="octagonRadius"
            :corner-radius="octagonCornerRadius"
            :count="8"
            :colors="octColors(oct.seats)"
            :gap="octagonGap"
            :uniform-color="octagonUniformColor || undefined"
            @triangle-hover="onTriHover(oct.letter, $event)"
            @triangle-leave="onTriLeave"
          />
        </div>
      </div>
    </div>

    <!-- 悬停三角形：跟随光标的提示（Teleport 到 body，定位到光标/三角形位置） -->
    <Teleport to="body">
      <div v-if="tip.visible" class="seat-tip-pop" :style="tipStyle">
        <SeatTip :seat="tip.seat" />
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { reactive, ref, computed, h, onMounted } from 'vue'
import OctagonShape from '../OctagonShape.vue'
import api from '../../../api'

const props = defineProps({
  isDarkMode: { type: Boolean, default: false },
  octagonSize: { type: Number, default: 120 },
  octagonRadius: { type: Number, default: 56 },
  octagonCornerRadius: { type: Number, default: 8 },
  octagonGap: { type: Number, default: 4 },
  octagonUniformColor: { type: String, default: '' },
})

const ROOM_NAME = '106'
const online = ref(0)
const total = ref(0)
const loading = ref(true)
const error = ref('')
const octagonMap = reactive({})  // { A: [seat×8], ... }

// 悬停提示状态（跟随光标）
const tip = reactive({ visible: false, x: 0, y: 0, seat: null })

async function fetchSeats() {
  loading.value = true
  error.value = ''
  try {
    const res = await api.get(`/seat/rooms/${ROOM_NAME}/seats`)
    const data = res.data
    if (data.code !== 200) throw new Error(data.message || '获取座位失败')
    online.value = data.Online || 0
    total.value = data.Total_Seats || 0

    const groups = {}
    for (const s of (data.seats || [])) {
      const letter = s.Seat_Label[0]
      const idx = parseInt(s.Seat_Label.slice(1)) - 1
      if (!groups[letter]) groups[letter] = new Array(8).fill(null)
      groups[letter][idx] = s
    }
    for (const k of Object.keys(octagonMap)) delete octagonMap[k]
    Object.assign(octagonMap, groups)
  } catch (e) {
    error.value = (e && e.message) ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

const LEFT = ['A', 'B']
const RIGHT = ['C', 'D', 'E']
const leftOctagons = computed(() =>
  LEFT.map(l => ({ letter: l, seats: octagonMap[l] || [] })).filter(o => o.seats.length)
)
const rightOctagons = computed(() =>
  RIGHT.map(l => ({ letter: l, seats: octagonMap[l] || [] })).filter(o => o.seats.length)
)

function octColors(seats) {
  const occupied = props.isDarkMode ? '#ffffff' : '#6fdaa3'
  const free = props.isDarkMode ? '#4a5568' : '#e5e7eb'
  const empty = props.isDarkMode ? '#2d3748' : '#f3f4f6'
  return seats.map(s => s ? (s.Occupied ? occupied : free) : empty)
}

// 悬停某个三角形：定位到光标位置，显示该座位信息
function onTriHover(letter, payload) {
  const seats = octagonMap[letter] || []
  const seat = payload.index >= 0 ? seats[payload.index] : null
  tip.visible = true
  tip.x = payload.clientX
  tip.y = payload.clientY
  tip.seat = seat
}
function onTriLeave() {
  tip.visible = false
}

// 提示框样式：定位到光标、浮在上方，DewPopover 风格底（var() 在 body 上解析）
const tipStyle = computed(() => ({
  left: tip.x + 'px',
  top: tip.y + 'px',
  position: 'fixed',
  zIndex: 2000,
  transform: 'translate(-50%, calc(-100% - 12px))',
  background: 'var(--dew-popover-bg)',
  border: '1px solid var(--dew-popover-border)',
  borderRadius: 'var(--dew-popover-radius)',
  boxShadow: 'var(--dew-popover-shadow)',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
}))

// 提示内容（函数式组件 + 内联 var() 样式，Teleport 后也能正确解析）
const SeatTip = ({ seat }) => {
  const PAD = 'padding:8px 12px;min-width:96px;'
  const LABEL = 'font-size:13px;font-weight:700;color:var(--dew-popover-text);margin-bottom:2px;'
  if (!seat) {
    return h('div', { style: PAD + 'font-size:12px;color:var(--dew-text-muted);' }, '悬停查看座位')
  }
  if (seat.Bound_User_Name) {
    const line = seat.Occupied
      ? h('div', { style: 'font-size:12px;color:#10b981;' }, `${seat.Bound_User_Name} 正在学习`)
      : h('div', { style: 'font-size:12px;color:var(--dew-text-muted);' }, `${seat.Bound_User_Name}（未打卡）`)
    return h('div', { style: PAD }, [h('div', { style: LABEL }, `${seat.Seat_Label} 座位`), line])
  }
  return h('div', { style: PAD }, [
    h('div', { style: LABEL }, `${seat.Seat_Label} 座位`),
    h('div', { style: 'font-size:12px;color:var(--dew-text-faint);' }, '未分配'),
  ])
}

onMounted(fetchSeats)

defineExpose({
  refresh: fetchSeats,
  getOnlineStats: () => ({ onlineCount: online.value, totalSeats: total.value }),
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
.room-106.dark .room-106__head { color: rgba(255, 255, 255, 0.7); }
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
.room-106.dark .room-106__count strong { color: #fff; }
.room-106__sep { margin: 0 1px; opacity: 0.5; }
@keyframes room-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.room-106__status {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--dew-text-muted, #6b7280);
}
.room-106__status--err { color: #ef4444; }

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
.room-106__col--right { gap: 12px; }

.seat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (max-width: 768px) {
  .room-106 { padding: 12px; }
  .room-106__layout { flex-direction: column; gap: 12px; }
}
</style>
