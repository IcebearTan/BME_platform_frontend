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

      <div class="ranking-list">
        <div
          v-for="(student, index) in progressRanking"
          :key="student.userId"
          class="ranking-item"
          :class="{ 'rank-top-three': index < 3 }"
        >
          <!-- 排名 -->
          <div class="rank-badge" :class="`rank-${index + 1}`">
            {{ index + 1 }}
          </div>

          <!-- 头像 -->
          <div class="ranking-avatar">
            <el-avatar :size="36" :src="student.avatar">
              {{ student.name?.charAt(0) || 'U' }}
            </el-avatar>
          </div>

          <!-- 信息 -->
          <div class="ranking-info-content">
            <div class="ranking-name">{{ student.name }}</div>
            <div class="ranking-tasks">
              已完成 {{ student.completedTasks }}/{{ student.totalTasks }} 项任务
            </div>
          </div>

          <!-- 进度条 -->
          <div class="ranking-progress">
            <div class="progress-text">{{ student.progressPercentage }}%</div>
            <div class="progress-bar-wrapper">
              <div
                class="progress-bar-fill"
                :style="{ width: student.progressPercentage + '%' }"
                :class="`progress-${getProgressLevel(student.progressPercentage)}`"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 无数据状态 -->
      <div v-if="progressRanking.length === 0" class="no-ranking">
        <el-icon class="no-ranking-icon"><Document /></el-icon>
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
// 进度等级
const getProgressLevel = (percentage) => {
  if (percentage >= 90) return 'excellent';
  if (percentage >= 70) return 'good';
  if (percentage >= 50) return 'normal';
  return 'low';
};

// 进度颜色（保留以兼容其他地方可能使用）
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

/* 章节样式 - 仿照sidebar风格 */
.overview-section {
  margin-bottom: 24px;
  padding: 20px;
  background-color: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 16px;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.theme-dark .overview-section {
  background-color: #1f1f1f;
  border-color: #2a2a2a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.theme-dark .section-header {
  border-bottom-color: #2a2a2a;
}

.header-actions {
  display: flex;
  align-items: center;
}

/* 简约柔和的加入按钮样式 */
.join-btn {
  font-weight: 500;
  letter-spacing: 0.3px;
  transition: all 0.25s ease;
  border: none;
}

.join-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.join-btn.is-disabled {
  opacity: 0.6;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  color: #323233;
}

.theme-dark .section-title {
  color: #e5e5e5;
}

.section-subtitle {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.theme-dark .section-subtitle {
  color: #707070;
}

/* 基本信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.info-card {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background-color: #fafafa;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  transition: all 0.25s ease;
}

.info-card:hover {
  background-color: #f5f7fa;
  transform: translateX(2px);
}

.theme-dark .info-card {
  background-color: #252525;
  border-color: #2a2a2a;
}

.theme-dark .info-card:hover {
  background-color: #2a2a2a;
}

.info-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ecf5ff;
  color: #409eff;
  border-radius: 10px;
  margin-right: 12px;
  font-size: 16px;
  flex-shrink: 0;
}

.theme-dark .info-icon {
  background-color: #2d3a4f;
  color: #409eff;
}

.info-content {
  flex: 1;
  min-width: 0;
}

.info-label {
  font-size: 12px;
  color: #909399;
  font-weight: 450;
  margin-bottom: 2px;
}

.theme-dark .info-label {
  color: #707070;
}

.info-value {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-dark .info-value {
  color: #c0c4cc;
}

/* 统计数据网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 16px;
  background-color: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 14px;
  position: relative;
  transition: all 0.25s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background-color: #f5f7fa;
}

.theme-dark .stat-card {
  background-color: #252525;
  border-color: #2a2a2a;
}

.theme-dark .stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background-color: #2a2a2a;
}

.stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.stat-icon.members {
  background-color: #ecf5ff;
  color: #409eff;
}

.stat-icon.tasks {
  background-color: #fef0f0;
  color: #f56c6c;
}

.stat-icon.activity {
  background-color: #f0f9eb;
  color: #67c23a;
}

.stat-icon.announcements {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.stat-icon.placeholder-icon {
  background-color: #f5f5f5;
  color: #909399;
}

.theme-dark .stat-icon.members {
  background-color: #2d3a4f;
}

.theme-dark .stat-icon.tasks {
  background-color: #3d2a2a;
}

.theme-dark .stat-icon.activity {
  background-color: #2a3d2a;
}

.theme-dark .stat-icon.announcements {
  background-color: #3d352a;
}

.theme-dark .stat-icon.placeholder-icon {
  background-color: #2a2a2a;
  color: #606266;
}

.stat-card.placeholder {
  opacity: 0.5;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 12px;
}

.stat-trend.positive {
  background: rgba(103, 194, 58, 0.1);
  color: #67c23a;
}

.stat-trend.negative {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
}

.stat-badge {
  background: #f56c6c;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.stat-content {
  text-align: left;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #323233;
  margin-bottom: 2px;
}

.theme-dark .stat-number {
  color: #e5e5e5;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  font-weight: 450;
}

.theme-dark .stat-label {
  color: #707070;
}

/* 进度排名列表 */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  background-color: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  transition: all 0.25s ease;
}

.ranking-item:hover {
  background-color: #f5f7fa;
  transform: translateX(2px);
}

.theme-dark .ranking-item {
  background-color: #252525;
  border-color: #2a2a2a;
}

.theme-dark .ranking-item:hover {
  background-color: #2a2a2a;
}

.ranking-item.rank-top-three {
  background-color: #f0f9eb;
  border-color: #e1f3d8;
}

.theme-dark .ranking-item.rank-top-three {
  background-color: #1d2d1d;
  border-color: #2a3d2a;
}

/* 排名徽章 */
.rank-badge {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-right: 12px;
  background-color: #f5f5f5;
  color: #909399;
}

.theme-dark .rank-badge {
  background-color: #2a2a2a;
  color: #707070;
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700 0%, #ffb900 100%);
  color: #8B4513;
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #c0c0c0 0%, #a8a8a8 100%);
  color: #2F4F4F;
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7f32 0%, #b87333 100%);
  color: #fff;
}

/* 头像 */
.ranking-avatar {
  margin-right: 12px;
}

.ranking-avatar :deep(.el-avatar) {
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.theme-dark .ranking-avatar :deep(.el-avatar) {
  border-color: #1f1f1f;
}

/* 信息 */
.ranking-info-content {
  flex: 1;
  min-width: 0;
}

.ranking-name {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 2px;
}

.theme-dark .ranking-name {
  color: #e5e5e5;
}

.ranking-tasks {
  font-size: 12px;
  color: #909399;
}

.theme-dark .ranking-tasks {
  color: #707070;
}

/* 进度 */
.ranking-progress {
  min-width: 100px;
  text-align: right;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 4px;
}

.progress-bar-wrapper {
  height: 6px;
  background-color: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}

.theme-dark .progress-bar-wrapper {
  background-color: #2a2a2a;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-excellent {
  background: linear-gradient(90deg, #67c23a 0%, #85ce61 100%);
}

.progress-good {
  background: linear-gradient(90deg, #409eff 0%, #66b1ff 100%);
}

.progress-normal {
  background: linear-gradient(90deg, #e6a23c 0%, #ebb563 100%);
}

.progress-low {
  background: linear-gradient(90deg, #f56c6c 0%, #f78989 100%);
}

.ranking-info {
  display: flex;
  align-items: center;
}

.member-count {
  font-size: 12px;
  color: #909399;
}

.theme-dark .member-count {
  color: #707070;
}

.no-ranking {
  text-align: center;
  padding: 32px 16px;
}

.no-ranking-icon {
  font-size: 40px;
  margin-bottom: 8px;
  color: #c0c4cc;
}

.no-ranking-text {
  font-size: 13px;
  color: #909399;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .overview-section {
    padding: 16px;
    margin-bottom: 16px;
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
    padding: 14px;
  }

  .ranking-item {
    padding: 10px 0;
  }

  .progress-indicator {
    min-width: 80px;
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
    margin-bottom: 6px;
  }
}
</style>