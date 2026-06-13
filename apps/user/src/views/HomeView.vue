<script setup>
import { RouterView, useRouter } from "vue-router";
import MenuComponent from "../components/MenuComponent.vue";
import { useStore } from 'vuex';
import { ElMessage } from 'element-plus';
import api from "../api";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import FeedbackBubble from "../components/Home/FeedbackBubble.vue";
import LivePanel from "../components/Home/LivePanel.vue";
import AttenceRankComponent from "../components/Attendence/AttenceRankComponent.vue";
import UpdateAnnouncement from "../components/Home/UpdateAnnouncement.vue";
import StudyHub from "../components/Home/StudyHub.vue";

import MobileMenuComponent from "../components/MobileMenuComponent.vue";//添加这个竖屏版本的菜单
import { Menu as Expand } from '@element-plus/icons-vue'; // 确保导入了 Rank
import { ref, onMounted, onUnmounted, computed } from 'vue';//添加computed用于主题

const store = useStore();
const router = useRouter();

// 获取主题状态
const isDarkMode = computed(() => store.getters.isDarkMode);

////////新增竖屏检测和组件初始化以及非竖屏销毁//////////////////////////////////////////////////
const isMobile = ref(window.innerWidth <= 768); // 初始检测
const isMobileMenuOpen = ref(false); // 控制移动菜单的显示

// 更新屏幕尺寸状态
const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) {
    isMobileMenuOpen.value = false; // 切换到桌面时关闭移动菜单
  }
};
// 更新屏幕尺寸状态
onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});

// 切换移动菜单
const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

// StudyHub 事件处理
const handleBannerClick = (banner) => {
  console.log('Banner clicked:', banner);
};

const handleEntryClick = (entry) => {
  console.log('Entry clicked:', entry);
};
//////////////////////////////////////////////////////////////////////////////////////////////////

</script>

<template>
  <div :class="['home-container', { 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }]">
    <el-container class="common-layout">
      <el-header class="header-container">
        <!-- 桌面菜单 -->
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <!-- 移动端汉堡图标 -->
        <div v-else class="mobile-header">
          <!-- Logo (保持在左侧) -->
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" />
          </div>
          <!-- 汉堡按钮 (放在右侧) -->
          <el-icon class="hamburger-icon" @click="toggleMobileMenu">
            <Expand />
          </el-icon>
        </div>
      </el-header>
      <!-- 移动端菜单 (条件渲染) -->
      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main class="homeMainContainer">
        <!-- 如果当前路由是学习页面，显示自定义布局 -->
        <div v-if="$route.path === '/home'">
          <!-- 顶部通知公告 -->
          <UpdateAnnouncement />
          
          <!-- 顶部LivePanel -->
          <div class="top-panel-section">
            <LivePanel />
          </div>
          
          <!-- 下方左右分区 -->
          <div class="content-sections">
            <!-- 左侧分区 - 学习中心 -->
            <div class="left-section">
              <StudyHub @banner-click="handleBannerClick" @entry-click="handleEntryClick" />
            </div>
            
            <!-- 右侧分区 - 出勤排行榜 -->
            <div class="right-section">
              <AttenceRankComponent />
            </div>
          </div>
        </div>
        
        <!-- 其他路由使用RouterView -->
        <RouterView v-else />
      </el-main>
      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>

  <!-- 反馈气泡组件 -->
  <FeedbackBubble />
</template>

<style scoped>
/* 主题基础样式 */
.home-container {
  min-height: 100vh;
  transition: all 0.3s ease;
}

.home-container.theme-light {
  background-color: #ffffff;
  color: #333333;
}

.home-container.theme-dark {
  background-color: #1a1a1a;
  color: #ffffff;
}

.header-container {
  display: flex;
  justify-content: center;
  /* 桌面居中 */
  align-items: center;
  /* border-bottom: solid 1px #e6e6e6; */
  padding: 0;
  /* 移除默认内边距 */
  height: 60px;
  /* 固定高度 */
  position: relative;
  /* 为了汉堡图标定位 */
  transition: all 0.3s ease;
}

.theme-light .header-container {
  border-bottom: solid 1px #e6e6e6;
  background-color: #ffffff;
}

.theme-dark .header-container {
  border-bottom: solid 1px #34495e;
  background-color: #2c3e50;
}

.desktop-menu-container {
  display: flex;
  justify-content: center;
  width: 100%;
  height: 100%;
  transition: all 0.3s ease;
}

.mobile-header {
  display: none;
  /* 默认隐藏 */
  width: 100%;
  height: 100%;
  padding: 0 15px;
  /* 左右内边距 */
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  /* Logo 左，图标右 */
  align-items: center;
}

.mobile-logo img {
  cursor: pointer;
}

.hamburger-icon {
  display: none;
  /* 默认隐藏 */
  font-size: 24px;
  /* 图标大小 */
  cursor: pointer;
  /* 图标颜色 */
  transition: color 0.3s ease;
}

.theme-light .hamburger-icon {
  color: #606266;
}

.theme-dark .hamburger-icon {
  color: #ffffff;
}

/* 媒体查询：当屏幕宽度小于等于 768px 时 */
@media (max-width: 768px) {
  .desktop-menu-container {
    display: none;
    /* 隐藏桌面菜单 */
  }

  .mobile-header {
    display: flex;
    /* 显示移动端头部 */
  }

  .hamburger-icon {
    display: block;
    /* 显示汉堡图标 */
  }

  .header-container {
    justify-content: space-between;
    /* 移动端两端对齐 */
    padding: 0 15px;
    /* 移动端内边距 */
  }
}

.common-layout {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.3s ease;
}

.theme-light .common-layout {
  background-color: #ffffff;
}

.theme-dark .common-layout {
  background-color: #1a1a1a;
}.footer {
  font-size: 15px;
  display: flex;
  padding: 10px;
  margin: 0;
  width: 100%;
  transition: all 0.3s ease;
}

.theme-light .footer {
  background-color: #f5f5f5;
  color: #bababa;
}

.theme-dark .footer {
  background-color: #2c2c2c;
  color: #888888;
}

.homeMainContainer {
  /* padding-left: 20px; */
  min-height: 100vh;
  min-width: 0px;
  padding: 20px;
  /* 宽度自适应 */
  /* background-color: rgba(255, 47, 0, 0.898); */
  /* background-color: rgb(255, 255, 255); */

  box-sizing: border-box;
  /*padding 不会撑大容器宽度*/
  overflow-x: hidden; /* 防止横向滚动条 */
  max-width: 100%; /* 100vw 包含滚动条宽度会吃掉右侧 padding */
  transition: all 0.3s ease;
}

.theme-light .homeMainContainer {
  background-color: #f8f9fa;
}

.theme-dark .homeMainContainer {
  background-color: #1a1a1a;
}

/* 新增布局样式 */
.top-panel-section {
  width: 100%;
  margin-bottom: 20px;
}

.content-sections {
  display: flex;
  gap: 20px;
  width: 100%;
  min-height: 400px;
  box-sizing: border-box;
  overflow: visible; /* 允许阴影等效果显示 */
}

.left-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0; /* 允许flex项目收缩到最小尺寸 */
  overflow: visible; /* 允许轮播悬停效果溢出显示 */
}

.right-section {
  width: 300px;
  flex-shrink: 0;
  min-width: 0; /* 允许内容在必要时收缩 */
  overflow: visible; /* 允许阴影等效果显示 */
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .content-sections {
    gap: 16px;
  }
  
  .right-section {
    width: 280px;
  }
  
  .homeMainContainer {
    padding: 16px;
  }
}

@media (max-width: 1024px) {
  .content-sections {
    gap: 16px;
  }
  
  .right-section {
    width: 250px;
  }
  
  .homeMainContainer {
    padding: 12px;
  }
}

@media (max-width: 900px) {
  .content-sections {
    flex-direction: column;
    gap: 20px;
  }
  
  .right-section {
    width: 100%;
  }
  
  .left-section {
    order: 2; /* 移动端时左侧区域放到下方 */
  }
  
  .right-section {
    order: 1; /* 移动端时右侧区域放到上方 */
  }
}

@media (max-width: 768px) {
  .top-panel-section {
    margin-bottom: 16px;
  }
  
  .content-sections {
    gap: 16px;
  }
}
</style>

<style>
.el-header {
  padding: 0 !important;
}

.page-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  padding: 20px;
  width: 100%;
  min-height: 400px;
  margin: 0;
  box-sizing: border-box;
  color: #ffffff;
  transition: all 0.3s ease;
}

/* 主题适配的全局页脚样式 */
.theme-light .page-footer {
  background-color: #252525;
  color: #ffffff;
}

.theme-dark .page-footer {
  background-color: #0f0f0f;
  color: #ffffff;
}
</style>
