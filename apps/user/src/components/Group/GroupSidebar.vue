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
import { ArrowLeft, Document, Setting, HomeFilled, UserFilled, Reading, Notebook, Grid } from '@element-plus/icons-vue';

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
const user = computed(() => store.state.user);
const userRole = computed(() => user.value?.role || 'student');

// 列表模式的导航项 - 根据用户角色过滤
const listModeItems = computed(() => {
  const items = [
    { id: 'my-courses', label: '我听的课', icon: Reading }
  ];
  // 只有教师角色才显示"我教的课"
  if (userRole.value === 'teacher') {
    items.push({ id: 'my-teachings', label: '我教的课', icon: Notebook });
  }
  items.push({ id: 'all-groups', label: '小组广场', icon: Grid });
  return items;
});

// 详情模式的导航项（根据课程类型显示不同内容）
const detailNavItems = computed(() => {
  const baseItems = [
    { key: 'overview', label: '概览', icon: HomeFilled },
    { key: 'members', label: '成员', icon: UserFilled }
  ];

  // 根据课程类型添加不同的导航项
  if (props.courseType === 'my-teachings') {
    // 我教的课：有管理权限
    const teacherItems = [
      ...baseItems,
      { key: 'tasks', label: '任务管理', icon: Document }
    ];

    // 设置选项放在最后
    teacherItems.push({ key: 'settings', label: '小组设置', icon: Setting });

    return teacherItems;
  } else {
    // 我听的课：学生视角
    const studentItems = [
      ...baseItems,
      { key: 'tasks', label: '任务单', icon: Document }
    ];

    return studentItems;
  }
});

// 侧边栏标题
const sidebarTitle = computed(() => {
  if (props.mode === 'list') {
    return '小组中心';
  } else {
    return props.courseType === 'my-teachings' ? '小组管理' : '小组信息';
  }
});

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