<template>
  <div class="student-attendance-view" :class="{ 'theme-dark': isDarkMode }">
    <!-- 页面标题 -->
    <div class="page-header">
      <h3 class="page-title">考勤统计</h3>
      <div class="time-range">
        <span class="range-text">近30天数据</span>
      </div>
    </div>

    <!-- 个人考勤概览 -->
    <div class="personal-overview">
      <div class="overview-header">
        <h4>我的考勤表现</h4>
        <div v-if="currentUserRank && currentUserRank <= attendanceList.length" class="my-rank">
          <span class="rank-text">小组排名</span>
          <div class="rank-badge" :class="getRankClass(currentUserRank - 1)">
            <span v-if="currentUserRank <= 3" class="rank-icon">{{ getRankIcon(currentUserRank - 1) }}</span>
            <span v-else class="rank-number">{{ currentUserRank }}</span>
          </div>
        </div>
      </div>
      
      <div class="personal-stats">
        <div class="stat-card">
          <div class="stat-value">{{ personalStats.attendanceDays }}</div>
          <div class="stat-label">出勤天数</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ personalStats.onTimeRate }}%</div>
          <div class="stat-label">准时率</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ personalStats.totalHours }}h</div>
          <div class="stat-label">累计时长</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ personalStats.attendanceRate || personalStats.onTimeRate }}%</div>
          <div class="stat-label">出勤率</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ personalStats.lateCount || 0 }}</div>
          <div class="stat-label">迟到次数</div>
        </div>
        
        <div class="stat-card performance-card" :class="getPerformanceClass(personalStats.onTimeRate)">
          <div class="stat-value">{{ getPerformanceLevel(personalStats.onTimeRate) }}</div>
          <div class="stat-label">表现评级</div>
        </div>
      </div>
    </div>

    <!-- 小组出勤排行榜 -->
    <div class="group-ranking">
      <div class="ranking-header">
        <h4>小组出勤排行</h4>
        <div class="ranking-info">
          <span class="member-count">共 {{ attendanceList.length }} 名成员</span>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else-if="attendanceList.length === 0" class="empty-state">
        <div class="empty-icon">📊</div>
        <p class="empty-text">暂无考勤数据</p>
      </div>

      <div v-else class="ranking-list">
        <div
          v-for="(student, index) in attendanceList"
          :key="student.userId"
          class="ranking-item"
          :class="{ 
            'top-performer': index < 3,
            'current-user': student.userId === currentUserId
          }"
        >
          <!-- 排名标签 - 参考首页出勤榜样式 -->
          <div 
            :class="[
              'rank-index',
              { 
                'index-gold': index === 0, 
                'index-silver': index === 1, 
                'index-bronze': index === 2 
              }
            ]"
          >
            {{ index + 1 }}
          </div>
          
          <div class="student-avatar">
            <el-avatar 
              :size="40" 
              :src="userAvatars[student.userId] || defaultAvatarUrl"
            >
              {{ student.username?.charAt(0) }}
            </el-avatar>
          </div>
          
          <div class="student-info">
            <div class="student-name">
              {{ student.username }}
              <span v-if="student.userId === currentUserId" class="current-user-badge">我</span>
            </div>
            <div class="attendance-summary">
              {{ student.attendanceDays }}天 · {{ student.onTimeRate }}% 准时
            </div>
          </div>
          
          <div class="performance-indicator">
            <div class="attendance-score">
              {{ student.totalHours }}h
            </div>
            <div class="performance-level" :class="getPerformanceClass(student.onTimeRate)">
              {{ getPerformanceLevel(student.onTimeRate) }}
            </div>
          </div>
        </div>
      </div>
    </div>



    <!-- 考勤趋势图表 -->
    <div class="attendance-trend">
      <div class="trend-header">
        <h4>最近考勤趋势</h4>
        <div class="trend-summary">
          <span class="summary-item present-count">
            正常 {{ getTrendCount('present') }}
          </span>
          <span class="summary-item late-count">
            迟到 {{ getTrendCount('late') }}
          </span>
          <span class="summary-item absent-count">
            缺勤 {{ getTrendCount('absent') }}
          </span>
        </div>
      </div>
      
      <div class="trend-chart">
        <div class="trend-days">
          <div
            v-for="(day, index) in recentDays"
            :key="index"
            class="trend-day"
            :class="day.status"
            :title="`${day.date} - ${getStatusText(day.status)}`"
            @click="showDayDetail(day)"
          >
            <div class="day-number">{{ day.dayOfMonth }}</div>
            <div class="day-status" :class="day.status"></div>
          </div>
        </div>
        
        <div class="trend-legend">
          <div class="legend-item">
            <div class="legend-color present"></div>
            <span>正常出勤</span>
          </div>
          <div class="legend-item">
            <div class="legend-color late"></div>
            <span>迟到</span>
          </div>
          <div class="legend-item">
            <div class="legend-color absent"></div>
            <span>缺勤</span>
          </div>
          <div class="legend-item">
            <div class="legend-color weekend"></div>
            <span>周末</span>
          </div>
        </div>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import api from '../../api'

// Props
const props = defineProps({
  groupId: {
    type: [String, Number],
    required: true
  },
  currentUserId: {
    type: [String, Number],
    required: true
  }
})

// 获取主题状态
const store = useStore()
const isDarkMode = computed(() => store.getters.isDarkMode)

// 响应式数据
const isLoading = ref(true)
const attendanceList = ref([])
const userAvatars = ref({})
const defaultAvatarUrl = 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png'

// 个人统计数据
const personalStats = reactive({
  attendanceDays: 0,
  onTimeRate: 0,
  totalHours: 0,
  attendanceRate: 0,
  lateCount: 0,
  absentCount: 0,
  punctualityRate: 0
})

// 最近考勤趋势
const recentDays = ref([])

// Mock API请求函数
const mockApiRequest = (realApiCall, mockResponse) => {
  // 在实际环境中，这里会调用真实API
  // return realApiCall()
  
  // 开发环境使用Mock数据
  return Promise.resolve({ data: { code: 200, data: mockResponse() } })
}

// 计算当前用户排名
const currentUserRank = computed(() => {
  if (!props.currentUserId || !attendanceList.value.length) return null
  
  const index = attendanceList.value.findIndex(student => student.userId == props.currentUserId)
  return index >= 0 ? index + 1 : null
})

// 获取Mock考勤数据
const getMockAttendanceData = () => {
  // 生成模拟考勤数据
  const mockData = []
  const names = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '杨九', '黄十', '周十一', '吴十二']
  
  for (let i = 0; i < names.length; i++) {
    const attendanceDays = Math.floor(Math.random() * 10) + 20
    const onTimeRate = Math.floor(Math.random() * 30) + 70
    const totalHours = Math.floor(Math.random() * 100) + 150
    
    mockData.push({
      userId: i + 1,
      username: names[i],
      attendanceDays: attendanceDays,
      onTimeRate: onTimeRate,
      totalHours: totalHours
    })
  }
  
  // 确保当前用户在列表中
  const currentUserIndex = mockData.findIndex(student => student.userId == props.currentUserId)
  if (currentUserIndex === -1 && props.currentUserId) {
    mockData.push({
      userId: props.currentUserId,
      username: '我',
      attendanceDays: 25,
      onTimeRate: 85,
      totalHours: 200,
      attendanceRate: 85,
      lateCount: 3,
      absentCount: 2,
      punctualityRate: 88
    })
  } else if (currentUserIndex >= 0) {
    // 为现有用户添加详细统计
    mockData[currentUserIndex] = {
      ...mockData[currentUserIndex],
      attendanceRate: mockData[currentUserIndex].onTimeRate,
      lateCount: Math.floor(Math.random() * 5) + 1,
      absentCount: Math.floor(Math.random() * 3) + 1,
      punctualityRate: mockData[currentUserIndex].onTimeRate + Math.floor(Math.random() * 10) - 5
    }
  }
  
  // 按综合评分排序
  mockData.sort((a, b) => {
    const scoreA = a.attendanceDays * 0.6 + a.onTimeRate * 0.4
    const scoreB = b.attendanceDays * 0.6 + b.onTimeRate * 0.4
    return scoreB - scoreA
  })
  
  return {
    attendanceList: mockData,
    personalStats: mockData.find(s => s.userId == props.currentUserId) || mockData[0]
  }
}

// 生成最近考勤趋势数据
const generateRecentTrend = () => {
  const days = []
  const today = new Date()
  
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    
    const dayOfWeek = date.getDay()
    let status = 'weekend'
    
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 非周末
      const rand = Math.random()
      if (rand < 0.75) status = 'present'
      else if (rand < 0.9) status = 'late'
      else status = 'absent'
    }
    
    days.push({
      date: date.toISOString().split('T')[0],
      dayOfMonth: date.getDate(),
      status: status
    })
  }
  
  return days
}

// 获取考勤数据
const fetchAttendanceData = async () => {
  if (!props.groupId) return
  
  isLoading.value = true
  try {
    const response = await mockApiRequest(
      // 真实API调用
      () => api({
        url: `/attendance/group/${props.groupId}/student-view`,
        method: 'get'
      }),
      // Mock响应
      getMockAttendanceData
    )
    
    if (response.data.code === 200) {
      attendanceList.value = response.data.data.attendanceList
      
      // 设置个人统计数据
      const userStats = response.data.data.personalStats
      if (userStats) {
        Object.assign(personalStats, userStats)
      }
      
      // 生成最近考勤趋势
      recentDays.value = generateRecentTrend()
      
      // 获取用户头像
      attendanceList.value.forEach(student => {
        getUserAvatar(student.userId)
      })
    }
  } catch (error) {
    console.error('获取考勤数据失败:', error)
  } finally {
    isLoading.value = false
  }
}

// 获取用户头像
const getUserAvatar = async (userId) => {
  try {
    const res = await api({
      url: `/user/user_avatars_id`,
      method: 'get',
      params: { User_Id: userId }
    })

    if (res.data.code === 200 && res.data.User_Avatar) {
      userAvatars.value[userId] = 'data:image/jpeg;base64,' + res.data.User_Avatar
    } else {
      userAvatars.value[userId] = defaultAvatarUrl
    }
  } catch (err) {
    console.error('获取用户头像失败:', err)
    userAvatars.value[userId] = defaultAvatarUrl
  }
}

// 工具函数

// 获取排名样式类 - 参考首页出勤榜
const getRankClass = (index) => {
  if (index === 0) return 'rank-first'
  if (index === 1) return 'rank-second'  
  if (index === 2) return 'rank-third'
  return 'rank-normal'
}

// 获取排名图标
const getRankIcon = (index) => {
  const icons = ['🏆', '🥈', '🥉']
  return icons[index] || (index + 1)
}

// 获取表现等级
const getPerformanceLevel = (onTimeRate) => {
  if (onTimeRate >= 95) return '优秀'
  if (onTimeRate >= 85) return '良好'
  if (onTimeRate >= 75) return '一般'
  return '需改进'
}

// 获取表现样式类
const getPerformanceClass = (onTimeRate) => {
  if (onTimeRate >= 95) return 'excellent'
  if (onTimeRate >= 85) return 'good'
  if (onTimeRate >= 75) return 'average'
  return 'poor'
}

// 获取表现图标
const getPerformanceIcon = (onTimeRate) => {
  if (onTimeRate >= 95) return '🌟'
  if (onTimeRate >= 85) return '😊'
  if (onTimeRate >= 75) return '😐'
  return '😞'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    'present': '正常出勤',
    'late': '迟到',
    'absent': '缺勤',
    'weekend': '周末'
  }
  return statusMap[status] || '未知'
}

// 获取趋势统计
const getTrendCount = (status) => {
  return recentDays.value.filter(day => day.status === status).length
}

// 刷新数据
const refreshData = async () => {
  ElMessage.success('正在刷新考勤数据...')
  await fetchAttendanceData()
  ElMessage.success('考勤数据刷新完成！')
}

// 显示某天的详细信息
const showDayDetail = (day) => {
  if (day.status === 'weekend') return
  
  const statusText = getStatusText(day.status)
  const message = `${day.date} 的考勤状态：${statusText}`
  
  ElMessage.info(message)
}

// 生命周期
onMounted(() => {
  fetchAttendanceData()
})

watch(() => props.groupId, (newGroupId) => {
  if (newGroupId) {
    fetchAttendanceData()
  }
}, { immediate: false })
</script>

<style scoped>
.student-attendance-view {
  width: 100%;
  max-width: 100%;
  padding: 0;
  margin: 0;
  background: transparent;
}

.theme-dark .student-attendance-view {
  background: transparent;
  color: #fff;
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding: 0 0 24px 0;
}

.page-title {
  font-size: 32px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  background: linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.theme-dark .page-title {
  background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.time-range {
  font-size: 14px;
  color: #666;
  background: rgba(64, 158, 255, 0.08);
  padding: 6px 12px;
  border-radius: 12px;
  font-weight: 500;
}

.theme-dark .time-range {
  color: #9ca3af;
  background: #374151;
}

.range-text {
  font-weight: 500;
}

/* 个人考勤概览 */
.personal-overview {
  background: #fff;
  border-radius: 16px;
  padding: 28px 32px 24px 32px;
  margin-bottom: 32px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.04);
}

.theme-dark .personal-overview {
  background: #2d2d2d;
  box-shadow: 0 2px 20px rgba(0,0,0,0.3);
  border-color: #404040;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.overview-header h4 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #1a1a1a;
}

.theme-dark .overview-header h4 {
  color: #f9fafb;
}

.my-rank {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rank-text {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.theme-dark .rank-text {
  color: #9ca3af;
}

.rank-badge {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  background: rgba(64, 158, 255, 0.1);
  color: #409EFF;
  border: 2px solid rgba(64, 158, 255, 0.2);
}

.rank-badge.rank-first {
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: #8B4513;
  border: 2px solid #FFD700;
}

.rank-badge.rank-second {
  background: linear-gradient(135deg, #C0C0C0, #A9A9A9);
  color: #2F4F4F;
  border: 2px solid #C0C0C0;
}

.rank-badge.rank-third {
  background: linear-gradient(135deg, #CD7F32, #8B4513);
  color: #FFF;
  border: 2px solid #CD7F32;
}

.personal-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.stat-card {
  background: rgba(64, 158, 255, 0.04);
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
  border: 1px solid rgba(64, 158, 255, 0.08);
  transition: all 0.3s ease;
}

.theme-dark .stat-card {
  background: rgba(64, 158, 255, 0.1);
  border-color: rgba(64, 158, 255, 0.2);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
}

.stat-card.performance-card.excellent {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.2);
}

.stat-card.performance-card.good {
  background: rgba(59, 130, 246, 0.08);
  border-color: rgba(59, 130, 246, 0.2);
}

.stat-card.performance-card.average {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.2);
}

.stat-card.performance-card.poor {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.2);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
  font-family: 'SF Mono', Monaco, 'Roboto Mono', monospace;
}

.theme-dark .stat-value {
  color: #f9fafb;
}

.performance-card.excellent .stat-value {
  color: #16a34a;
}

.performance-card.good .stat-value {
  color: #2563eb;
}

.performance-card.average .stat-value {
  color: #d97706;
}

.performance-card.poor .stat-value {
  color: #dc2626;
}

.stat-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.theme-dark .stat-label {
  color: #9ca3af;
}

/* 小组出勤排行榜 */
.group-ranking {
  background: #fff;
  border-radius: 16px;
  padding: 28px 32px 24px 32px;
  margin-bottom: 32px;
  box-shadow: 0 2px 20px rgba(0,0,0,0.06);
  border: 1px solid rgba(0,0,0,0.04);
}

.theme-dark .group-ranking {
  background: #2d2d2d;
  box-shadow: 0 2px 20px rgba(0,0,0,0.3);
  border-color: #404040;
}

.ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.ranking-header h4 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.member-count {
  font-size: 13px;
  color: #999;
}

.theme-dark .member-count {
  color: #9ca3af;
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.theme-dark .ranking-item {
  border-color: #404040;
}

.ranking-item:last-child {
  border-bottom: none;
}

.ranking-item:hover {
  background: rgba(64, 158, 255, 0.02);
}

.ranking-item.current-user {
  background: rgba(64, 158, 255, 0.04);
  padding: 16px 12px;
  border-radius: 8px;
  border-bottom-color: transparent;
}

.theme-dark .ranking-item.current-user {
  background: rgba(64, 158, 255, 0.1);
}



/* 排名标签样式 - 简化版 */
.rank-index {
  font-size: 14px;
  font-weight: 600;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #f5f5f5;
  color: #666;
  margin-right: 16px;
}

.theme-dark .rank-index {
  background: #404040;
  color: #ccc;
}

.rank-index.index-gold {
  background: #FFD700;
  color: #8B4513;
}

.rank-index.index-silver {
  background: #C0C0C0;
  color: #2F4F4F;
}

.rank-index.index-bronze {
  background: #CD7F32;
  color: #FFF;
}

.student-avatar {
  margin-right: 16px;
}

.student-info {
  flex: 1;
}

.student-name {
  font-size: 15px;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-dark .student-name {
  color: #f9fafb;
}

.current-user-badge {
  background: #409EFF;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.attendance-summary {
  font-size: 13px;
  color: #666;
  font-weight: 400;
}

.theme-dark .attendance-summary {
  color: #9ca3af;
}

.performance-indicator {
  text-align: right;
}

.attendance-score {
  font-size: 16px;
  font-weight: 600;
  color: #2563eb;
  margin-bottom: 4px;
  font-family: 'SF Mono', Monaco, 'Roboto Mono', monospace;
}

.performance-level {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
}

.performance-level.excellent {
  background: #f0f9ff;
  color: #16a34a;
  border: 1px solid #16a34a20;
}

.performance-level.good {
  background: #f0f9ff;
  color: #2563eb;
  border: 1px solid #2563eb20;
}

.performance-level.average {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #d9770620;
}

.performance-level.poor {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #dc262620;
}

/* 考勤详细统计 */
.detailed-stats {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
  border: 1px solid #e5e7eb;
}

.theme-dark .detailed-stats {
  background: #374151;
  border-color: #4b5563;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stats-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.theme-dark .stats-header h4 {
  color: #f9fafb;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stats-card {
  display: flex;
  align-items: center;
  background: #f8fafc;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.3s ease;
}

.theme-dark .stats-card {
  background: #2d2d2d;
}

.stats-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.stats-icon {
  font-size: 24px;
  margin-right: 12px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 8px;
}

.stats-content {
  flex: 1;
}

.stats-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.theme-dark .stats-value {
  color: #f9fafb;
}

.stats-label {
  font-size: 14px;
  color: #6b7280;
}

.theme-dark .stats-label {
  color: #9ca3af;
}

/* 考勤趋势图表 */
.attendance-trend {
  background: #f8fafc;
  border-radius: 16px;
  padding: 24px;
}

.theme-dark .attendance-trend {
  background: #374151;
}

.trend-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.trend-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.theme-dark .trend-header h4 {
  color: #f9fafb;
}

.trend-summary {
  display: flex;
  gap: 16px;
  font-size: 14px;
}

.summary-item {
  padding: 4px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.present-count {
  background: #dcfce7;
  color: #16a34a;
}

.late-count {
  background: #fef3c7;
  color: #d97706;
}

.absent-count {
  background: #fecaca;
  color: #dc2626;
}

.trend-days {
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.trend-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.day-number {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

.theme-dark .day-number {
  color: #9ca3af;
}

.day-status {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.day-status.present {
  background: #10b981;
}

.day-status.late {
  background: #f59e0b;
}

.day-status.absent {
  background: #ef4444;
}

.day-status.weekend {
  background: #e5e7eb;
}

.theme-dark .day-status.weekend {
  background: #4b5563;
}

.trend-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #6b7280;
}

.theme-dark .legend-item {
  color: #9ca3af;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}

.legend-color.present {
  background: #10b981;
}

.legend-color.late {
  background: #f59e0b;
}

.legend-color.absent {
  background: #ef4444;
}

.legend-color.weekend {
  background: #e5e7eb;
}

.theme-dark .legend-color.weekend {
  background: #4b5563;
}

/* 加载和空状态 */
.loading-state,
.empty-state {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.theme-dark .loading-state,
.theme-dark .empty-state {
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .student-attendance-view {
    padding: 16px;
    margin: 16px 0;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .personal-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stats-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .trend-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .trend-summary {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .ranking-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
  }
  
  .trend-days {
    grid-template-columns: repeat(7, 1fr);
  }
  
  .trend-legend {
    gap: 16px;
  }
}
</style>