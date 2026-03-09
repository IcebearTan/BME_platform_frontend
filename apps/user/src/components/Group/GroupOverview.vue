<template>
  <div class="group-overview" :class="{ 'theme-dark': isDarkMode }">
    <!-- 小组基本信息 -->
    <div class="overview-section">
      <div class="section-header">
        <h3 class="section-title">基本信息</h3>
        <!-- 顶部右侧：申请加入按钮（仅小组广场进入时显示） -->
        <div class="header-actions" v-if="showJoinButton">
          <el-button
            :type="joinButtonType"
            :loading="joinLoading"
            :disabled="joinStatus === 'joined'"
            round
            class="join-btn"
            @click="handleJoinGroup"
          >
            {{ joinButtonText }}
          </el-button>
        </div>
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

    <!-- 进度排名 -->
    <div class="overview-section">
      <div class="section-header">
        <h3 class="section-title">进度排名</h3>
        <div class="ranking-info">
          <span class="member-count">共 {{ progressRanking.length }} 名成员</span>
        </div>
      </div>

      <div class="progress-ranking-list">
        <div 
          v-for="(student, index) in progressRanking" 
          :key="student.userId"
          class="ranking-item"
        >
          <div class="rank-position">
            <div 
              class="rank-index"
              :class="{
                'index-gold': index === 0,
                'index-silver': index === 1,
                'index-bronze': index === 2
              }"
            >
              {{ index + 1 }}
            </div>
          </div>

          <div class="student-avatar">
            <el-avatar :size="32" :src="student.avatar">
              {{ student.name?.charAt(0) || 'U' }}
            </el-avatar>
          </div>
          
          <div class="student-info">
            <div class="student-name">{{ student.name }}</div>
            <div class="progress-summary">
              已完成 {{ student.completedTasks }} / {{ student.totalTasks }} 项任务
            </div>
          </div>

          <div class="progress-indicator">
            <div class="progress-percentage">{{ student.progressPercentage }}%</div>
            <el-progress 
              :percentage="student.progressPercentage" 
              :stroke-width="6"
              :show-text="false"
              :color="getProgressColor(student.progressPercentage)"
            />
          </div>
        </div>
      </div>

      <!-- 无数据状态 -->
      <div v-if="progressRanking.length === 0" class="no-ranking">
        <div class="no-ranking-icon">�</div>
        <p class="no-ranking-text">暂无进度数据</p>
      </div>
    </div>


  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import api from '../../api';
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
    validator: (value) => ['my-courses', 'my-teachings', 'all-groups'].includes(value)
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

// 进度排名数据
const progressRanking = ref([
  {
    userId: 1,
    name: '陈小明',
    avatar: '/src/assets/ChenMinJie.jpg',
    completedTasks: 18,
    totalTasks: 20,
    progressPercentage: 90
  },
  {
    userId: 2,
    name: '李小华',
    avatar: '/src/assets/LuMengXuan.jpg',
    completedTasks: 17,
    totalTasks: 20,
    progressPercentage: 85
  },
  {
    userId: 3,
    name: '王小刚',
    avatar: '/src/assets/Jerry_Scintilla_avatar.jpg',
    completedTasks: 16,
    totalTasks: 20,
    progressPercentage: 80
  },
  {
    userId: 4,
    name: '赵小丽',
    avatar: '/src/assets/ジエ_avatar.png',
    completedTasks: 15,
    totalTasks: 20,
    progressPercentage: 75
  },
  {
    userId: 5,
    name: '刘小强',
    avatar: '/src/assets/ice_bear_avatar.jpg',
    completedTasks: 14,
    totalTasks: 20,
    progressPercentage: 70
  }
]);

// 计算属性
const isDarkMode = computed(() => store.getters.isDarkMode);
const isTeacher = computed(() => props.courseType === 'my-teachings');

// 加入小组相关状态
const joinStatus = ref('none'); // none, pending, joined
const joinLoading = ref(false);

// 是否显示加入按钮（仅从小组广场进入时显示）
const showJoinButton = computed(() => {
  return props.courseType === 'all-groups';
});

// 检查加入状态
const checkJoinStatus = async () => {
  if (!props.groupData || !props.groupData.courseId) return;

  joinLoading.value = true;
  try {
    // 检查是否已加入该课程的小组
    const checkRes = await api({
      url: `/course-groups/check?course_id=${props.groupData.courseId}`,
      method: 'get'
    });

    if (checkRes.data && checkRes.data.code === 200) {
      if (checkRes.data.enrolled) {
        joinStatus.value = 'joined';
        joinLoading.value = false;
        return;
      }
    }

    // 检查是否有待审核的申请
    const requestRes = await api({
      url: `/course-groups/my-join-requests?course_id=${props.groupData.courseId}&status=pending`,
      method: 'get'
    });

    if (requestRes.data && requestRes.data.code === 200) {
      const requests = requestRes.data.data || [];
      const hasPending = requests.some(req => req.group_id === props.groupData.id);
      if (hasPending) {
        joinStatus.value = 'pending';
      }
    }
  } catch (err) {
    console.error('检查加入状态失败:', err);
  } finally {
    joinLoading.value = false;
  }
};

// 监听 groupData 变化时检查加入状态
watch(() => props.groupData?.id, (newId) => {
  if (newId && showJoinButton.value) {
    checkJoinStatus();
  }
}, { immediate: true });

// 加入按钮文字
const joinButtonText = computed(() => {
  if (joinStatus.value === 'joined') return '已加入';
  if (joinStatus.value === 'pending') return '待审核';
  return '申请加入';
});

// 加入按钮类型
const joinButtonType = computed(() => {
  if (joinStatus.value === 'joined') return 'info';
  if (joinStatus.value === 'pending') return 'warning';
  return 'primary';
});

// 处理加入小组
const handleJoinGroup = async () => {
  if (joinStatus.value === 'joined' || joinStatus.value === 'pending') {
    return;
  }

  joinLoading.value = true;

  try {
    const res = await api({
      url: `/course-groups/${props.groupData.id}/join`,
      method: 'post',
      data: {
        apply_reason: '申请加入小组'
      }
    });

    if (res.data && (res.data.code === 200 || res.data.code === 201)) {
      joinStatus.value = 'pending';
      ElMessage.success('申请已提交，请等待审核');
    } else {
      ElMessage.error(res.data?.message || '申请加入失败');
    }
  } catch (err) {
    console.error('申请加入小组失败:', err);
    ElMessage.error('申请加入失败，请稍后重试');
  } finally {
    joinLoading.value = false;
  }
};

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

// 进度颜色计算方法
const getProgressColor = (percentage) => {
  if (percentage >= 90) return '#67c23a'; // 绿色
  if (percentage >= 80) return '#409eff'; // 蓝色
  if (percentage >= 70) return '#e6a23c'; // 橙色
  if (percentage >= 60) return '#f56c6c'; // 红色
  return '#909399'; // 灰色
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

.header-actions {
  display: flex;
  align-items: center;
}

/* 简约柔和的加入按钮样式 */
.join-btn {
  font-weight: 500;
  letter-spacing: 0.3px;
  transition: all 0.3s ease;
  border: none;
}

.join-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.join-btn.is-disabled {
  opacity: 0.6;
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

/* 进度排名列表 */
.progress-ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.rank-position {
  margin-right: 16px;
}

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
}

.theme-dark .student-name {
  color: #f9fafb;
}

.progress-summary {
  font-size: 13px;
  color: #666;
  font-weight: 400;
}

.theme-dark .progress-summary {
  color: #9ca3af;
}

.progress-indicator {
  text-align: right;
  min-width: 120px;
}

.progress-percentage {
  font-size: 16px;
  font-weight: 600;
  color: #2563eb;
  margin-bottom: 4px;
  font-family: 'SF Mono', Monaco, 'Roboto Mono', monospace;
}

.member-count {
  font-size: 13px;
  color: #999;
}

.theme-dark .member-count {
  color: #9ca3af;
}

.no-ranking {
  text-align: center;
  padding: 40px 20px;
}

.no-ranking-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.no-ranking-text {
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
  
  .ranking-item {
    padding: 12px 0;
  }
  
  .progress-indicator {
    min-width: 100px;
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