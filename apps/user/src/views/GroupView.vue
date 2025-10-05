<script setup>
import { RouterView, useRouter } from "vue-router";
import MenuComponent from "../components/MenuComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import GroupCards from "../components/Group/GroupCards.vue";
import { useStore } from 'vuex';
import { Expand, Search, Plus } from '@element-plus/icons-vue';
import { ref, onMounted, onUnmounted, computed } from 'vue';

const store = useStore();
const router = useRouter();

// --- 主题管理 ---
const isDarkMode = computed(() => store.state.isDarkMode);

// --- 响应式 Header 逻辑 ---
const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);

// --- 侧边栏状态 ---
const activeTab = ref('my-courses'); // 默认选择"我听的课"
const sidebarItems = [
  { id: 'my-courses', label: '我听的课', icon: '📚' },
  { id: 'my-teachings', label: '我教的课', icon: '🎓' }
];

// --- 搜索功能 ---
const searchQuery = ref('');
const isSearchFocused = ref(false);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) {
    isMobileMenuOpen.value = false;
  }
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

const handleTabChange = (tabId) => {
  if (activeTab.value === tabId) return; // 如果是同一个标签，不执行切换
  
  activeTab.value = tabId; // 直接切换，不显示切换动画
};

// --- 课程管理事件处理 ---
function handleCourseClick(courseId, courseData) {
  console.log('Course clicked:', courseId, courseData);
  // TODO: 实现课程详情页导航
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
  console.log('Create new group');
  // TODO: 实现创建小组功能
}

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});
</script>

<template>
  <div class="group-page" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
    <el-container class="common-layout">
      <el-header class="header-container">
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
          <!-- 左侧边栏 -->
          <div class="sidebar">
            <div class="sidebar-header">
              <h2 class="sidebar-title">课程管理</h2>
            </div>
            <div class="sidebar-menu">
              <div 
                v-for="item in sidebarItems" 
                :key="item.id"
                class="sidebar-item"
                :class="{ 'active': activeTab === item.id }"
                @click="handleTabChange(item.id)"
              >
                <span class="sidebar-icon">{{ item.icon }}</span>
                <span class="sidebar-label">{{ item.label }}</span>
              </div>
            </div>
          </div>

          <!-- 右侧主内容区 -->
          <div class="content-area">
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
          </div>
        </div>
      </el-main>
      
      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
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
}

/* --- Header 样式 --- */
.header-container {
  height: 60px;
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(10px);
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
  padding: 0;
  min-height: calc(100vh - 120px);
  overflow-x: hidden;
}

.group-content {
  display: flex;
  min-height: calc(100vh - 120px);
}

/* --- 左侧边栏样式 --- */
.sidebar {
  width: 280px;
  min-width: 280px;
  padding: 24px 0;
  border-right: 1px solid rgba(0, 0, 0, 0.06);
}

.theme-light .sidebar {
  background-color: rgba(255, 255, 255, 0.8);
  border-right-color: rgba(0, 0, 0, 0.06);
}

.theme-dark .sidebar {
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
}

.theme-light .sidebar-item:hover {
  background-color: rgba(102, 126, 234, 0.08);
}

.theme-dark .sidebar-item:hover {
  background-color: rgba(102, 126, 234, 0.15);
}

.sidebar-item.active {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.25);
}

.theme-light .sidebar-item.active {
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

.theme-light .sidebar-item.active .sidebar-label {
  color: #667eea;
}

.theme-dark .sidebar-item.active .sidebar-label {
  color: #8fa4f3;
}

/* --- 右侧内容区样式 --- */
.content-area {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
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

/* --- Footer 样式 --- */
.page-footer {
  height: auto;
  padding: 0;
}

/* --- 响应式设计 --- */
@media (max-width: 768px) {
  .group-content {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    min-width: auto;
    border-right: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }
  
  .theme-dark .sidebar {
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
  
  .content-title {
    font-size: 24px;
  }
  
  .placeholder-content {
    min-height: 300px;
    padding: 20px;
  }
}

@media (max-width: 480px) {
  .sidebar-item {
    padding: 10px 12px;
  }
  
  .sidebar-icon {
    font-size: 18px;
    margin-right: 8px;
  }
  
  .sidebar-label {
    font-size: 14px;
  }
  
  .content-title {
    font-size: 20px;
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
</style>