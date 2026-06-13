<template>
  <div class="live-panel" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    <!-- 问候区 -->
    <div class="live-panel__header">
      <div class="live-panel__greeting">
        <h2 class="greeting-text">{{ greetingText }}，{{ userName }}</h2>
        <p class="greeting-date">{{ todayDate }}</p>
      </div>
    </div>

    <!-- 打卡状态（居中胶囊，点击展开座位浮岛） -->
    <div class="live-panel__status">
      <DewIsland v-model="isIslandOpen" :panel-width="'min(360px, calc(100vw - 24px))'">
        <template #trigger>
          <DewButton
            v-if="checkinInfo.checkedIn && !checkinInfo.checkedOut"
            :active="true"
            size="lg"
          >
            <span class="status-dot status-dot--active"></span>
            {{ checkinInfo.isOvertime ? '超时学习中' : '学习中' }}
            <span class="status-timer">{{ currentStudyDuration }}</span>
          </DewButton>
          <DewButton
            v-else-if="checkinInfo.checkedOut"
            size="lg"
          >
            ✦ 今日已完成 · {{ todayTotalDuration }}
          </DewButton>
          <DewButton
            v-else
            type="ghost"
            size="lg"
          >
            未打卡
          </DewButton>
        </template>

        <!-- 浮岛内容：106 自习室实况 -->
        <div class="island-content">
          <div class="room-header">
            <div class="online-stats">
              <span class="stats-label">在线</span>
              <span class="stats-value">{{ onlineCount }}/{{ totalSeats }}</span>
            </div>
            <h2 class="room-title">106 自习室实况</h2>
          </div>
          <div class="seat-map-wrap">
            <SeatMap
              current-room-id="106"
              :octagon-size="seatMapConfig.octagonSize"
              :is-dark-mode="isDarkMode"
              ref="seatMapRef"
            />
          </div>
        </div>
      </DewIsland>
    </div>

    <!-- 统计卡片 -->
    <div class="live-panel__stats">
      <DewCard :tinted="true" accent="primary" :glass="true">
        <div class="stat-card">
          <div class="stat-value">{{ monthlyStats.totalDays || 0 }}</div>
          <div class="stat-label">本月学习天数</div>
        </div>
      </DewCard>
      <DewCard :tinted="true" accent="success" :glass="true">
        <div class="stat-card">
          <div class="stat-value">{{ monthlyStats.totalHours || 0 }}<span class="stat-unit">h</span></div>
          <div class="stat-label">本月学习时长</div>
        </div>
      </DewCard>
      <DewCard :tinted="true" accent="warning" :glass="true">
        <div class="stat-card">
          <div class="stat-value">{{ monthlyStats.rank || '--' }}</div>
          <div class="stat-label">月度排名</div>
        </div>
      </DewCard>
      <DewCard :tinted="true" :glass="true">
        <div class="stat-card">
          <div class="stat-value study-duration-value">{{ todayTotalDuration }}</div>
          <div class="stat-label">今日累计</div>
        </div>
      </DewCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import api from '../../api'
import DewCard from '../ui/DewCard.vue'
import DewButton from '../ui/DewButton.vue'
import DewIsland from '../ui/DewIsland.vue'
import SeatMap from './SeatMap.vue'

const store = useStore()

// ── 主题 ──
const isDarkMode = computed(() => store.getters.isDarkMode)

// ── 问候语 ──
const greetingText = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return '夜深了'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const userName = computed(() => store.state.user?.name || '同学')

const todayDate = computed(() => {
  const now = new Date()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekDay = weekDays[now.getDay()]
  return `${month}月${day}日 星期${weekDay}`
})

// ── 月度统计（API 数据） ──
const monthlyStats = ref({
  totalDays: 18,
  totalHours: 47,
  rank: 12,
})

async function fetchMonthlyStats() {
  try {
    const res = await api.get('/records/my_stats')
    const data = res.data.data
    if (data) {
      monthlyStats.value = {
        totalDays: data.total_days || 0,
        totalHours: Math.floor(data.month_hours || 0),
        rank: data.month_rank || null,
      }
    }
  } catch (error) {
    console.error('获取月度统计数据失败:', error)
  }
}

// ── 打卡状态（只读展示，不含签到/签退操作） ──
const checkinInfo = ref({
  checkedIn: true,
  checkedOut: false,
  checkinTime: '14:30',
  checkinTimestamp: Date.now() - 2 * 3600 * 1000 - 15 * 60 * 1000, // 2h15m 前
  isOvertime: false,
})

const currentStudyDuration = ref('02:15:33')
const todayTotalDuration = ref('3h 20m')
let studyTimer = null
let timeTimer = null
const nowTime = ref(new Date())

// ── 浮岛（座位实况） ──
const isIslandOpen = ref(false)
const seatMapRef = ref(null)
const onlineCount = ref(0)
const totalSeats = ref(0)
const seatMapConfig = ref({ octagonSize: 140 })

// SeatMap 通过 defineExpose 暴露 onlineCount/totalSeats（computed ref）
watch(() => seatMapRef.value?.onlineCount, (n) => {
  if (typeof n === 'number') onlineCount.value = n
})
watch(() => seatMapRef.value?.totalSeats, (t) => {
  if (typeof t === 'number') totalSeats.value = t
})
// SeatMap 懒挂载在 v-if 面板内，首次展开时同步一次计数
watch(isIslandOpen, async (open) => {
  if (open) {
    await nextTick()
    const stats = seatMapRef.value?.getOnlineStats?.()
    if (stats) {
      onlineCount.value = stats.onlineCount
      totalSeats.value = stats.totalSeats
    }
  }
})

// 登录检查
const checkLogin = () => !!localStorage.getItem('token')

// 获取最新打卡状态
async function getLatestCheckStatus() {
  if (!checkLogin()) return

  try {
    const res = await api({ url: '/lateset_checktime', method: 'get' })
    const data = res.data

    if (!data || !data.has_record || !data.check_in_time) {
      checkinInfo.value.checkedIn = false
      checkinInfo.value.checkedOut = false
      return
    }

    if (!data.check_out_time) {
      // 已签到但未签退
      checkinInfo.value.checkedIn = true
      checkinInfo.value.checkedOut = false
      checkinInfo.value.checkinTime = data.check_in_time
      checkinInfo.value.checkinTimestamp = new Date(data.check_in_time).getTime()

      // 启动计时器
      if (!studyTimer) {
        studyTimer = setInterval(() => {
          updateStudyDuration()
          checkOvertime()
        }, 1000)
        updateStudyDuration()
      }
    } else {
      // 已签到且已签退
      checkinInfo.value.checkedIn = false
      checkinInfo.value.checkedOut = true
    }
  } catch (error) {
    console.error('获取打卡状态失败:', error)
  }
}

// 实时学习计时
function updateStudyDuration() {
  if (!checkinInfo.value.checkinTimestamp) return
  const diff = Date.now() - checkinInfo.value.checkinTimestamp
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  currentStudyDuration.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// 超时检测（超过 6 小时）
function checkOvertime() {
  if (!checkinInfo.value.checkinTimestamp) return
  const diffHours = (Date.now() - checkinInfo.value.checkinTimestamp) / (1000 * 60 * 60)
  checkinInfo.value.isOvertime = diffHours > 6
}

// 计算今日累计时长
async function calculateTodayTotalDuration() {
  if (!checkLogin()) return

  const today = new Date().toISOString().split('T')[0]

  try {
    const recordsRes = await api({ url: '/records', method: 'get' })

    if (recordsRes.status === 200 && recordsRes.data) {
      const allRecords = [
        ...(recordsRes.data.current_month?.records || []),
        ...(recordsRes.data.previous_month?.records || []),
      ]

      const todayRecord = allRecords.find(record => record.date === today)

      if (todayRecord && todayRecord.total_hours) {
        todayTotalDuration.value = formatHoursToDuration(todayRecord.total_hours)
        return
      }
    }

    // 备用：从最新状态获取
    const latestRes = await api({ url: '/lateset_checktime', method: 'get' })
    if (latestRes.status === 200 && latestRes.data && latestRes.data.has_record) {
      const recordDate = latestRes.data.date
      if (recordDate === today && latestRes.data.duration) {
        const duration = latestRes.data.duration
        if (typeof duration === 'number') {
          todayTotalDuration.value = formatHoursToDuration(duration)
        } else if (typeof duration === 'string') {
          todayTotalDuration.value = parseDurationString(duration)
        }
        return
      }
    }

    todayTotalDuration.value = '0m'
  } catch (error) {
    console.error('获取今日总时长失败:', error)
  }
}

// 格式化小时数 → "xh xm" 或 "xm"
function formatHoursToDuration(hours) {
  if (!hours || hours <= 0 || hours < 0.005) return '0m'
  const totalMinutes = Math.floor(hours * 60)
  if (totalMinutes <= 0) return '0m'
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// 解析中文时长字符串 → "xh xm" 或 "xm"
function parseDurationString(str) {
  if (!str || str === '0小时0分钟') return '0m'
  const h = Math.floor(parseInt(str.match(/(\d+)小时/)?.[1]) || 0)
  const m = Math.floor(parseInt(str.match(/(\d+)分钟/)?.[1]) || 0)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── 生命周期 ──
onMounted(async () => {
  timeTimer = setInterval(() => { nowTime.value = new Date() }, 1000)

  // TODO: 取消注释以接入真实 API
  // if (checkLogin()) {
  //   await getLatestCheckStatus()
  //   await fetchMonthlyStats()
  //   await calculateTodayTotalDuration()
  // }

  // Mock: 启动计时器让时长跳动
  if (checkinInfo.value.checkedIn) {
    studyTimer = setInterval(() => {
      updateStudyDuration()
      checkOvertime()
    }, 1000)
    updateStudyDuration()
  }
})

onUnmounted(() => {
  if (studyTimer) clearInterval(studyTimer)
  if (timeTimer) clearInterval(timeTimer)
})
</script>

<style>
/* ── 面板容器 ── */
.live-panel {
  width: 100%;
  padding: 24px;
  box-sizing: border-box;
}

/* ── 问候区 ── */
.live-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.greeting-text {
  font-size: 22px;
  font-weight: 700;
  color: var(--dew-text-heading);
  margin: 0 0 4px;
  font-family: var(--dew-font, inherit);
}

.greeting-date {
  font-size: 14px;
  color: var(--dew-text-muted);
  margin: 0;
  font-family: var(--dew-font, inherit);
}

/* ── 打卡状态（居中大按钮） ── */
.live-panel__status {
  /* DewButton 是 inline-flex，用 text-align 居中最稳，不受内联 width 影响 */
  text-align: center;
  margin-bottom: 24px;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: pulse-dot 2s infinite;
}

.status-timer {
  font-variant-numeric: tabular-nums;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Mono', monospace;
  opacity: 0.85;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── 浮岛内容（座位实况） ── */
.island-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 14px 4px;
}

.room-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.online-stats {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-size: 13px;
  color: var(--dew-text-muted);
}

.online-stats .stats-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--dew-text-heading);
  font-variant-numeric: tabular-nums;
}

.room-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: var(--dew-text-heading);
  font-family: var(--dew-font, inherit);
}

/* SeatMap 根是 height:100%/width:100%，必须给显式尺寸的父盒子 */
.seat-map-wrap {
  height: 300px;
  width: 100%;
}

/* ── 统计卡片行 ── */
.live-panel__stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

/* ── 统计卡片内容 ── */
.stat-card {
  text-align: center;
  padding: 12px 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 6px;
}

.stat-unit {
  font-size: 16px;
  font-weight: 500;
  opacity: 0.7;
}

.stat-label {
  font-size: 13px;
  color: var(--dew-text-muted);
}

.study-duration-value {
  font-size: 22px;
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .live-panel {
    padding: 16px;
  }

  .live-panel__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .greeting-text {
    font-size: 18px;
  }

  .live-panel__stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .stat-value {
    font-size: 22px;
  }

  .study-duration-value {
    font-size: 18px;
  }
}

@media (max-width: 480px) {
  .live-panel {
    padding: 12px;
  }

  .greeting-text {
    font-size: 16px;
  }

  .stat-value {
    font-size: 20px;
  }

  .study-duration-value {
    font-size: 16px;
  }

  .stat-label {
    font-size: 12px;
  }
}
</style>
