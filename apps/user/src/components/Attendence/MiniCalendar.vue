<template>
  <div class="mini-cal-wrap" @click="goToFull">
  <DewCard :glass="true" :divided="true" size="lg" class="mini-cal-card">
    <template #header>
      <div class="mini-cal-header">
        <div class="mini-cal-title">近两月出勤</div>
        <span class="mini-cal-link">查看全年 ›</span>
      </div>
    </template>

    <div class="mini-cal-months" v-if="months.length">
      <div class="month-block" v-for="m in months" :key="m.key">
        <div class="month-label">{{ m.label }}</div>
        <div class="month-grid">
          <div
            v-for="(day, i) in m.records"
            :key="i"
            class="day-cell"
            :style="getMiniCellStyle(day)"
            :title="tooltip(day)"
          >
            <span v-if="isToday(day.date)" class="today-dot"></span>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="mini-cal-empty">暂无出勤记录</div>
  </DewCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import api from '../../api'
import DewCard from '../ui/DewCard.vue'

const router = useRouter()
const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

// /records 返回 { previous_month: {month_name, records:[...]}, current_month: {...} }
const previousMonth = ref(null) // { key, label, records }
const currentMonth = ref(null)

const months = computed(() => {
  const arr = []
  if (previousMonth.value) arr.push(previousMonth.value)
  if (currentMonth.value) arr.push(currentMonth.value)
  return arr
})

const fetchData = async () => {
  try {
    const resp = await api({ url: '/records', method: 'get' })
    const d = resp.data
    // 兼容 { code, data } 包裹与裸对象两种返回形态
    const payload = (d && d.code === 200 && d.data) ? d.data : d
    if (payload && payload.current_month) {
      currentMonth.value = buildMonth(payload.current_month, 'current')
    }
    if (payload && payload.previous_month) {
      previousMonth.value = buildMonth(payload.previous_month, 'previous')
    }
  } catch (e) {
    console.error('MiniCalendar fetch error:', e)
  }
}

function buildMonth(raw, key) {
  if (!raw) return null
  const records = Array.isArray(raw.records) ? raw.records : []
  return { key, label: prettyMonth(raw.month_name), records }
}

// 后端 month_name 形如 "2026-7月" / "7月"，统一提取为 "7月"
function prettyMonth(name) {
  if (!name) return ''
  const m = String(name).match(/(\d+)\s*月/)
  return m ? `${m[1]}月` : String(name)
}

function isToday(dateStr) {
  if (!dateStr) return false
  const d = new Date(dateStr)
  const t = new Date()
  return d.toDateString() === t.toDateString()
}

function tooltip(day) {
  if (!day || !day.date) return ''
  const hrs = day.total_hours
  if (hrs && hrs > 0) {
    const dur = day.total_duration ? `（${day.total_duration}）` : ''
    return `${day.date} · ${hrs}h${dur}`
  }
  return `${day.date} · 未打卡`
}

// 复用 CalendarComponent 的青色辉光配色（按时长分档 + 暗色 HSL 亮度映射），
// 仅把辉光尺寸缩到约 1/2，适配 10px 的小格子，避免发糊。
function getMiniCellStyle(day) {
  const dark = isDarkMode.value
  if (!day || !day.total_hours || day.total_hours <= 0) {
    // 未打卡：亮色给可见浅灰、暗色给浅白，避免在玻璃卡片上隐形
    return { backgroundColor: dark ? 'rgba(255,255,255,0.09)' : 'rgba(120,130,145,0.22)' }
  }
  const hours = day.total_hours
  const baseColor = '#00d2d3'

  let glowSize, glowOpacity, bgOpacity, lightColor

  if (dark) {
    const t = Math.min(Math.max(hours - 0.5, 0) / 7.5, 1) // 0.5h 起算、8h 满档
    const lightness = 30 + t * 52
    glowSize = (3 + t * 18) * 0.5
    glowOpacity = 0.15 + t * 0.55
    bgOpacity = 0.5 + t * 0.4
    lightColor = `hsl(180, 80%, ${lightness}%)`
  } else {
    if (hours <= 3) {
      glowSize = (6 + hours * 2) * 0.5
      glowOpacity = 0.2 + hours * 0.1
      bgOpacity = 0.5 + hours * 0.1
      lightColor = baseColor
    } else if (hours <= 6) {
      const ratio = (hours - 3) / 3
      glowSize = (10 + ratio * 6) * 0.5
      glowOpacity = 0.4 + ratio * 0.2
      bgOpacity = 0.6 + ratio * 0.15
      lightColor = baseColor
    } else {
      const ratio = (hours - 6) / 2
      glowSize = (14 + ratio * 4) * 0.5
      glowOpacity = 0.6 + ratio * 0.15
      bgOpacity = 0.75 + ratio * 0.1
      lightColor = baseColor
    }
  }

  return {
    backgroundColor: lightColor,
    boxShadow: `0 0 ${glowSize}px ${glowOpacity}px ${lightColor}`,
    opacity: bgOpacity
  }
}

function goToFull() {
  router.push({ name: 'user' })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.mini-cal-wrap {
  width: 100%;
  cursor: pointer;
}
.mini-cal-card {
  width: 100%;
  box-sizing: border-box;
  font-family: var(--dew-font, inherit);
}

/* ── 标题区：标题 + 查看全年 ── */
.mini-cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.mini-cal-title {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: var(--dew-text-heading);
}
.mini-cal-link {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  color: var(--dew-text-muted);
  background: var(--dew-popover-item-hover);
  transition: color 0.25s ease, background 0.25s ease;
}
.mini-cal-card:hover .mini-cal-link {
  color: var(--dew-text-heading);
}

/* ── 双月热力 ── */
.mini-cal-months {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
}
.month-block {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.month-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--dew-text-muted);
}
.month-grid {
  display: grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(7, 12px);
  grid-auto-columns: 12px;
  gap: 4px;
}
.day-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  position: relative;
  transition: transform 0.2s ease;
}
.day-cell:hover {
  transform: scale(1.25);
  z-index: 1;
}
.today-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 4px;
  height: 4px;
  background: #ff6b6b;
  border-radius: 50%;
}

.mini-cal-empty {
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  color: var(--dew-text-muted);
}

@media (max-width: 1200px) {
  .mini-cal-months { gap: 14px; }
}
@media (max-width: 1024px) {
  .mini-cal-months { gap: 10px; }
}
</style>
