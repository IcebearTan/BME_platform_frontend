<script setup>
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useStore } from "vuex";
import { Expand } from "@element-plus/icons-vue";
import MenuComponent from "../components/MenuComponent.vue";
import MobileMenuComponent from "../components/MobileMenuComponent.vue";
import PageFooterComponent from "../components/PageFooterComponent.vue";
import ArticleDetailComponent from "../components/Article/ArticleDetailComponent.vue";

const store = useStore();
const router = useRouter();

// --- 主题管理（根节点挂 theme-dark/light，DewUI 变量才能级联进来） ---
const isDarkMode = computed(() => store.state.isDarkMode);

// --- 响应式 Header 逻辑 ---
const isMobile = ref(window.innerWidth <= 768);
const isMobileMenuOpen = ref(false);

const checkScreenSize = () => {
  isMobile.value = window.innerWidth <= 768;
  if (!isMobile.value) isMobileMenuOpen.value = false;
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener("resize", checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener("resize", checkScreenSize);
});
</script>

<template>
  <div class="article-page" :class="{ 'theme-dark': isDarkMode, 'theme-light': !isDarkMode }">
    <el-container class="common-layout">
      <el-header class="header-container">
        <!-- 桌面菜单 -->
        <div v-if="!isMobile" class="desktop-menu-container">
          <MenuComponent />
        </div>
        <!-- 移动端头部 -->
        <div v-else class="mobile-header">
          <div class="mobile-logo">
            <img style="width: 40px; height: auto;" src="../assets/Logo_NewYear.png" @click="router.push('/')" alt="Logo" />
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

      <el-main style="padding: 0; min-height: 100vh; overflow-x: hidden;">
        <ArticleDetailComponent />
      </el-main>

      <el-footer class="page-footer">
        <PageFooterComponent />
      </el-footer>
    </el-container>
  </div>
</template>

<style scoped>
/* --- 整体页面样式 --- */
.article-page {
  min-height: 100vh;
  transition: all 0.3s ease;
}

.theme-light .article-page {
  background: linear-gradient(135deg, #fafbfc 0%, #f5f7fa 100%);
  color: #333333;
}

.theme-dark .article-page {
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

.common-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
}

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
