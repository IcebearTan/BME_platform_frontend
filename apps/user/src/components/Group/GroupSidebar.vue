<template>
  <div class="group-sidebar" :class="{ 'theme-dark': isDarkMode, 'header-hidden': isHeaderHidden }">
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
        <el-icon class="sidebar-icon">
          <component :is="item.icon" />
        </el-icon>
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
        <!-- <div class="nav-title">小组管理</div> -->
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
import { ArrowLeft, Bell, Document, Setting, HomeFilled, UserFilled, Clock, Reading, Notebook } from '@element-plus/icons-vue';

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
  },
  isHeaderHidden: {
    type: Boolean,
    default: false
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
  { id: 'my-courses', label: '我听的课', icon: Reading },
  { id: 'my-teachings', label: '我教的课', icon: Notebook }
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
    const teacherItems = [
      ...baseItems,
      { key: 'tasks', label: '任务管理', icon: Document }
    ];

    // 如果小组启用了考勤功能，添加考勤管理选项
    if (props.currentGroup?.settings?.enableAttendance) {
      teacherItems.push({ key: 'attendance', label: '考勤管理', icon: Clock });
    }

    // 设置选项放在最后
    teacherItems.push({ key: 'settings', label: '小组设置', icon: Setting });

    return teacherItems;
  } else {
    // 我听的课：学生视角
    const studentItems = [
      ...baseItems,
      { key: 'tasks', label: '任务单', icon: Document }
    ];

    // 学生也可以查看考勤（如果启用了考勤功能）
    if (props.currentGroup?.settings?.enableAttendance) {
      studentItems.push({ key: 'attendance', label: '我的考勤', icon: Clock });
    }

    return studentItems;
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
  position: fixed;
  top: 60px;
  left: 0;
  width: 280px;
  height: calc(100vh - 60px);
  padding: 20px 16px;
  background-color: #ffffff;
  border-right: 1px solid #f0f0f0;
  border-top: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease-in-out;
  z-index: 50;
  overflow-y: auto;
  box-sizing: border-box;
}

.group-sidebar.header-hidden {
  top: 0;
  height: 100vh;
}

.theme-dark .group-sidebar {
  background-color: #1f1f1f;
  border-right-color: #2a2a2a;
  border-top-color: #2a2a2a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.sidebar-header {
  padding: 0 8px 16px 8px;
  margin-bottom: 12px;
}

.sidebar-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #323233;
}

.theme-dark .sidebar-title {
  color: #e5e5e5;
}

/* 列表模式样式 */
.sidebar-menu {
  padding: 0 8px;
}

.sidebar-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  margin: 4px 0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  background-color: transparent;
}

.sidebar-item:hover {
  background-color: #f5f7fa;
}

.theme-dark .sidebar-item:hover {
  background-color: #2a2a2a;
}

.sidebar-item.active {
  background-color: #ecf5ff;
}

.theme-dark .sidebar-item.active {
  background-color: #2d3a4f;
}

.sidebar-icon {
  font-size: 20px;
  margin-right: 14px;
  flex-shrink: 0;
  color: #909399;
}

.sidebar-item.active .sidebar-icon {
  color: #409eff;
}

.theme-dark .sidebar-icon {
  color: #606266;
}

.theme-dark .sidebar-item.active .sidebar-icon {
  color: #409eff;
}

.sidebar-label {
  font-size: 15px;
  font-weight: 450;
  flex: 1;
  color: #606266;
}

.sidebar-item.active .sidebar-label {
  color: #409eff;
  font-weight: 500;
}

.theme-dark .sidebar-label {
  color: #c0c4cc;
}

.theme-dark .sidebar-item.active .sidebar-label {
  color: #409eff;
}

/* 详情模式样式 */
.sidebar-content {
  padding: 0 8px;
}

.back-button {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 20px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  color: #409eff;
  font-weight: 450;
  font-size: 14px;
  background-color: #f5f7fa;
}

.back-button:hover {
  background-color: #ecf5ff;
  transform: translateX(-2px);
}

.theme-dark .back-button {
  background-color: #2a2a2a;
}

.theme-dark .back-button:hover {
  background-color: #2d3a4f;
}

.back-icon {
  margin-right: 8px;
  font-size: 16px;
}

.group-info {
  padding: 18px;
  margin-bottom: 20px;
  border-radius: 16px;
  background-color: #fafafa;
  border: 1px solid #f0f0f0;
}

.theme-dark .group-info {
  background-color: #252525;
  border-color: #2a2a2a;
}

.group-avatar {
  text-align: center;
  margin-bottom: 12px;
}

.avatar-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 600;
}

.group-name {
  font-size: 17px;
  font-weight: 600;
  text-align: center;
  margin: 0 0 12px 0;
  color: #323233;
}

.theme-dark .group-name {
  color: #e5e5e5;
}

.group-meta {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.meta-label {
  color: #909399;
  font-weight: 450;
}

.meta-value {
  font-weight: 500;
  color: #606266;
}

.theme-dark .meta-label {
  color: #707070;
}

.theme-dark .meta-value {
  color: #c0c4cc;
}

.status-active { color: #67c23a; }
.status-completed { color: #909399; }
.status-paused { color: #e6a23c; }
.status-draft { color: #909399; }

.detail-nav {
  margin-top: 16px;
}

.nav-title {
  font-size: 12px;
  font-weight: 500;
  color: #c0c4cc;
  margin-bottom: 10px;
  padding: 0 16px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.theme-dark .nav-title {
  color: #4a4a4a;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 3px 0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 14px;
  color: #606266;
}

.nav-item:hover {
  background-color: #f5f7fa;
  transform: translateX(2px);
}

.theme-dark .nav-item:hover {
  background-color: #2a2a2a;
}

.nav-item.active {
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: 500;
}

.theme-dark .nav-item.active {
  background-color: #2d3a4f;
  color: #409eff;
}

.nav-icon {
  margin-right: 12px;
  font-size: 17px;
}

.nav-label {
  flex: 1;
}

/* 滚动条样式 */
.group-sidebar::-webkit-scrollbar {
  width: 4px;
}

.group-sidebar::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 4px;
}

.theme-dark .group-sidebar::-webkit-scrollbar-thumb {
  background-color: #3a3a3a;
}

.group-sidebar::-webkit-scrollbar-track {
  background: transparent;
}

.group-sidebar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.group-sidebar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.15);
}

.theme-dark .group-sidebar::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .group-sidebar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .group-sidebar {
    display: none; /* 移动端隐藏sidebar */
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