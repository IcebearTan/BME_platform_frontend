<template>
  <div class="group-activity-list" :class="{ 'theme-dark': isDarkMode }">
    <!-- 头部 -->
    <div class="activity-header">
      <div class="header-info">
        <h3 class="activity-title">最近活动</h3>
        <div class="activity-count">共 {{ filteredActivities.length }} 条活动</div>
      </div>
      
      <div class="header-actions">
        <el-button type="default" size="small" @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="activity-filters">
      <div class="filter-section">
        <!-- 活动类型筛选 -->
        <div class="filter-group">
          <span class="filter-group-label">活动类型：</span>
          <div class="filter-tabs">
            <div 
              v-for="typeFilter in typeFilters"
              :key="typeFilter.key"
              class="filter-tab"
              :class="{ 'active': activeTypeFilter === typeFilter.key }"
              @click="activeTypeFilter = typeFilter.key"
            >
              <span class="filter-label">{{ typeFilter.label }}</span>
              <span class="filter-count">({{ getTypeFilterCount(typeFilter.key) }})</span>
            </div>
          </div>
        </div>
        
        <!-- 时间筛选 -->
        <div class="filter-group">
          <span class="filter-group-label">时间范围：</span>
          <div class="filter-tabs">
            <div 
              v-for="timeFilter in timeFilters"
              :key="timeFilter.key"
              class="filter-tab"
              :class="{ 'active': activeTimeFilter === timeFilter.key }"
              @click="activeTimeFilter = timeFilter.key"
            >
              <span class="filter-label">{{ timeFilter.label }}</span>
              <span class="filter-count">({{ getTimeFilterCount(timeFilter.key) }})</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 活动列表 -->
    <div class="activities-container" v-if="filteredActivities.length > 0">
      <div 
        v-for="(group, groupKey) in groupedActivities"
        :key="groupKey"
        class="date-group"
      >
        <!-- 日期分组标题 -->
        <div class="date-group-header">
          <h4 class="date-group-title">{{ group.label }}</h4>
          <div class="date-group-count">{{ group.activities.length }} 条活动</div>
        </div>
        
        <!-- 该日期组的活动 -->
        <div class="activity-list">
          <div 
            v-for="activity in group.activities" 
            :key="activity.id"
            class="activity-item"
            :class="{ 'highlighted': activity.isImportant }"
          >
            <div class="activity-avatar">
              <img v-if="activity.userAvatar" :src="activity.userAvatar" :alt="activity.userName" />
              <div v-else class="avatar-placeholder">
                {{ activity.userName?.charAt(0) || 'U' }}
              </div>
            </div>
            
            <div class="activity-content">
              <div class="activity-main">
                <div class="activity-text">
                  <span class="activity-user">{{ activity.userName }}</span>
                  <span class="activity-action">{{ activity.action }}</span>
                  <span class="activity-target" v-if="activity.target">{{ activity.target }}</span>
                </div>
                <div class="activity-description" v-if="activity.description">
                  {{ activity.description }}
                </div>
              </div>
              <div class="activity-meta">
                <div class="activity-time">{{ formatRelativeTime(activity.timestamp) }}</div>
                <div class="activity-details" v-if="activity.details">
                  <span class="detail-item" v-for="detail in activity.details" :key="detail">
                    {{ detail }}
                  </span>
                </div>
              </div>
            </div>

            <div class="activity-type-badge" :class="`type-${activity.type}`">
              <el-icon v-if="activity.type === 'task'"><Select /></el-icon>
              <el-icon v-else-if="activity.type === 'announcement'"><Bell /></el-icon>
              <el-icon v-else-if="activity.type === 'member'"><Avatar /></el-icon>
              <el-icon v-else-if="activity.type === 'submission'"><Upload /></el-icon>
              <el-icon v-else-if="activity.type === 'comment'"><ChatDotSquare /></el-icon>
              <el-icon v-else><Document /></el-icon>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!loading" class="empty-state">
      <div class="empty-icon">📊</div>
      <p class="empty-message">{{ getEmptyMessage() }}</p>
    </div>

    <!-- 加载状态 -->
    <div v-else class="loading-state">
      <div class="loading-spinner"></div>
      <p class="loading-text">加载活动记录中...</p>
    </div>

    <!-- 加载更多 -->
    <div v-if="filteredActivities.length > 0 && hasMore" class="load-more">
      <el-button type="text" @click="handleLoadMore" :loading="loadingMore">
        <el-icon><ArrowDown /></el-icon>
        加载更多活动
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { 
  Refresh,
  Select,
  Bell,
  Avatar,
  Upload,
  ChatDotSquare,
  Document,
  ArrowDown
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
  'activity-click',
  'refresh'
]);

// Vuex store
const store = useStore();

// 响应式数据
const activities = ref([]);
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(true);
const activeTypeFilter = ref('all');
const activeTimeFilter = ref('all');

// 筛选选项
const typeFilters = [
  { key: 'all', label: '全部类型' },
  { key: 'task', label: '任务相关' },
  { key: 'announcement', label: '公告通知' },
  { key: 'member', label: '成员动态' },
  { key: 'submission', label: '提交记录' },
  { key: 'comment', label: '评论互动' }
];

const timeFilters = [
  { key: 'all', label: '全部时间' },
  { key: 'today', label: '今天' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' }
];

// 模拟活动数据
const mockActivities = [
  {
    id: 1,
    userName: '张三',
    action: '提交了',
    target: '第三章作业',
    description: '按时完成了生物医学工程导论第三章的课后作业，包含理论分析和实验报告两部分。',
    type: 'submission',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30分钟前
    userAvatar: null,
    isImportant: false,
    details: ['PDF文档', '2.3MB']
  },
  {
    id: 2,
    userName: '李四',
    action: '发布了公告',
    target: '下周实验安排',
    description: '关于下周三的生物医学信号处理实验安排，请同学们提前准备实验器材。',
    type: 'announcement',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2小时前
    userAvatar: null,
    isImportant: true,
    details: ['重要通知']
  },
  {
    id: 3,
    userName: '王五',
    action: '加入了小组',
    target: '',
    description: '欢迎新成员王五加入我们的学习小组！',
    type: 'member',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1天前
    userAvatar: null,
    isImportant: false,
    details: ['新成员']
  },
  {
    id: 4,
    userName: '赵六',
    action: '评论了',
    target: '第二章讨论',
    description: '对生物医学材料的分类和应用提出了很好的见解，值得大家学习。',
    type: 'comment',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2天前
    userAvatar: null,
    isImportant: false,
    details: ['讨论回复']
  },
  {
    id: 5,
    userName: '钱七',
    action: '完成了任务',
    target: '文献调研',
    description: '完成了关于生物医学工程前沿技术的文献调研，整理了15篇相关论文。',
    type: 'task',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3天前
    userAvatar: null,
    isImportant: false,
    details: ['15篇文献', '已审核']
  },
  {
    id: 6,
    userName: '孙八',
    action: '上传了文件',
    target: '实验数据',
    description: '上传了上周实验的原始数据和处理结果，供小组成员参考学习。',
    type: 'submission',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4天前
    userAvatar: null,
    isImportant: false,
    details: ['Excel文件', '1.8MB']
  },
  {
    id: 7,
    userName: '周九',
    action: '创建了任务',
    target: '期中考试复习计划',
    description: '为小组制定了详细的期中考试复习计划，包含知识点梳理和时间安排。',
    type: 'task',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5天前
    userAvatar: null,
    isImportant: true,
    details: ['复习计划', '截止时间: 10月15日']
  },
  {
    id: 8,
    userName: '吴十',
    action: '参与了讨论',
    target: '生物医学信号处理',
    description: '在课程讨论中积极发言，分享了信号处理的实际应用案例。',
    type: 'comment',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6), // 6天前
    userAvatar: null,
    isImportant: false,
    details: ['课程讨论']
  }
];

// 计算属性
const isDarkMode = computed(() => store.getters.isDarkMode);
const isTeacher = computed(() => props.courseType === 'my-teachings');

const filteredActivities = computed(() => {
  let filtered = activities.value;

  // 类型过滤
  if (activeTypeFilter.value !== 'all') {
    filtered = filtered.filter(activity => activity.type === activeTypeFilter.value);
  }

  // 时间过滤
  if (activeTimeFilter.value !== 'all') {
    filtered = filtered.filter(activity => {
      const activityDate = new Date(activity.timestamp);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      switch (activeTimeFilter.value) {
        case 'today':
          return activityDate >= today;
        case 'week':
          return activityDate >= weekStart;
        case 'month':
          return activityDate >= monthStart;
        default:
          return true;
      }
    });
  }

  // 按时间排序
  return filtered.sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
});

// 按日期分组的活动
const groupedActivities = computed(() => {
  const groups = {};
  
  filteredActivities.value.forEach(activity => {
    const dateKey = getDateGroup(activity.timestamp);
    if (!groups[dateKey]) {
      groups[dateKey] = {
        label: getDateGroupLabel(activity.timestamp),
        activities: []
      };
    }
    groups[dateKey].activities.push(activity);
  });
  
  return groups;
});

// 方法
const loadActivities = async () => {
  loading.value = true;
  
  // 模拟API调用
  setTimeout(() => {
    activities.value = mockActivities;
    loading.value = false;
  }, 800);
};

const getTypeFilterCount = (typeKey) => {
  if (typeKey === 'all') return activities.value.length;
  return activities.value.filter(activity => activity.type === typeKey).length;
};

const getTimeFilterCount = (timeKey) => {
  if (timeKey === 'all') return activities.value.length;
  
  return activities.value.filter(activity => {
    const activityDate = new Date(activity.timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    switch (timeKey) {
      case 'today':
        return activityDate >= today;
      case 'week':
        return activityDate >= weekStart;
      case 'month':
        return activityDate >= monthStart;
      default:
        return true;
    }
  }).length;
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
    return timestamp.toLocaleDateString('zh-CN');
  }
};

const getDateGroup = (date) => {
  const activityDate = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  if (activityDate >= today) {
    return 'today';
  } else if (activityDate >= yesterday) {
    return 'yesterday';
  } else {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    if (activityDate >= weekStart) {
      return 'thisWeek';
    }
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (activityDate >= monthStart) {
      return 'thisMonth';
    }
    
    return `${activityDate.getFullYear()}-${activityDate.getMonth() + 1}`;
  }
};

const getDateGroupLabel = (date) => {
  const activityDate = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  if (activityDate >= today) {
    return '今天';
  } else if (activityDate >= yesterday) {
    return '昨天';
  } else {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    if (activityDate >= weekStart) {
      return '本周早些时候';
    }
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (activityDate >= monthStart) {
      return '本月早些时候';
    }
    
    const year = activityDate.getFullYear();
    const month = activityDate.getMonth() + 1;
    if (year === now.getFullYear()) {
      return `${month}月`;
    } else {
      return `${year}年${month}月`;
    }
  }
};

const getEmptyMessage = () => {
  if (activeTypeFilter.value !== 'all' || activeTimeFilter.value !== 'all') {
    return '该条件下暂无活动记录';
  }
  return '暂无活动记录';
};

// 事件处理
const handleRefresh = () => {
  loadActivities();
  emit('refresh');
};

const handleLoadMore = () => {
  loadingMore.value = true;
  
  // 模拟加载更多数据
  setTimeout(() => {
    // 这里可以加载更多数据
    loadingMore.value = false;
    hasMore.value = false; // 假设没有更多数据
  }, 1000);
};

const handleActivityClick = (activity) => {
  emit('activity-click', activity);
};

onMounted(() => {
  loadActivities();
});
</script>

<style scoped>
.group-activity-list {
  width: 100%;
  padding: 0;
}

/* 头部样式 */
.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .activity-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.header-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.activity-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #1a1a1a;
}

.theme-dark .activity-title {
  color: #ffffff;
}

.activity-count {
  font-size: 14px;
  color: #6b7280;
  background-color: rgba(107, 114, 128, 0.1);
  padding: 4px 12px;
  border-radius: 12px;
}

.theme-dark .activity-count {
  color: #9ca3af;
  background-color: rgba(156, 163, 175, 0.1);
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 筛选区域样式 */
.activity-filters {
  margin-bottom: 24px;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  min-width: 80px;
}

.theme-dark .filter-group-label {
  color: #9ca3af;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: rgba(0, 0, 0, 0.04);
  color: #6b7280;
  font-size: 14px;
}

.filter-tab:hover {
  background-color: rgba(102, 126, 234, 0.08);
  color: #667eea;
}

.filter-tab.active {
  background-color: #667eea;
  color: white;
}

.theme-dark .filter-tab {
  background-color: rgba(255, 255, 255, 0.05);
  color: #9ca3af;
}

.theme-dark .filter-tab:hover {
  background-color: rgba(102, 126, 234, 0.15);
  color: #8fa4f3;
}

.filter-count {
  font-size: 12px;
  opacity: 0.8;
}

/* 活动列表样式 */
.activities-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.date-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.date-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .date-group-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.date-group-title {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  color: #6b7280;
}

.theme-dark .date-group-title {
  color: #9ca3af;
}

.date-group-count {
  font-size: 12px;
  color: #9ca3af;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  transition: all 0.3s ease;
  position: relative;
}

.activity-item:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.activity-item.highlighted {
  border-left: 4px solid #667eea;
  background: rgba(102, 126, 234, 0.02);
}

.theme-dark .activity-item {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .activity-item:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.theme-dark .activity-item.highlighted {
  background: rgba(102, 126, 234, 0.1);
}

.activity-avatar {
  width: 40px;
  height: 40px;
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
  font-size: 16px;
  font-weight: 600;
}

.activity-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activity-text {
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
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

.activity-description {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.4;
}

.theme-dark .activity-description {
  color: #9ca3af;
}

.activity-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.activity-time {
  font-size: 12px;
  color: #9ca3af;
}

.activity-details {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-item {
  font-size: 11px;
  color: #6b7280;
  background: rgba(0, 0, 0, 0.04);
  padding: 2px 6px;
  border-radius: 8px;
}

.theme-dark .detail-item {
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.05);
}

.activity-type-badge {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: white;
  flex-shrink: 0;
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

.type-submission {
  background: #4facfe;
}

.type-comment {
  background: #feca57;
}

/* 空状态和加载状态 */
.empty-state,
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-message {
  font-size: 16px;
  color: #8a8a8a;
  margin: 0;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(102, 126, 234, 0.2);
  border-left-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  color: #8a8a8a;
  margin: 0;
}

/* 加载更多 */
.load-more {
  text-align: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .load-more {
  border-top-color: rgba(255, 255, 255, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .activity-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .filter-group {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .filter-group-label {
    min-width: auto;
  }
  
  .activity-item {
    padding: 12px;
  }
  
  .activity-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .activity-item {
    flex-direction: column;
    gap: 12px;
  }
  
  .activity-avatar {
    margin-right: 0;
    align-self: flex-start;
  }
  
  .activity-type-badge {
    align-self: flex-end;
    margin-top: -40px;
  }
}
</style>