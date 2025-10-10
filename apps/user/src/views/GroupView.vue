<script setup>
import { RouterView, useRouter, useRoute } from "vue-router";
import MenuComponent from "../components/MenuComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
import GroupCards from "../components/Group/GroupCards.vue";
import GroupSidebar from "../components/Group/GroupSidebar.vue";
import GroupMembers from "../components/Group/GroupMembers.vue";
import GroupOverview from "../components/Group/GroupOverview.vue";
import GroupAnnouncements from "../components/Group/GroupAnnouncements.vue";
import GroupTasks from "../components/Group/GroupTasks.vue";
import GroupActivityList from "../components/Group/GroupActivityList.vue";
import GroupSettings from "../components/Group/GroupSettings.vue";
import AttendanceManagement from "../components/Group/AttendanceManagement.vue";
import StudentAttendanceView from "../components/Group/StudentAttendanceView.vue";
import { useStore } from 'vuex';
import { Expand, Search, Plus } from '@element-plus/icons-vue';
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';

const store = useStore();
const router = useRouter();
const route = useRoute();

// --- 主题管理 ---
const isDarkMode = computed(() => store.state.isDarkMode);

// --- 响应式 Header 逻辑 ---
const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);
const isHeaderHidden = ref(false);
let lastScrollTop = 0;

// --- 页面状态管理 ---
const currentMode = ref('list'); // 'list' | 'detail'
const activeTab = ref('my-courses'); // 默认选择"我听的课"
const activeDetailTab = ref('overview'); // 详情页导航
const currentGroup = ref(null); // 当前选中的小组

// --- 路由状态管理 ---
const initializeFromRoute = () => {
  const query = route.query;
  
  // 恢复选项卡状态
  if (query.tab && ['my-courses', 'my-teachings'].includes(query.tab)) {
    activeTab.value = query.tab;
  }
  
  // 恢复模式状态
  if (query.mode && ['list', 'detail'].includes(query.mode)) {
    currentMode.value = query.mode;
  }
  
  // 恢复详情页标签
  if (query.detailTab && ['overview', 'members', 'announcements', 'tasks', 'activities', 'settings', 'attendance'].includes(query.detailTab)) {
    activeDetailTab.value = query.detailTab;
  }
  
  // 恢复当前小组（这里可以根据实际需要从ID获取小组信息）
  if (query.groupId) {
    // TODO: 根据 groupId 获取小组信息
    currentGroup.value = {
      id: query.groupId,
      title: query.groupTitle || '小组详情'
    };
  }
  
  // 恢复搜索状态
  if (query.search) {
    searchQuery.value = query.search;
  }
};

const updateRouteQuery = () => {
  const query = {};
  
  // 只在非默认状态时添加到URL
  if (activeTab.value !== 'my-courses') {
    query.tab = activeTab.value;
  }
  
  if (currentMode.value !== 'list') {
    query.mode = currentMode.value;
  }
  
  if (activeDetailTab.value !== 'overview' && currentMode.value === 'detail') {
    query.detailTab = activeDetailTab.value;
  }
  
  if (currentGroup.value?.id) {
    query.groupId = currentGroup.value.id;
    if (currentGroup.value.title) {
      query.groupTitle = currentGroup.value.title;
    }
  }
  
  if (searchQuery.value) {
    query.search = searchQuery.value;
  }
  
  // 检查是否需要更新路由
  const currentQuery = route.query;
  const queryChanged = JSON.stringify(query) !== JSON.stringify(currentQuery);
  
  if (queryChanged) {
    // 更新路由，但不触发页面刷新
    router.replace({ 
      path: route.path, 
      query: Object.keys(query).length > 0 ? query : {}
    }).catch(() => {
      // 忽略导航重复错误
    });
  }
};

// --- 搜索功能 ---
const searchQuery = ref('');
const isSearchFocused = ref(false);

// --- 创建小组表单 ---
const isCreateFormVisible = ref(false);
const createGroupForm = ref({
  courseBinding: '',
  groupType: 'study', // 'study' or 'project'
  tutor: '当前用户', // 默认绑定自己
  academicYear: '',
  semester: '',
  studentLimit: 30
});

const courseOptions = [
  { value: 'course1', label: '生物医学工程导论' },
  { value: 'course2', label: '医学图像处理' },
  { value: 'course3', label: '生物信号处理' },
  { value: 'course4', label: '医疗器械设计' },
  { value: 'course5', label: '人工智能在医学中的应用' }
];

const academicYearOptions = [
  { value: '2024', label: '2024年' },
  { value: '2025', label: '2025年' },
  { value: '2026', label: '2026年' }
];

const semesterOptions = [
  { value: 'spring', label: '春季' },
  { value: 'summer', label: '夏季' },
  { value: 'autumn', label: '秋季' },
  { value: 'winter', label: '冬季' }
];

const groupTypeOptions = [
  { value: 'study', label: '学习组', disabled: false },
  { value: 'project', label: '项目组', disabled: true }
];

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) {
    isMobileMenuOpen.value = false;
  }
};

const handleScroll = () => {
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  
  // 向下滚动且滚动距离超过100px时隐藏header
  if (scrollTop > lastScrollTop && scrollTop > 100) {
    isHeaderHidden.value = true;
  } 
  // 向上滚动时显示header
  else if (scrollTop < lastScrollTop) {
    isHeaderHidden.value = false;
  }
  
  lastScrollTop = scrollTop;
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const handleTabChange = (tabId) => {
  if (activeTab.value === tabId) return; // 如果是同一个标签，不执行切换
  
  activeTab.value = tabId; // 直接切换，不显示切换动画
  
  // 切换标签时重置搜索和详情状态
  searchQuery.value = '';
  if (currentMode.value === 'detail') {
    currentMode.value = 'list';
    currentGroup.value = null;
    activeDetailTab.value = 'overview';
  }
  
  // 更新路由状态
  updateRouteQuery();
};

// --- 课程管理事件处理 ---
function handleCourseClick(course) {
  console.log('Course clicked:', course);
  // 切换到详情模式并设置当前小组
  currentMode.value = 'detail';
  
  // 确保小组有完整的设置结构
  currentGroup.value = {
    ...course,
    settings: {
      enableAttendance: true, // 默认启用考勤功能
      ...course.settings
    }
  };
  
  activeDetailTab.value = 'overview';
  
  // 更新路由状态
  updateRouteQuery();
}

function handleEditCourse(courseId) {
  console.log('Edit course:', courseId);
  // TODO: 实现课程编辑功能
}

function handleCreateCourse() {
  console.log('Create new course');
  // TODO: 实现新建课程功能
}

// --- 搜索功能 ---
function handleSearchInput(value) {
  searchQuery.value = value;
}

// --- 创建小组功能 ---
function handleCreateGroup() {
  isCreateFormVisible.value = true;
  // 重置表单
  createGroupForm.value = {
    courseBinding: '',
    groupType: 'study',
    tutor: '当前用户',
    academicYear: '',
    semester: '',
    studentLimit: 30
  };
}

function handleFormSubmit() {
  console.log('Creating group with data:', createGroupForm.value);
  // TODO: 实现创建小组API调用
  
  // 模拟创建成功
  setTimeout(() => {
    isCreateFormVisible.value = false;
    // 可以添加成功提示
    console.log('小组创建成功！');
  }, 1000);
}

function handleFormCancel() {
  isCreateFormVisible.value = false;
}

// --- 侧边栏事件处理 ---
function handleSidebarTabChange(tabId) {
  handleTabChange(tabId);
}

function handleDetailNavChange(navKey) {
  activeDetailTab.value = navKey;
  console.log('Detail nav changed to:', navKey);
  
  // 更新路由状态
  updateRouteQuery();
}

function handleBackToList() {
  currentMode.value = 'list';
  currentGroup.value = null;
  activeDetailTab.value = 'overview';
  
  // 更新路由状态
  updateRouteQuery();
}

// --- 详情页相关函数 ---
function getDetailTabLabel(tabKey) {
  const labelMap = {
    'overview': '概览',
    'members': '成员',
    'announcements': '公告',
    'tasks': activeTab.value === 'my-teachings' ? '任务管理' : '我的任务',
    'activities': '活动记录',
    'settings': '小组设置'
  };
  return labelMap[tabKey] || '未知功能';
}

// --- 成员管理事件处理 ---
function handleMemberAdd() {
  console.log('添加成员');
  // TODO: 实现添加成员逻辑
}

function handleMemberEdit(member) {
  console.log('编辑成员:', member);
  // TODO: 实现编辑成员逻辑
}

function handleMemberRemove(member) {
  console.log('移除成员:', member);
  // TODO: 实现移除成员逻辑
}

function handleMemberRoleChange(member) {
  console.log('更改成员角色:', member);
  // TODO: 实现角色更改逻辑
}

// --- 概览页面事件处理 ---
function handleQuickAction(actionType) {
  console.log('快速操作:', actionType);
  
  switch (actionType) {
    case 'announcement':
      // 切换到公告页面或打开发布公告对话框
      activeDetailTab.value = 'announcements';
      break;
    case 'task':
      // 切换到任务页面或打开创建任务对话框
      activeDetailTab.value = 'tasks';
      break;
    case 'member':
      // 切换到成员页面或打开添加成员对话框
      activeDetailTab.value = 'members';
      break;
    default:
      console.warn('未知的快速操作类型:', actionType);
  }
  
  // 路由状态会通过 watch 自动更新
}

function handleViewActivities() {
  console.log('查看所有活动');
  // 切换到活动列表标签
  activeDetailTab.value = 'activities';
  updateRouteQuery();
}

// --- 公告管理事件处理 ---
function handleAnnouncementCreate(announcement) {
  console.log('创建公告:', announcement);
  // TODO: 实现公告创建逻辑
}

function handleAnnouncementEdit(announcement) {
  console.log('编辑公告:', announcement);
  // TODO: 实现公告编辑逻辑
}

function handleAnnouncementDelete(announcement) {
  console.log('删除公告:', announcement);
  // TODO: 实现公告删除逻辑
}

// --- 任务管理事件处理 ---
function handleTaskCreate(task) {
  console.log('创建任务:', task);
  // TODO: 实现任务创建逻辑
}

function handleTaskEdit(task) {
  console.log('编辑任务:', task);
  // TODO: 实现任务编辑逻辑
}

function handleTaskDelete(task) {
  console.log('删除任务:', task);
  // TODO: 实现任务删除逻辑
}

function handleTaskSubmit(task) {
  console.log('提交任务:', task);
  // TODO: 实现任务提交逻辑
}

// --- 活动管理事件处理 ---
function handleActivityClick(activity) {
  console.log('点击活动:', activity);
  // TODO: 实现活动详情查看逻辑
}

function handleActivityRefresh() {
  console.log('刷新活动列表');
  // TODO: 实现活动列表刷新逻辑
}

// --- 小组设置事件处理 ---
function handleSettingsUpdated(event) {
  console.log('设置已更新:', event);
  
  // 根据不同类型的设置更新处理
  switch (event.type) {
    case 'basic':
      // 更新基本信息
      if (currentGroup.value) {
        Object.assign(currentGroup.value, event.data);
      }
      break;
    case 'member':
      // 更新成员设置
      if (currentGroup.value) {
        currentGroup.value.settings = currentGroup.value.settings || {};
        currentGroup.value.settings.member = event.data;
      }
      break;
    case 'notification':
      // 更新通知设置
      if (currentGroup.value) {
        currentGroup.value.settings = currentGroup.value.settings || {};
        currentGroup.value.settings.notification = event.data;
      }
      break;
  }
  
  // TODO: 调用API保存设置到后端
}

function handleGroupArchived(groupId) {
  console.log('小组已归档:', groupId);
  
  // 更新当前小组状态
  if (currentGroup.value && currentGroup.value.id === groupId) {
    currentGroup.value.status = 'completed';
  }
  
  // TODO: 调用API更新后端状态
  // 可选：显示成功消息或跳转到列表页
}

function handleGroupDeleted(groupId) {
  console.log('小组已删除:', groupId);
  
  // 删除后返回列表页
  handleBackToList();
  
  // TODO: 调用API删除小组
  // TODO: 从列表中移除已删除的小组
}

// --- 考勤设置事件处理 ---
function handleAttendanceSettingsUpdated(event) {
  console.log('考勤设置已更新:', event);
  
  // 根据不同类型的考勤设置更新处理
  switch (event.type) {
    case 'attendance-rules':
      // 更新考勤规则设置
      if (currentGroup.value) {
        currentGroup.value.settings = currentGroup.value.settings || {};
        currentGroup.value.settings.attendanceRules = event.data;
      }
      break;
    case 'statistics-settings':
      // 更新统计设置
      if (currentGroup.value) {
        currentGroup.value.settings = currentGroup.value.settings || {};
        currentGroup.value.settings.statisticsSettings = event.data;
      }
      break;
  }
  
  // TODO: 调用API保存考勤设置到后端
}

// --- 获取当前用户ID ---
const getCurrentUserId = () => {
  // 从Vuex store获取用户信息
  const userInfo = store.state.userInfo || store.getters.userInfo;
  if (userInfo && userInfo.id) {
    return userInfo.id;
  }
  
  // 从localStorage获取用户信息作为备用
  try {
    const storedUser = localStorage.getItem('userInfo');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      return parsedUser.id || parsedUser.userId;
    }
  } catch (error) {
    console.warn('解析用户信息失败:', error);
  }
  
  // 开发环境返回模拟用户ID
  return 1;
}

// --- 监听器和生命周期 ---
// 标记是否正在从路由初始化，避免循环更新
const isInitializingFromRoute = ref(false);

// 监听路由变化
watch(() => route.query, () => {
  isInitializingFromRoute.value = true;
  initializeFromRoute();
  // 延迟重置标记，确保所有状态更新完成
  setTimeout(() => {
    isInitializingFromRoute.value = false;
  }, 100);
}, { immediate: false });

// 监听状态变化，自动更新路由
watch([currentMode, activeTab, activeDetailTab, currentGroup, searchQuery], () => {
  // 只在非路由初始化时更新路由
  if (!isInitializingFromRoute.value) {
    updateRouteQuery();
  }
}, { deep: true });

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  window.addEventListener('scroll', handleScroll);
  
  // 从路由初始化状态
  initializeFromRoute();
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
  window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <div class="group-page" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
    <el-container class="common-layout">
      <el-header class="header-container" :class="{ 'header-hidden': isHeaderHidden }">
        <!-- 桌面菜单 -->
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <!-- 移动端头部 -->
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')"
              alt="Logo" />
          </div>
          <el-icon class="hamburger-icon" @click="toggleMobileMenu">
            <Expand />
          </el-icon>
        </div>
      </el-header>

      <!-- 移动端菜单 -->
      <MobileMenuComponent 
        v-if="isMobile && isMobileMenuOpen" 
        @close="toggleMobileMenu"
        style="z-index: 1001;" 
      />

      <el-main class="main-container">
        <div class="group-content">
          <!-- 独立的侧边栏组件 -->
          <GroupSidebar 
            :mode="currentMode"
            :active-tab="activeTab"
            :active-detail-tab="activeDetailTab"
            :current-group="currentGroup"
            :course-type="activeTab"
            :is-header-hidden="isHeaderHidden"
            @tab-change="handleSidebarTabChange"
            @detail-nav-change="handleDetailNavChange"
            @back-to-list="handleBackToList"
          />

          <!-- 右侧主内容区 -->
          <div class="content-area">
            <!-- 列表模式：显示搜索栏和课程卡片 -->
            <template v-if="currentMode === 'list'">
              <!-- 顶部搜索栏和操作区 -->
              <div class="top-section">
                <div class="search-section">
                  <div class="search-container" :class="{ 'focused': isSearchFocused }">
                    <el-icon class="search-icon">
                      <Search />
                    </el-icon>
                    <input 
                      v-model="searchQuery"
                      type="text" 
                      class="search-input"
                      placeholder="搜索小组..."
                      @input="handleSearchInput"
                      @focus="isSearchFocused = true"
                      @blur="isSearchFocused = false"
                    />
                  </div>
                  
                  <!-- 创建小组按钮 (仅在我教的课时显示) -->
                  <div class="action-buttons" v-if="activeTab === 'my-teachings'">
                    <button class="create-group-btn" @click="handleCreateGroup">
                      <el-icon class="btn-icon">
                        <Plus />
                      </el-icon>
                      <span class="btn-text">创建小组</span>
                    </button>
                  </div>
                </div>
                
                <!-- 分隔线 -->
                <div class="section-divider"></div>
              </div>
              
              <!-- 课程卡片管理组件 -->
              <div class="courses-section">
                <GroupCards 
                  :search-query="searchQuery"
                  :course-type="activeTab"
                  @course-click="handleCourseClick"
                  @edit-course="handleEditCourse"
                />
              </div>
            </template>

            <!-- 详情模式：显示小组详情内容 -->
            <template v-else-if="currentMode === 'detail'">
              <div class="detail-content">
                <div class="detail-header">
                  <h1 class="detail-title">{{ currentGroup?.title || '小组详情' }}</h1>
                </div>
                
                <!-- 详情内容区域 - 根据activeDetailTab显示不同内容 -->
                <div class="detail-body">
                  <div v-if="activeDetailTab === 'overview'" class="detail-section">
                    <GroupOverview 
                      :group-data="currentGroup"
                      :course-type="activeTab"
                      @quick-action="handleQuickAction"
                      @view-activities="handleViewActivities"
                    />
                  </div>
                  
                  <div v-else-if="activeDetailTab === 'members'" class="detail-section">
                    <GroupMembers 
                      :group-data="currentGroup"
                      :course-type="activeTab"
                      @member-add="handleMemberAdd"
                      @member-edit="handleMemberEdit"
                      @member-remove="handleMemberRemove"
                      @member-role-change="handleMemberRoleChange"
                    />
                  </div>
                  
                  <div v-else-if="activeDetailTab === 'announcements'" class="detail-section">
                    <GroupAnnouncements 
                      :group-data="currentGroup"
                      :course-type="activeTab"
                      @announcement-create="handleAnnouncementCreate"
                      @announcement-edit="handleAnnouncementEdit"
                      @announcement-delete="handleAnnouncementDelete"
                    />
                  </div>
                  
                  <div v-else-if="activeDetailTab === 'tasks'" class="detail-section">
                    <GroupTasks 
                      :group-data="currentGroup"
                      :course-type="activeTab"
                      @task-create="handleTaskCreate"
                      @task-edit="handleTaskEdit"
                      @task-delete="handleTaskDelete"
                      @task-submit="handleTaskSubmit"
                    />
                  </div>
                  
                  <div v-else-if="activeDetailTab === 'activities'" class="detail-section">
                    <GroupActivityList 
                      :group-data="currentGroup"
                      :course-type="activeTab"
                      @activity-click="handleActivityClick"
                      @refresh="handleActivityRefresh"
                    />
                  </div>
                  
                  <div v-else-if="activeDetailTab === 'settings'" class="detail-section">
                    <GroupSettings 
                      :group-data="currentGroup"
                      @settings-updated="handleSettingsUpdated"
                      @group-archived="handleGroupArchived"
                      @group-deleted="handleGroupDeleted"
                    />
                  </div>

                  <div v-else-if="activeDetailTab === 'attendance'" class="detail-section">
                    <!-- 根据课程类型显示不同的考勤组件 -->
                    <AttendanceManagement 
                      v-if="activeTab === 'my-teachings'"
                      :group-id="currentGroup?.id"
                      @settings-updated="handleAttendanceSettingsUpdated"
                    />
                    <StudentAttendanceView
                      v-else-if="activeTab === 'my-courses'"
                      :group-id="currentGroup?.id"
                      :current-user-id="getCurrentUserId()"
                    />
                  </div>
                  
                  <div v-else class="detail-section">
                    <p>功能开发中...</p>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </el-main>
    </el-container>

    <!-- 创建小组表单对话框 -->
    <el-dialog 
      v-model="isCreateFormVisible" 
      title="创建小组" 
      width="500px"
      :before-close="handleFormCancel"
    >
      <el-form :model="createGroupForm" label-width="100px">
        <el-form-item label="绑定课程" required>
          <el-select 
            v-model="createGroupForm.courseBinding" 
            placeholder="请选择课程"
            style="width: 100%"
          >
            <el-option
              v-for="option in courseOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="小组类型" required>
          <el-radio-group v-model="createGroupForm.groupType">
            <el-radio 
              v-for="option in groupTypeOptions"
              :key="option.value"
              :label="option.value"
              :disabled="option.disabled"
            >
              {{ option.label }}
              <span v-if="option.disabled" class="disabled-tip">（暂不可选）</span>
            </el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="导生">
          <el-input 
            v-model="createGroupForm.tutor" 
            disabled
            placeholder="导生姓名"
          />
          <div class="form-tip">默认绑定为当前用户</div>
        </el-form-item>

        <el-form-item label="学年学期" required>
          <div class="year-semester-container">
            <el-select 
              v-model="createGroupForm.academicYear" 
              placeholder="选择学年"
            >
              <el-option
                v-for="option in academicYearOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
            <el-select 
              v-model="createGroupForm.semester" 
              placeholder="选择学期"
            >
              <el-option
                v-for="option in semesterOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="人数限制" required>
          <el-input-number 
            v-model="createGroupForm.studentLimit"
            :min="1"
            :max="100"
            controls-position="right"
            style="width: 100%"
          />
          <div class="form-tip">建议设置为10-50人</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleFormCancel">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleFormSubmit"
            :disabled="!createGroupForm.courseBinding || !createGroupForm.academicYear || !createGroupForm.semester"
          >
            创建小组
          </el-button>
        </span>
      </template>
    </el-dialog>


  </div>
</template>

<style scoped>
/* --- 整体页面样式 --- */
.group-page {
  min-height: 100vh;
  transition: all 0.3s ease;
}

.theme-light .group-page {
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  color: #333333;
}

.theme-dark .group-page {
  background-color: #1a1a1a;
  color: #ffffff;
}

.common-layout {
  min-height: 100vh;
  padding-top: 60px; /* 为固定的header留出空间 */
}

/* --- Header 样式 --- */
.header-container {
  height: 60px;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease-in-out;
}

.header-container.header-hidden {
  transform: translateY(-100%);
}

.theme-light .header-container {
  background-color: rgba(255, 255, 255, 0.95);
  border-bottom-color: rgba(0, 0, 0, 0.06);
}

.theme-dark .header-container {
  background-color: rgba(26, 26, 26, 0.95);
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.desktop-menu-container {
  height: 100%;
}

.mobile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 20px;
}

.mobile-logo {
  cursor: pointer;
}

.hamburger-icon {
  font-size: 24px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.hamburger-icon:hover {
  transform: scale(1.1);
}

/* --- Main Content 样式 --- */
.main-container {
  position: relative;
  padding: 0;
  min-height: calc(100vh - 60px);
  overflow-x: hidden;
}

.group-content {
  display: block;
  min-height: calc(100vh - 60px);
  padding-left: 280px; /* 为固定的sidebar留出空间 */
  transition: all 0.3s ease-in-out;
}

/* --- 详情页样式 --- */
.detail-content {
  width: 100%;
  padding: 20px 0;
}

.detail-header {
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .detail-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.detail-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.detail-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.theme-dark .detail-subtitle {
  color: #9ca3af;
}

.detail-body {
  width: 100%;
}

.detail-section {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 20px;
}

.theme-dark .detail-section {
  background: rgba(40, 40, 40, 0.8);
  border-color: rgba(255, 255, 255, 0.1);
}

.detail-section h3 {
  margin: 0 0 16px 0;
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.theme-dark .detail-section h3 {
  color: #ffffff;
}

.detail-section p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

.theme-dark .detail-section p {
  color: #a1a1aa;
}

/* --- 右侧内容区样式 --- */
.content-area {
  width: 100%;
  padding: 24px 32px;
  overflow-y: auto;
}

.content-header {
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-dark .content-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.content-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.content-subtitle {
  font-size: 16px;
  margin: 0;
  opacity: 0.7;
}

.content-body {
  min-height: 400px;
}

/* --- 占位内容样式 --- */
.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  padding: 40px;
}

.placeholder-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.placeholder-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 12px 0;
  opacity: 0.8;
}

.placeholder-text {
  font-size: 16px;
  margin: 0;
  opacity: 0.6;
  max-width: 400px;
}

/* --- 响应式设计 --- */
@media (max-width: 768px) {
  .group-content {
    padding-left: 0; /* 移动端取消sidebar的左边距 */
  }
  
  .content-area {
    padding: 20px 16px;
  }
  
  .search-section {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding-bottom: 16px;
  }
  
  .search-container {
    max-width: 100%;
  }
  
  .action-buttons {
    justify-content: flex-end;
  }
  
  .create-group-btn {
    padding: 10px 16px;
    font-size: 13px;
  }
  
  .detail-title {
    font-size: 24px;
  }
  
  .detail-section {
    padding: 16px;
  }
  
  .placeholder-content {
    min-height: 300px;
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .detail-title {
    font-size: 20px;
  }
  
  .detail-section {
    padding: 12px;
  }
  
  .placeholder-icon {
    font-size: 48px;
  }
  
  .placeholder-title {
    font-size: 20px;
  }
}

/* --- 顶部区域和搜索栏样式 --- */
.top-section {
  width: 100%;
}

.search-section {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding-bottom: 20px;
}

.section-divider {
  width: 100%;
  height: 1px;
  background-color: rgba(0, 0, 0, 0.08);
  margin-bottom: 4px;
}

.theme-dark .section-divider {
  background-color: rgba(255, 255, 255, 0.1);
}

.search-container {
  position: relative;
  max-width: 320px;
  width: 100%;
  flex-shrink: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
}

.search-container.focused {
  transform: translateY(-1px);
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.15);
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #8B8B8B;
  font-size: 18px;
  pointer-events: none;
  transition: color 0.3s ease;
  z-index: 10;
}

.search-container.focused .search-icon {
  color: #667eea;
}

.search-input {
  width: 100%;
  padding: 14px 16px 14px 48px;
  font-size: 15px;
  border: 2px solid transparent;
  border-radius: 12px;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  color: #2c3e50;
}

.search-input::placeholder {
  color: #8B8B8B;
  transition: color 0.3s ease;
}

.search-input:focus {
  border-color: #667eea;
  background-color: rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.search-input:focus::placeholder {
  color: #B8B8B8;
}

/* --- 暗黑主题搜索栏 --- */
.theme-dark .search-input {
  background-color: rgba(40, 40, 40, 0.8);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-dark .search-input:focus {
  background-color: rgba(40, 40, 40, 0.95);
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
}

.theme-dark .search-input::placeholder {
  color: #888888;
}

.theme-dark .search-input:focus::placeholder {
  color: #666666;
}

.theme-dark .search-icon {
  color: #a1a1aa;
}

.theme-dark .search-container.focused .search-icon {
  color: #8fa4f3;
}

/* --- 操作按钮样式 --- */
.action-buttons {
  display: flex;
  gap: 12px;
}

.create-group-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.create-group-btn:hover {
  background-color: #5a6fd8;
}

.create-group-btn:active {
  background-color: #4c63d2;
  transform: scale(0.98);
}

.btn-icon {
  font-size: 16px;
}

.btn-text {
  font-weight: 600;
}

/* --- 课程区域样式 --- */
.courses-section {
  flex: 1;
  width: 100%;
  padding-top: 20px;
}

/* --- 创建小组表单样式 --- */
.form-tip {
  font-size: 12px;
  color: #999999;
  margin-top: 4px;
  line-height: 1.4;
}

.theme-dark .form-tip {
  color: #888888;
}

.year-semester-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.year-semester-container .el-select {
  flex: 1;
}

/* 确保下拉选择框的显示 */
:deep(.year-semester-container .el-select .el-input) {
  width: 100%;
}

:deep(.year-semester-container .el-select .el-input__inner) {
  border-radius: 8px;
}

.disabled-tip {
  font-size: 12px;
  color: #999999;
  margin-left: 4px;
}

.theme-dark .disabled-tip {
  color: #888888;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* Element Plus 对话框样式自定义 */
:deep(.el-dialog) {
  border-radius: 12px;
}

:deep(.el-dialog__header) {
  padding: 20px 20px 10px 20px;
}

:deep(.el-dialog__body) {
  padding: 10px 20px 20px 20px;
}

:deep(.el-dialog__footer) {
  padding: 10px 20px 20px 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input__inner) {
  border-radius: 8px;
}

:deep(.el-select .el-input__inner) {
  border-radius: 8px;
}


</style>