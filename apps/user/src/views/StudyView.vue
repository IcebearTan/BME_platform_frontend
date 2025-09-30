<script setup>
import { RouterView, useRouter } from "vue-router";
import MenuComponent from "../components/MenuComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
// StudyComponent 的导入看起来没有在模板中使用，如果确实不需要，可以移除
// import StudyComponent from '../components/StudyComponent.vue'
import PageFooterComponent from "../components/PageFooterComponent.vue";
import { useStore } from 'vuex';
import api from "../api";
import { Expand } from '@element-plus/icons-vue'; // 只导入实际使用的图标
import { ref, onMounted, onUnmounted, computed } from 'vue';

const store = useStore();
const router = useRouter();

// --- 主题管理 ---
const isDarkMode = computed(() => store.state.isDarkMode);

// --- 响应式 Header 逻辑 ---
const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) {
    isMobileMenuOpen.value = false;
  }
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenu.value;
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  // 移除 /study 的登录拦截和用户信息请求，允许未登录访问
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});
// --- 响应式 Header 逻辑结束 ---

// 如果 StudyView 本身有其他特定的 setup 逻辑，可以放在这里
// 例如，如果之前 data() 或 created() 中的逻辑需要在 setup 中实现

</script>

<template>
  <div class="study-page" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
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
      <MobileMenuComponent v-if="isMobile && isMobileMenuOpen" @close="toggleMobileMenu" />

      <el-main style="padding: 0px; min-height: 100vh; overflow-x: hidden;">
        <RouterView />
      </el-main>
      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<style scoped>
/* --- 整体页面样式 --- */
.study-page {
  min-height: 100vh;
  transition: all 0.3s ease;
}

.theme-light .study-page {
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  color: #333333;
}

.theme-dark .study-page {
  background-color: #1a1a1a;
  color: #ffffff;
}

/* --- Header 样式 --- */
.header-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  height: 60px;
  position: relative;
  transition: all 0.3s ease;
}

.theme-light .header-container {
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: solid 1px #e6e6e6;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.theme-dark .header-container {
  background-color: #1a1a1a;
  border-bottom: solid 1px #333333;
}

.desktop-menu-container {
  display: flex;
  justify-content: center;
  width: 100%;
}

.mobile-header {
  display: none;
  width: 100%;
  height: 100%;
  padding: 0 15px;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mobile-logo img {
  cursor: pointer;
}

.hamburger-icon {
  display: none;
  font-size: 24px;
  cursor: pointer;
  transition: color 0.3s ease;
}

.theme-light .hamburger-icon {
  color: #606266;
}

.theme-dark .hamburger-icon {
  color: #cbd5e0;
}

.hamburger-icon:hover {
  transform: scale(1.1);
}

.theme-light .hamburger-icon:hover {
  color: #409eff;
}

.theme-dark .hamburger-icon:hover {
  color: #63b3ed;
}

@media (max-width: 768px) {
  .desktop-menu-container {
    display: none;
  }

  .mobile-header {
    display: flex;
  }

  .hamburger-icon {
    display: block;
  }

  .header-container {
    justify-content: space-between;
    padding: 0 15px;
  }
}

/* --- Header 样式结束 --- */


.common-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}

/* 主要内容区域样式 */
.common-layout :deep(.el-main) {
  transition: background-color 0.3s ease;
}

.theme-light .common-layout :deep(.el-main) {
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
}

.theme-dark .common-layout :deep(.el-main) {
  background-color: #1a1a1a;
}
</style>

<style>
.el-header {
  padding: 0 !important;
}

.page-footer {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 20px 10px;
  width: 100%;
  min-height: 400px;
  color: #ffffff;
  transition: all 0.3s ease;
}

.theme-light .page-footer {
  background-color: #252525;
}

.theme-dark .page-footer {
  background-color: #0f0f0f;
}

/* 滚动条美化 - 主题适配 */
.theme-light ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.theme-light ::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.theme-light ::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.theme-light ::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.theme-dark ::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.theme-dark ::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.theme-dark ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
}

.theme-dark ::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}
</style>
