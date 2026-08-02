<template>
  <div class="live-panel" :class="isDarkMode ? 'theme-dark' : 'theme-light'">
    <!-- 顶部一行：问候/日期（左对齐）+ 岛组（居中） -->
    <div class="live-panel__top">
      <div class="live-panel__greeting">
        <h2 class="greeting-text">{{ greetingText }}，{{ userName }}</h2>
        <p class="greeting-date">{{ todayDate }}</p>
      </div>

      <!-- 加载中：岛组骨架（主岛胶囊 + 卫星圆） -->
      <div class="live-panel__islands" v-if="loading" style="display: flex; align-items: center; gap: 12px;">
        <DewSkeleton variant="rect" width="160" height="44" rounded="999px" />
        <DewSkeleton variant="circle" :size="48" />
        <DewSkeleton variant="circle" :size="48" />
        <DewSkeleton variant="circle" :size="48" />
      </div>
      <DewIslandGroup v-else :items="islandItems" class="live-panel__islands">
        <template #main-trigger>
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
            今日已完成 · {{ todayTotalDuration }}
          </DewButton>
          <DewButton
            v-else
            type="ghost"
            size="lg"
          >
            未打卡
          </DewButton>
        </template>

        <template #main-content>
          <div class="today-panel">
            <div class="today-panel__label">今日累计</div>
            <div class="today-panel__value">{{ todayTotalDuration }}</div>
            <div class="today-panel__bar">
              <div class="today-panel__fill" :style="{ width: todayProgress + '%' }"></div>
            </div>
            <div class="today-panel__hint">目标 4h · 已完成 {{ todayProgress }}%</div>
          </div>
        </template>

        <template #detail="{ item }">
          <div class="sat-detail">
            <div class="sat-detail__title">{{ item.detailTitle }}</div>
            <div class="sat-detail__text">{{ item.detail }}</div>
          </div>
        </template>
      </DewIslandGroup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import api from '../../api'
import DewButton from '../ui/DewButton.vue'
import DewIslandGroup from '../ui/DewIslandGroup.vue'
import DewSkeleton from '../ui/DewSkeleton.vue'

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

const userName = computed(() => store.state.user?.User_Name || '同学')

const todayDate = computed(() => {
  const now = new Date()
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekDay = weekDays[now.getDay()]
  return `${month}月${day}日 星期${weekDay}`
})

// ── 月度统计（API 数据，初始 0 待 fetchMonthlyStats 填充） ──
const monthlyStats = ref({
  totalDays: 0,
  totalHours: 0,
  rank: null,
})

async function fetchMonthlyStats() {
  try {
    const res = await api.get('/records/my_stats')
    const data = res.data.data
    if (data) {
      monthlyStats.value = {
        totalDays: data.month_days || 0,
        totalHours: Math.floor(data.month_hours || 0),
        rank: data.month_rank || null,
      }
    }
  } catch (error) {
    console.error('获取月度统计数据失败:', error)
  }
}

// ── 打卡状态（只读展示，由 getLatestCheckStatus 填充） ──
const checkinInfo = ref({
  checkedIn: false,
  checkedOut: false,
  checkinTime: null,
  checkinTimestamp: null,
  isOvertime: false,
})

const currentStudyDuration = ref('00:00:00')
const todayTotalDuration = ref('0m')
let studyTimer = null
let timeTimer = null
const nowTime = ref(new Date())

// ── 岛组数据：3 个卫星岛（月天数/月时长/月排行） ──
const islandItems = computed(() => [
  {
    value: monthlyStats.value.totalDays || 0,
    unit: 'd',
    color: '#3b82f6',
    detailTitle: '本月学习天数',
    detail: `本月已学习 ${monthlyStats.value.totalDays || 0} 天，继续保持！`,
  },
  {
    value: monthlyStats.value.totalHours || 0,
    unit: 'h',
    color: '#22c55e',
    detailTitle: '本月学习时长',
    detail: `本月累计 ${monthlyStats.value.totalHours || 0} 小时。`,
  },
  {
    value: `#${monthlyStats.value.rank || '--'}`,
    color: '#f59e0b',
    detailTitle: '月度排名',
    detail: `当前月度排名第 ${monthlyStats.value.rank || '--'} 位。`,
  },
])

// 今日累计 → 进度（目标 4h）
const todayHoursNum = computed(() => {
  const s = todayTotalDuration.value || ''
  const h = parseInt(s.match(/(\d+)\s*h/)?.[1]) || 0
  const m = parseInt(s.match(/(\d+)\s*m/)?.[1]) || 0
  return h + m / 60
})
const todayProgress = computed(() => Math.min(100, Math.round((todayHoursNum.value / 4) * 100)))

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
const loading = ref(true)   // 首屏加载态：岛组骨架
onMounted(async () => {
  timeTimer = setInterval(() => { nowTime.value = new Date() }, 1000)

  // 接入真实 API（后端 /lateset_checktime、/records/my_stats 等已就绪）
  if (checkLogin()) {
    await getLatestCheckStatus()
    await fetchMonthlyStats()
    await calculateTodayTotalDuration()
  }
  loading.value = false
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

/* ── 顶部一行：问候/日期（左对齐）+ 岛组（居中） ──
   三列网格 1fr / auto / 1fr：左右两列等宽平衡，让中间岛组真正水平居中 */
.live-panel__top {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
}

.live-panel__greeting {
  grid-column: 1;
  min-width: 0;
}

.live-panel__islands {
  grid-column: 2;
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

/* 打卡胶囊内 */
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

/* ── 主岛展开：今日累计 ── */
.today-panel {
  padding: 16px;
}
.today-panel__label {
  font-size: 13px;
  color: var(--dew-text-muted);
  margin-bottom: 4px;
}
.today-panel__value {
  font-size: 22px;
  font-weight: 800;
  color: var(--dew-text-heading);
  font-variant-numeric: tabular-nums;
}
.today-panel__bar {
  margin-top: 12px;
  height: 6px;
  border-radius: 3px;
  background: rgba(127, 127, 127, 0.16);
  overflow: hidden;
}
.today-panel__fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #3b82f6, #22c55e);
  transition: width 0.4s var(--dew-bounce);
}
.today-panel__hint {
  font-size: 11px;
  color: var(--dew-text-faint);
  margin-top: 5px;
}

/* ── 卫星岛展开：详情 ── */
.sat-detail {
  padding: 14px 16px;
}
.sat-detail__title {
  font-size: 13px;
  color: var(--dew-text-muted);
  margin-bottom: 6px;
}
.sat-detail__text {
  font-size: 14px;
  color: var(--dew-text-heading);
  line-height: 1.6;
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .live-panel {
    padding: 16px;
  }

  /* 窄屏堆叠：问候在上，岛组在下（左对齐，岛组自动换行） */
  .live-panel__top {
    grid-template-columns: 1fr;
    justify-items: start;
    gap: 16px;
  }

  .live-panel__greeting,
  .live-panel__islands {
    grid-column: 1;
  }

  .greeting-text {
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
}
</style>
