<template>
  <div class="group-sidebar" :class="{ 'theme-dark': isDarkMode }">
    <div class="sidebar-header">
      <h2 class="sidebar-title">{{ sidebarTitle }}</h2>
    </div>
    
    <!-- 列表模式：显示课程分类标签 -->
    <div v-if="mode === 'list'" class="sidebar-menu">
      <div 
        v-for="item in listModeItems" 
        :key="item.id"
        class="sidebar-item"
        :class="{ 'active': activeTab === item.id }"
        @click="handleTabChange(item.id)"
      >
        <span class="sidebar-icon">{{ item.icon }}</span>
        <span class="sidebar-label">{{ item.label }}</span>
      </div>
    </div>

    <!-- 详情模式：显示小组信息和导航 -->
    <div v-else-if="mode === 'detail'" class="sidebar-content">
      <!-- 返回按钮 -->
      <div class="back-button" @click="handleBackToList">
        <el-icon class="back-icon">
          <ArrowLeft />
        </el-icon>
        <span>返回列表</span>
      </div>

      <!-- 小组基本信息 -->
      <div class="group-info" v-if="currentGroup">
        <h3 class="group-name">{{ currentGroup.title }}</h3>
        <div class="group-meta">
          <div class="meta-item">
            <span class="meta-label">导生：</span>
            <span class="meta-value">{{ currentGroup.tutorName || '未指定' }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">学年学期：</span>
            <span class="meta-value">{{ formatAcademicYear(currentGroup.academicYear, currentGroup.semester) }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">成员数：</span>
            <span class="meta-value">{{ currentGroup.studentCount }}人</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">状态：</span>
            <span class="meta-value" :class="getStatusClass(currentGroup.status)">
              {{ getStatusText(currentGroup.status) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 详情导航菜单 -->
      <div class="detail-nav">
        <div class="nav-title">小组管理</div>
        <div 
          v-for="item in detailNavItems" 
          :key="item.key"
          class="nav-item"
          :class="{ 'active': activeDetailTab === item.key }"
          @click="handleDetailNavChange(item.key)"
        >
          <el-icon class="nav-icon">
            <component :is="item.icon" />
          </el-icon>
          <span class="nav-label">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';
import { ArrowLeft, User, Bell, Document, Setting, HomeFilled, UserFilled } from '@element-plus/icons-vue';

// Props
const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['list', 'detail'].includes(value)
  },
  activeTab: {
    type: String,
    default: 'my-courses'
  },
  activeDetailTab: {
    type: String,
    default: 'overview'
  },
  currentGroup: {
    type: Object,
    default: null
  },
  courseType: {
    type: String,
    default: 'my-courses'
  }
});

// Emits
const emit = defineEmits([
  'tab-change',
  'detail-nav-change', 
  'back-to-list'
]);

// Vuex store
const store = useStore();
const isDarkMode = computed(() => store.getters.isDarkMode);

// 列表模式的导航项
const listModeItems = [
  { id: 'my-courses', label: '我听的课', icon: '📚' },
  { id: 'my-teachings', label: '我教的课', icon: '🎓' }
];

// 详情模式的导航项（根据课程类型显示不同内容）
const detailNavItems = computed(() => {
  const baseItems = [
    { key: 'overview', label: '概览', icon: HomeFilled },
    { key: 'members', label: '成员', icon: UserFilled },
    { key: 'announcements', label: '公告', icon: Bell }
  ];

  // 根据课程类型添加不同的导航项
  if (props.courseType === 'my-teachings') {
    // 我教的课：有管理权限
    return [
      ...baseItems,
      { key: 'tasks', label: '任务管理', icon: Document },
      { key: 'settings', label: '小组设置', icon: Setting }
    ];
  } else {
    // 我听的课：学生视角
    return [
      ...baseItems,
      { key: 'tasks', label: '任务单', icon: Document }
    ];
  }
});

// 侧边栏标题
const sidebarTitle = computed(() => {
  if (props.mode === 'list') {
    return '课程管理';
  } else {
    return props.courseType === 'my-teachings' ? '小组管理' : '小组信息';
  }
});

// 格式化学年学期
const formatAcademicYear = (year, semester) => {
  const semesterMap = {
    'spring': '春',
    'summer': '夏', 
    'autumn': '秋',
    'winter': '冬'
  };
  
  if (year && semester) {
    return `${year}年${semesterMap[semester] || semester}季`;
  }
  return year ? `${year}年` : '';
};

// 状态相关
const getStatusText = (status) => {
  const statusMap = {
    'active': '进行中',
    'completed': '已结束',
    'paused': '已暂停',
    'draft': '草稿'
  };
  return statusMap[status] || status;
};

const getStatusClass = (status) => {
  const statusClassMap = {
    'active': 'status-active',
    'completed': 'status-completed',
    'paused': 'status-paused',
    'draft': 'status-draft'
  };
  return statusClassMap[status] || 'status-active';
};

// 事件处理
const handleTabChange = (tabId) => {
  emit('tab-change', tabId);
};

const handleDetailNavChange = (navKey) => {
  emit('detail-nav-change', navKey);
};

const handleBackToList = () => {
  emit('back-to-list');
};
</script>

<style scoped>
.group-sidebar {
  width: 280px;
  min-width: 280px;
  padding: 24px 0;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  background-color: rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

.theme-dark .group-sidebar {
  background-color: rgba(30, 30, 30, 0.8);
  border-right-color: rgba(255, 255, 255, 0.1);
}

.sidebar-header {
  padding: 0 24px 16px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.theme-dark .sidebar-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.sidebar-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 列表模式样式 */
.sidebar-menu {
  padding: 0 16px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 4px 0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.sidebar-item:hover {
  transform: translateY(-1px);
  background-color: rgba(102, 126, 234, 0.08);
}

.theme-dark .sidebar-item:hover {
  background-color: rgba(102, 126, 234, 0.15);
}

.sidebar-item.active {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border: 1px solid rgba(102, 126, 234, 0.2);
}

.theme-dark .sidebar-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
  border: 1px solid rgba(102, 126, 234, 0.3);
}

.sidebar-icon {
  font-size: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.sidebar-label {
  font-size: 16px;
  font-weight: 500;
  flex: 1;
}

.sidebar-item.active .sidebar-label {
  color: #667eea;
}

.theme-dark .sidebar-item.active .sidebar-label {
  color: #8fa4f3;
}

/* 详情模式样式 */
.sidebar-content {
  padding: 0 16px;
}

.back-button {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: #667eea;
  font-weight: 500;
  font-size: 14px;
}

.back-button:hover {
  background-color: rgba(102, 126, 234, 0.08);
  transform: translateX(-2px);
}

.theme-dark .back-button:hover {
  background-color: rgba(102, 126, 234, 0.15);
}

.back-icon {
  margin-right: 8px;
  font-size: 16px;
}

.group-info {
  padding: 16px;
  margin-bottom: 20px;
  border-radius: 12px;
  background-color: rgba(102, 126, 234, 0.05);
  border: 1px solid rgba(102, 126, 234, 0.1);
}

.theme-dark .group-info {
  background-color: rgba(102, 126, 234, 0.1);
  border-color: rgba(102, 126, 234, 0.2);
}

.group-avatar {
  text-align: center;
  margin-bottom: 12px;
}

.avatar-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 600;
}

.group-name {
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  margin: 0 0 12px 0;
  color: #1a1a1a;
}

.theme-dark .group-name {
  color: #ffffff;
}

.group-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.meta-label {
  color: #6b7280;
  font-weight: 500;
}

.meta-value {
  font-weight: 600;
  color: #374151;
}

.theme-dark .meta-label {
  color: #9ca3af;
}

.theme-dark .meta-value {
  color: #e5e7eb;
}

.status-active { color: #10b981; }
.status-completed { color: #6b7280; }
.status-paused { color: #f59e0b; }
.status-draft { color: #8b5cf6; }

.detail-nav {
  margin-top: 16px;
}

.nav-title {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 12px;
  padding: 0 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.theme-dark .nav-title {
  color: #9ca3af;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  margin: 2px 0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
}

.nav-item:hover {
  background-color: rgba(102, 126, 234, 0.05);
  transform: translateX(2px);
}

.theme-dark .nav-item:hover {
  background-color: rgba(102, 126, 234, 0.1);
}

.nav-item.active {
  background-color: rgba(102, 126, 234, 0.1);
  color: #667eea;
  font-weight: 500;
}

.theme-dark .nav-item.active {
  background-color: rgba(102, 126, 234, 0.2);
  color: #8fa4f3;
}

.nav-icon {
  margin-right: 10px;
  font-size: 16px;
}

.nav-label {
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .group-sidebar {
    width: 100%;
    min-width: auto;
    border-right: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }
  
  .theme-dark .group-sidebar {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
  
  .sidebar-menu {
    display: flex;
    overflow-x: auto;
    padding: 0 16px;
    gap: 8px;
  }
  
  .sidebar-item {
    flex-shrink: 0;
    white-space: nowrap;
  }
  
  .back-button {
    font-size: 13px;
    padding: 10px 14px;
    margin-bottom: 16px;
  }
  
  .back-icon {
    font-size: 14px;
    margin-right: 6px;
  }
  
  .group-info {
    padding: 12px;
    margin-bottom: 16px;
  }
  
  .group-name {
    font-size: 16px;
    margin-bottom: 10px;
  }
  
  .meta-item {
    font-size: 12px;
    gap: 6px;
  }
  
  .nav-title {
    font-size: 12px;
    margin-bottom: 10px;
  }
  
  .nav-item {
    padding: 8px 12px;
    font-size: 13px;
  }
  
  .nav-icon {
    font-size: 14px;
    margin-right: 8px;
  }
}

@media (max-width: 480px) {
  .sidebar-content {
    padding: 0 12px;
  }
  
  .back-button {
    font-size: 12px;
    padding: 8px 12px;
    margin-bottom: 14px;
  }
  
  .back-icon {
    font-size: 13px;
    margin-right: 5px;
  }
  
  .group-info {
    padding: 10px;
    margin-bottom: 14px;
  }
  
  .group-name {
    font-size: 15px;
    margin-bottom: 8px;
  }
  
  .meta-item {
    font-size: 11px;
    gap: 4px;
  }
  
  .nav-item {
    padding: 7px 10px;
    font-size: 12px;
  }
  
  .nav-icon {
    font-size: 13px;
    margin-right: 6px;
  }
}
</style>