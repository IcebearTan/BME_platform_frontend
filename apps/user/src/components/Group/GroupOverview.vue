<template>
  <div class="group-overview" :class="{ 'theme-dark': isDarkMode }">
    <!-- 小组基本信息 -->
    <div class="overview-section">
      <div class="section-header">
        <h3 class="section-title">基本信息</h3>
      </div>
      
      <div class="info-grid">
        <div class="info-card">
          <div class="info-icon">
            <el-icon><Reading /></el-icon>
          </div>
          <div class="info-content">
            <div class="info-label">绑定课程</div>
            <div class="info-value">{{ groupData?.courseName || '生物医学工程导论' }}</div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="info-content">
            <div class="info-label">导师</div>
            <div class="info-value">{{ groupData?.tutorName || '张教授' }}</div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-icon">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="info-content">
            <div class="info-label">学期</div>
            <div class="info-value">{{ groupData?.semester || '2024-2025学年 第一学期' }}</div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="info-content">
            <div class="info-label">创建时间</div>
            <div class="info-value">{{ formatDate(groupData?.createDate) || '2024年9月15日' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 统计数据 -->
    <div class="overview-section">
      <div class="section-header">
        <h3 class="section-title">数据统计</h3>
        <div class="section-subtitle">实时更新的小组关键指标</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon members">
              <el-icon><Avatar /></el-icon>
            </div>
            <div class="stat-trend positive" v-if="isTeacher">
              <el-icon><ArrowUp /></el-icon>
              <span>+{{ statsData.memberGrowth || 3 }}</span>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ statsData.totalMembers || 25 }}</div>
            <div class="stat-label">成员总数</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon tasks">
              <el-icon><Select /></el-icon>
            </div>
            <div class="stat-trend positive" v-if="isTeacher">
              <el-icon><ArrowUp /></el-icon>
              <span>{{ Math.round((statsData.completedTasks / statsData.totalTasks) * 100) || 85 }}%</span>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ statsData.completedTasks || 17 }}/{{ statsData.totalTasks || 20 }}</div>
            <div class="stat-label">任务完成</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-icon announcements">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="stat-badge">{{ statsData.unreadCount || 3 }}</div>
          </div>
          <div class="stat-content">
            <div class="stat-number">{{ statsData.totalAnnouncements || 8 }}</div>
            <div class="stat-label">公告消息</div>
          </div>
        </div>

        
        <!-- 预留位置，用于未来功能扩展 -->
        <div class="stat-card placeholder">
          <div class="stat-header">
            <div class="stat-icon placeholder-icon">
              <el-icon><Upload /></el-icon>
            </div>
          </div>
          <div class="stat-content">
            <div class="stat-number">--</div>
            <div class="stat-label">待扩展功能</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近活动 -->
    <div class="overview-section">
      <div class="section-header">
        <h3 class="section-title">最近活动</h3>
        <el-button type="text" class="view-more-btn" @click="handleViewAllActivities">
          查看全部
          <el-icon><ArrowRight /></el-icon>
        </el-button>
      </div>

      <div class="activity-list">
        <div 
          v-for="activity in recentActivities" 
          :key="activity.id"
          class="activity-item"
        >
          <div class="activity-avatar">
            <img v-if="activity.userAvatar" :src="activity.userAvatar" :alt="activity.userName" />
            <div v-else class="avatar-placeholder">
              {{ activity.userName?.charAt(0) || 'U' }}
            </div>
          </div>
          
          <div class="activity-content">
            <div class="activity-text">
              <span class="activity-user">{{ activity.userName }}</span>
              <span class="activity-action">{{ activity.action }}</span>
              <span class="activity-target">{{ activity.target }}</span>
            </div>
            <div class="activity-time">{{ formatRelativeTime(activity.timestamp) }}</div>
          </div>

          <div class="activity-type-icon" :class="`type-${activity.type}`">
            <el-icon v-if="activity.type === 'task'"><Select /></el-icon>
            <el-icon v-else-if="activity.type === 'announcement'"><Bell /></el-icon>
            <el-icon v-else-if="activity.type === 'member'"><Avatar /></el-icon>
            <el-icon v-else><Document /></el-icon>
          </div>
        </div>
      </div>

      <!-- 无活动状态 -->
      <div v-if="recentActivities.length === 0" class="no-activity">
        <div class="no-activity-icon">📊</div>
        <p class="no-activity-text">暂无最近活动</p>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { 
  Reading, 
  User, 
  Calendar, 
  Clock,
  Avatar,
  Select,
  DataAnalysis,
  Bell,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Document,
  DocumentAdd,
  UserFilled,
  Upload
} from '@element-plus/icons-vue';

// Props
const props = defineProps({
  groupData: {
    type: Object,
    required: true
  },
  courseType: {
    type: String,
    required: true,
    validator: (value) => ['my-courses', 'my-teachings'].includes(value)
  }
});

// Emits
const emit = defineEmits([
  'view-activities'
]);

// Vuex store
const store = useStore();

// 响应式数据
const statsData = ref({
  totalMembers: 25,
  memberGrowth: 3,
  totalTasks: 20,
  completedTasks: 17,
  totalAnnouncements: 8,
  unreadCount: 3
});

const recentActivities = ref([
  {
    id: 1,
    userName: '张三',
    action: '提交了',
    target: '第三章作业',
    type: 'task',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30分钟前
    userAvatar: null
  },
  {
    id: 2,
    userName: '李四',
    action: '发布了公告',
    target: '下周实验安排',
    type: 'announcement',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2小时前
    userAvatar: null
  },
  {
    id: 3,
    userName: '王五',
    action: '加入了小组',
    target: '',
    type: 'member',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1天前
    userAvatar: null
  },

]);

// 计算属性
const isDarkMode = computed(() => store.getters.isDarkMode);
const isTeacher = computed(() => props.courseType === 'my-teachings');

// 方法
const formatDate = (date) => {
  if (!date) return '';
  
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const diffTime = Math.abs(now - timestamp);
  const diffMinutes = Math.ceil(diffTime / (1000 * 60));
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return formatDate(timestamp);
  }
};

// 事件处理
const handleViewAllActivities = () => {
  console.log('View all activities');
  emit('view-activities');
};

onMounted(() => {
  // 可以在这里加载实际数据
});
</script>

<style scoped>
.group-overview {
  width: 100%;
  padding: 0;
}

/* 章节样式 */
.overview-section {
  margin-bottom: 32px;
  padding: 24px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.theme-dark .overview-section {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .section-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #1a1a1a;
}

.theme-dark .section-title {
  color: #ffffff;
}

.section-subtitle {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

.theme-dark .section-subtitle {
  color: #9ca3af;
}

.view-more-btn {
  color: #667eea;
  font-size: 14px;
  padding: 0;
}

.view-more-btn:hover {
  color: #5a67d8;
}

/* 基本信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(102, 126, 234, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.theme-dark .info-card {
  background: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.2);
}

.info-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #667eea;
  color: white;
  border-radius: 10px;
  margin-right: 12px;
  font-size: 18px;
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.theme-dark .info-label {
  color: #9ca3af;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

.theme-dark .info-value {
  color: #ffffff;
}

/* 统计数据网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  padding: 20px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 16px;
  position: relative;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.theme-dark .stat-card {
  background: linear-gradient(135deg, rgba(60, 60, 60, 0.8) 0%, rgba(40, 40, 40, 0.9) 100%);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .stat-card:hover {
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.stat-icon.members {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.tasks {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.activity {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.announcements {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon.placeholder-icon {
  background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
}

.theme-dark .stat-icon.placeholder-icon {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}

.stat-card.placeholder {
  opacity: 0.6;
}

.stat-card.placeholder .stat-number {
  color: #9ca3af;
}

.theme-dark .stat-card.placeholder .stat-number {
  color: #6b7280;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 16px;
}

.stat-trend.positive {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.stat-trend.negative {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.stat-badge {
  background: #ff6b6b;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.stat-content {
  text-align: left;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.theme-dark .stat-number {
  color: #ffffff;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.theme-dark .stat-label {
  color: #9ca3af;
}

/* 活动列表 */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.activity-item:hover {
  background: rgba(102, 126, 234, 0.05);
}

.theme-dark .activity-item {
  background: rgba(255, 255, 255, 0.03);
}

.theme-dark .activity-item:hover {
  background: rgba(102, 126, 234, 0.1);
}

.activity-avatar {
  width: 36px;
  height: 36px;
  margin-right: 12px;
  flex-shrink: 0;
}

.activity-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.activity-content {
  flex: 1;
}

.activity-text {
  font-size: 14px;
  color: #374151;
  margin-bottom: 4px;
}

.theme-dark .activity-text {
  color: #e5e7eb;
}

.activity-user {
  font-weight: 600;
  color: #667eea;
}

.activity-action {
  margin: 0 4px;
}

.activity-target {
  font-weight: 500;
}

.activity-time {
  font-size: 12px;
  color: #9ca3af;
}

.activity-type-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
}

.type-task {
  background: #f093fb;
}

.type-announcement {
  background: #43e97b;
}

.type-member {
  background: #667eea;
}

.no-activity {
  text-align: center;
  padding: 40px 20px;
}

.no-activity-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.no-activity-text {
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
}

/* 响应式设计 */
/* 响应式设计 */
@media (max-width: 768px) {
  .overview-section {
    padding: 16px;
    margin-bottom: 24px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .info-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 16px;
  }
  
  .activity-item {
    padding: 12px;
  }
}

@media (max-width: 480px) {
  .info-card {
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }
  
  .info-icon {
    margin-right: 0;
    margin-bottom: 8px;
  }
}
</style>