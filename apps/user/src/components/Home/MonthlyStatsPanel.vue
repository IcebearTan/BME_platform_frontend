<template>
  <div class="monthly-stats-panel" :class="{ 'theme-dark': isDarkMode }">
    <!-- <div class="panel-header">
      <h4 class="panel-title">本月学习统计</h4>
    </div> -->
    
    <div class="stats-grid">
      <!-- 累计天数 -->
      <div class="stat-card days-card" :class="{ 'theme-dark': isDarkMode }">
        <div class="stat-content">
          <div class="stat-value days-value">{{ monthlyStats.totalDays || 0 }}</div>
          <div class="stat-bottom">
            <div class="stat-icon days-icon">
              <span>📅</span>
            </div>
            <div class="stat-label">累计天数</div>
          </div>
        </div>
      </div>

      <!-- 本月时长 -->
      <div class="stat-card duration-card" :class="{ 'theme-dark': isDarkMode }">
        <div class="stat-content">
          <div class="stat-value duration-value">{{ formatDuration(monthlyStats.totalHours) }}</div>
          <div class="stat-bottom">
            <div class="stat-icon duration-icon">
              <span>⏱️</span>
            </div>
            <div class="stat-label">本月时长</div>
          </div>
        </div>
      </div>

      <!-- 本月排名 -->
      <div class="stat-card rank-card" :class="{ 'theme-dark': isDarkMode }">
        <div class="stat-content">
          <div class="stat-value rank-value">{{ formatRank(monthlyStats.rank) }}</div>
          <div class="stat-bottom">
            <div class="stat-icon rank-icon">
              <span>🏆</span>
            </div>
            <div class="stat-label">本月排名</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Props
const props = defineProps({
  // 月度统计数据
  monthlyStats: {
    type: Object,
    default: () => ({
      totalDays: 0,
      totalHours: 0,
      rank: null
    })
  },
  // 主题模式
  isDarkMode: {
    type: Boolean,
    default: false
  }
})

// 格式化时长显示
const formatDuration = (hours) => {
  if (!hours || hours === 0) return '0h'
  
  if (typeof hours === 'number') {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return h > 0 ? (m > 0 ? `${h}h${m}m` : `${h}h`) : `${m}m`
  }
  
  return hours // 如果已经是字符串格式，直接返回
}

// 格式化排名显示
const formatRank = (rank) => {
  if (!rank) return '--'
  
  if (typeof rank === 'number') {
    if (rank === 1) return '1st'
    if (rank === 2) return '2nd' 
    if (rank === 3) return '3rd'
    return `${rank}th`
  }
  
  return rank
}
</script>

<style scoped>
.monthly-stats-panel {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  padding: 24px 24px 24px 24px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(135, 206, 250, 0.15);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 0px;
}

.monthly-stats-panel.theme-dark {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(255, 255, 255, 0.05);
}

.panel-header {
  text-align: center;
  margin-bottom: 20px;
}

.panel-title {
  font-size: 18px;
  font-weight: 600;
  color: #2d3748;
  margin: 0;
  letter-spacing: 0.5px;
  transition: color 0.3s ease;
}

.theme-dark .panel-title {
  color: #ffffff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  padding: 10px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.stat-card.theme-dark {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(135, 206, 250, 0.2);
}

.theme-dark .stat-card:hover {
  box-shadow: 0 12px 40px rgba(255, 255, 255, 0.1);
}

/* 不同卡片的特色样式 */
.days-card:hover {
  border-color: rgba(52, 152, 219, 0.4);
  background: rgba(52, 152, 219, 0.08);
}

.duration-card:hover {
  border-color: rgba(46, 204, 113, 0.4);
  background: rgba(46, 204, 113, 0.08);
}

.rank-card:hover {
  border-color: rgba(241, 196, 15, 0.4);
  background: rgba(241, 196, 15, 0.08);
}

.stat-content {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.stat-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: auto;
}

.stat-icon {
  font-size: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.days-icon {
  background: linear-gradient(135deg, #3498db, #2980b9);
}

.duration-icon {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
}

.rank-icon {
  background: linear-gradient(135deg, #f1c40f, #f39c12);
}

.stat-icon span {
  filter: brightness(1.2);
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
  letter-spacing: -0.5px;
  transition: all 0.3s ease;
  text-align: center;
}

/* 不同类型数值的颜色 */
.days-value {
  color: #3498db;
}

.duration-value {
  color: #2ecc71;
}

.rank-value {
  color: #f39c12;
}

.theme-dark .days-value {
  color: #5dade2;
}

.theme-dark .duration-value {
  color: #58d68d;
}

.theme-dark .rank-value {
  color: #f7c52d;
}

.stat-label {
  font-size: 12px;
  color: #718096;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: color 0.3s ease;
}

.theme-dark .stat-label {
  color: rgba(255, 255, 255, 0.7);
}

/* 悬停时的数值动画 */
.stat-card:hover .stat-value {
  transform: scale(1.1);
}

.stat-card:hover .stat-label {
  color: #4a5568;
  transform: translateY(-2px);
}

.theme-dark .stat-card:hover .stat-label {
  color: rgba(255, 255, 255, 0.9);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .monthly-stats-panel {
    padding: 20px;
    border-radius: 16px;
    margin-top: 12px;
  }

  .stats-grid {
    gap: 12px;
  }

  .stat-card {
    padding: 16px 12px;
    border-radius: 12px;
  }

  .stat-icon {
    width: 24px;
    height: 24px;
    font-size: 14px;
  }

  .stat-value {
    font-size: 28px;
  }

  .stat-label {
    font-size: 11px;
  }

  .panel-title {
    font-size: 16px;
    margin-bottom: 16px;
  }
}

@media (max-width: 480px) {
  .monthly-stats-panel {
    padding: 16px;
    border-radius: 14px;
  }

  .stats-grid {
    gap: 10px;
  }

  .stat-card {
    padding: 14px 10px;
    border-radius: 10px;
  }

  .stat-icon {
    width: 22px;
    height: 22px;
    font-size: 12px;
  }

  .stat-value {
    font-size: 24px;
  }

  .stat-label {
    font-size: 10px;
  }

  .panel-title {
    font-size: 15px;
    margin-bottom: 14px;
  }
}

/* 加载动画 */
@keyframes fadeInUp {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.stat-card {
  animation: fadeInUp 0.6s ease-out;
}

.stat-card:nth-child(1) {
  animation-delay: 0.1s;
}

.stat-card:nth-child(2) {
  animation-delay: 0.2s;
}

.stat-card:nth-child(3) {
  animation-delay: 0.3s;
}
</style>